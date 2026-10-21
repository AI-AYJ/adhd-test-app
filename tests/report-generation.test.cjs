const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const reportHtml = '<p>생성된 리포트 테스트 내용입니다.</p>';
const input = { inattention_count: 2, cpt_attention: 8, cpt_timeliness: 420 };

function loadTs(relativePath, mocks = {}, env = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    exports: module.exports, module,
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name]();
      if (name.startsWith('@/')) return loadTs(`${name.slice(2)}.ts`, mocks, env);
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: { env }, crypto: require('node:crypto').webcrypto,
    console: { error() {}, warn() {} },
  }, { filename: relativePath });
  return module.exports;
}

function createRoute({ database = false, importFails = false, save = 'error', referencesFail = false, llm = reportHtml } = {}) {
  const calls = { dbImports: 0, inserts: 0, embeddings: 0 };
  const client = {
    async rpc() { return { data: [], error: null }; },
    from() {
      calls.inserts++;
      return { insert(payload) { return { select() { return { async single() {
        if (save === 'throw') throw new TypeError('fetch failed');
        if (save === 'error') return { data: null, error: { message: 'TypeError: fetch failed' } };
        return { data: { ...payload, id: 'saved-id' }, error: null };
      } }; } }; } };
    },
  };
  const route = loadTs('app/api/generate-report/route.ts', {
    'next/server': () => ({ NextResponse: { json: (body, init) => Response.json(body, init) } }),
    '@/lib/gemini': () => ({
      async requestGEMINILLM() { return { text: llm }; },
      async requestGEMINIEmbedding() {
        calls.embeddings++;
        if (referencesFail) throw new Error('Embedding unavailable');
        return [0.1, 0.2];
      },
    }),
    '@/lib/prompts/adhdReportSystemPrompt': () => ({ ADHD_REPORT_SYSTEM_PROMPT: 'test' }),
    '@/lib/supabase': () => {
      calls.dbImports++;
      if (importFails) throw new Error('Missing Supabase environment variables');
      return { supabase: client };
    },
  }, database ? { REPORT_DATABASE_ENABLED: 'true' } : {});
  return { route, calls };
}

async function generate(options) {
  const { route, calls } = createRoute(options);
  const response = await route.POST(new Request('http://localhost/api/generate-report', {
    method: 'POST', body: JSON.stringify(input),
  }));
  return { response, body: await response.json(), calls };
}

test('DB is disabled by default: return report and metrics without Supabase or embeddings', async () => {
  const { response, body, calls } = await generate();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.saved, false);
  assert.equal(body.data.report, reportHtml);
  assert.equal(body.data.cpt_timeliness, 420);
  assert.match(body.id, /^local-/);
  assert.equal(body.data.id, body.id);
  assert.equal(calls.dbImports, 0);
  assert.equal(calls.embeddings, 0);
  assert.equal(calls.inserts, 0);
});

for (const save of ['error', 'throw']) {
  test(`DB save ${save} still returns a successful generated report`, async () => {
    const { response, body } = await generate({ database: true, save });
    assert.equal(response.status, 200);
    assert.equal(body.saved, false);
    assert.equal(body.data.report, reportHtml);
  });
}

test('missing DB configuration does not stop report generation', async () => {
  const { response, body } = await generate({ database: true, importFails: true });
  assert.equal(response.status, 200);
  assert.equal(body.data.report, reportHtml);
});

test('embedding/reference failure does not stop report generation', async () => {
  const { response, body } = await generate({ database: true, referencesFail: true });
  assert.equal(response.status, 200);
  assert.equal(body.data.report, reportHtml);
});

test('successful DB save returns saved report and ID', async () => {
  const { body } = await generate({ database: true, save: 'success' });
  assert.equal(body.success, true);
  assert.equal(body.saved, true);
  assert.equal(body.id, 'saved-id');
  assert.equal(body.data.report, reportHtml);
});

test('empty LLM result remains a generation failure', async () => {
  const { response, body } = await generate({ llm: '' });
  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.equal(body.stage, 'generate-report');
});

// Run the real browser handler in isolation with browser dependencies mocked.
function createBrowser({ storageFails = false, success = true } = {}) {
  const source = fs.readFileSync(path.join(root, 'public/script.js'), 'utf8');
  const start = source.indexOf('async function generateReportFromCptResult()');
  const end = source.indexOf('        addReportGenerationButton =', start);
  const cache = new Map();
  const button = { disabled: false, textContent: '', parentElement: { appendChild() {} } };
  const elements = [];
  const alerts = [];
  const window = { location: { href: '' } };
  const context = {
    window, console: { error() {}, warn() {} },
    buildCptReportPayload: () => input,
    fetch: async () => ({ ok: success, json: async () => success
      ? { success: true, saved: false, data: { id: 'local-test', report: reportHtml } }
      : { success: false, stage: 'generate-report', error: 'LLM unavailable' } }),
    sessionStorage: { setItem(key, value) {
      if (storageFails) throw new Error('Storage blocked');
      cache.set(key, value);
    } },
    alert: (message) => alerts.push(message),
    DOMParser: class { parseFromString() { return { body: { textContent: '생성된 리포트 테스트 내용입니다.' } }; } },
    document: {
      getElementById: (id) => id === 'generateReportBtn' ? button : null,
      createElement(tag) {
        const element = { tag, style: {}, replaceChildren(...children) { this.children = children; }, scrollIntoView() {} };
        elements.push(element);
        return element;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(start, end)}; this.generate = generateReportFromCptResult;`, context);
  return { context, window, cache, button, elements, alerts };
}

test('browser caches the full report and opens the detail page even when saved=false', async () => {
  const browser = createBrowser();
  await browser.context.generate();
  assert.equal(browser.window.location.href, '/report/local-test');
  assert.equal(JSON.parse(browser.cache.get('fast-report:local-test')).report, reportHtml);
  assert.equal(browser.alerts.length, 0);
});

test('blocked browser storage displays generated report inline', async () => {
  const browser = createBrowser({ storageFails: true });
  await browser.context.generate();
  assert.equal(browser.window.location.href, '');
  assert.equal(browser.elements.find((e) => e.tag === 'div').textContent, '생성된 리포트 테스트 내용입니다.');
  assert.equal(browser.button.disabled, false);
  assert.equal(browser.alerts.length, 0);
});

test('generation failures re-enable the button and do not navigate', async () => {
  const browser = createBrowser({ success: false });
  await browser.context.generate();
  assert.equal(browser.window.location.href, '');
  assert.equal(browser.button.disabled, false);
  assert.match(browser.alerts[0], /리포트 생성 중 오류/);
});
