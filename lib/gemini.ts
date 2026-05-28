function getGEMINIApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing environment variable GEMINI_API_KEY');
  }

  return apiKey;
}

function isGoogleGeminiUrl(url: string) {
  return url.includes('generativelanguage.googleapis.com');
}

function withGeminiApiKey(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}key=${getGEMINIApiKey()}`;
}

function getGEMINIHeaders(url: string) {
  return {
    'Content-Type': 'application/json',
    ...(isGoogleGeminiUrl(url) ? {} : { Authorization: `Bearer ${getGEMINIApiKey()}` }),
  };
}

export async function requestGEMINIEmbedding(
  input: string,
  model = 'gemini-embedding-001'
) {
  const embeddingUrl = process.env.GEMINI_EMBEDDING_URL;

  if (!embeddingUrl) {
    throw new Error(
      'Missing environment variable GEMINI_EMBEDDING_URL'
    );
  }

  const isGeminiUrl = isGoogleGeminiUrl(embeddingUrl);
  const res = await fetch(isGeminiUrl ? withGeminiApiKey(embeddingUrl) : embeddingUrl, {
    method: 'POST',
    headers: getGEMINIHeaders(embeddingUrl),
    body: JSON.stringify(
      isGeminiUrl
        ? { content: { parts: [{ text: input }] } }
        : {
            model,
            input,
          }
    ),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `GEMINI embedding request failed: ${JSON.stringify(data)}`
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
  const llmUrl = process.env.GEMINI_LLM_URL;

  if (!llmUrl) {
    throw new Error(
      'Missing environment variable GEMINI_LLM_URL'
    );
  }

  const {
    prompt,
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    max_tokens = 1024,
    stop,
    ...rest
  } = options;

  const isGeminiUrl = isGoogleGeminiUrl(llmUrl);
  const res = await fetch(isGeminiUrl ? withGeminiApiKey(llmUrl) : llmUrl, {
    method: 'POST',
    headers: getGEMINIHeaders(llmUrl),
    body: JSON.stringify(
      isGeminiUrl
        ? {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: max_tokens,
            },
            ...rest,
          }
        : {
            model,
            prompt,
            temperature,
            max_tokens,
            stop,
            ...rest,
          }
    ),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `GEMINI LLM request failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}
