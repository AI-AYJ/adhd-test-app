export const JAEMINAI_API_KEY = process.env.JAEMINAI_API_KEY;
export const JAEMINAI_EMBEDDING_URL = process.env.JAEMINAI_EMBEDDING_URL;
export const JAEMINAI_LLM_URL = process.env.JAEMINAI_LLM_URL;

if (!JAEMINAI_API_KEY) {
  throw new Error('Missing environment variable JAEMINAI_API_KEY');
}

function getJaeminaiHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${JAEMINAI_API_KEY}`,
  };
}

export async function requestJaeminaiEmbedding(input: string, model = 'jaeminai-embedding') {
  if (!JAEMINAI_EMBEDDING_URL) {
    throw new Error('Missing environment variable JAEMINAI_EMBEDDING_URL');
  }

  const res = await fetch(JAEMINAI_EMBEDDING_URL, {
    method: 'POST',
    headers: getJaeminaiHeaders(),
    body: JSON.stringify({
      model,
      input,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Jaeminai embedding request failed: ${JSON.stringify(data)}`);
  }

  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error(`Invalid embedding response: ${JSON.stringify(data)}`);
  }

  return embedding as number[];
}

export async function requestJaeminaiLLM(options: {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  [key: string]: any;
}) {
  if (!JAEMINAI_LLM_URL) {
    throw new Error('Missing environment variable JAEMINAI_LLM_URL');
  }

  const { prompt, model = 'jaeminai-llm', temperature = 0.7, max_tokens = 1024, stop, ...rest } = options;

  const res = await fetch(JAEMINAI_LLM_URL, {
    method: 'POST',
    headers: getJaeminaiHeaders(),
    body: JSON.stringify({
      model,
      prompt,
      temperature,
      max_tokens,
      stop,
      ...rest,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Jaeminai LLM request failed: ${JSON.stringify(data)}`);
  }

  return data;
}
