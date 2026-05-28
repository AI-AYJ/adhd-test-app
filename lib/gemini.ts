const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
const DEFAULT_GEMINI_LLM_MODEL = 'gemini-2.5-flash';

function getGEMINIApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Missing environment variable GEMINI_API_KEY');
  }

  return apiKey;
}

function normalizeGeminiModel(model: string, fallback: string) {
  const trimmed = model.trim();

  try {
    const parsedUrl = new URL(trimmed);
    const match = parsedUrl.pathname.match(/\/models\/([^/:]+)/);
    return match?.[1] || fallback;
  } catch {
    const modelPathMatch = trimmed.match(/(?:^|\/)models\/([^/:?]+)/);
    if (modelPathMatch?.[1]) {
      return modelPathMatch[1];
    }

    const maybeModel = trimmed.split(/[/:?]/).filter(Boolean).at(-1);
    return maybeModel || fallback;
  }
}

function buildGoogleGeminiUrl(
  model: string,
  fallbackModel: string,
  action: 'embedContent' | 'generateContent'
) {
  const safeModel = normalizeGeminiModel(model, fallbackModel);
  const parsedUrl = new URL(`${GEMINI_API_BASE_URL}/models/${safeModel}:${action}`);
  parsedUrl.searchParams.set('key', getGEMINIApiKey());
  return parsedUrl.toString();
}

function redactGeminiUrl(url: string) {
  const parsedUrl = new URL(url);
  if (parsedUrl.searchParams.has('key')) {
    parsedUrl.searchParams.set('key', 'REDACTED');
  }
  return parsedUrl.toString();
}

function getGEMINIHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

export async function requestGEMINIEmbedding(
  input: string,
  model = process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_GEMINI_EMBEDDING_MODEL
) {
  const requestUrl = buildGoogleGeminiUrl(model, DEFAULT_GEMINI_EMBEDDING_MODEL, 'embedContent');
  const res = await fetch(requestUrl, {
    method: 'POST',
    headers: getGEMINIHeaders(),
    body: JSON.stringify({ content: { parts: [{ text: input }] } }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `GEMINI embedding request failed (${res.status}) at ${redactGeminiUrl(requestUrl)}: ${JSON.stringify(data)}`
    );
  }

  const embedding = data?.embedding?.values ?? data?.data?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error(
      `Invalid embedding response: ${JSON.stringify(data)}`
    );
  }

  return embedding as number[];
}

export async function requestGEMINILLM(options: {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  [key: string]: any;
}) {
  const {
    prompt,
    model = process.env.GEMINI_LLM_MODEL || DEFAULT_GEMINI_LLM_MODEL,
    temperature = 0.7,
    max_tokens = 1024,
    topK,
    topP,
    ...rest
  } = options;

  const requestUrl = buildGoogleGeminiUrl(model, DEFAULT_GEMINI_LLM_MODEL, 'generateContent');
  const res = await fetch(requestUrl, {
    method: 'POST',
    headers: getGEMINIHeaders(),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        ...(typeof topK === 'number' ? { topK } : {}),
        ...(typeof topP === 'number' ? { topP } : {}),
        maxOutputTokens: max_tokens,
      },
      ...rest,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `GEMINI LLM request failed (${res.status}) at ${redactGeminiUrl(requestUrl)}: ${JSON.stringify(data)}`
    );
  }

  return data;
}
