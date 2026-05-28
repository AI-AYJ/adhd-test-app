function getJaeminaiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing environment variable GEMINI_API_KEY');
  }

  return apiKey;
}

function getJaeminaiHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getJaeminaiApiKey()}`,
  };
}

export async function requestJaeminaiEmbedding(
  input: string,
  model = 'geminai-embedding'
) {
  const embeddingUrl = process.env.GEMINI_EMBEDDING_URL;

  if (!embeddingUrl) {
    throw new Error(
      'Missing environment variable GEMINI_EMBEDDING_URL'
    );
  }

  const res = await fetch(embeddingUrl, {
    method: 'POST',
    headers: getJaeminaiHeaders(),
    body: JSON.stringify({
      model,
      input,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Jaeminai embedding request failed: ${JSON.stringify(data)}`
    );
  }

  const embedding = data?.data?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error(
      `Invalid embedding response: ${JSON.stringify(data)}`
    );
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
  const llmUrl = process.env.JAEMINAI_LLM_URL;

  if (!llmUrl) {
    throw new Error(
      'Missing environment variable JAEMINAI_LLM_URL'
    );
  }

  const {
    prompt,
    model = 'jaeminai-llm',
    temperature = 0.7,
    max_tokens = 1024,
    stop,
    ...rest
  } = options;

  const res = await fetch(llmUrl, {
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
    throw new Error(
      `Jaeminai LLM request failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}