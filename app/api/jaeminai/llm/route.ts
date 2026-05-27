import { NextResponse } from 'next/server';
import { requestJaeminaiLLM } from '@/lib/jaeminai';

export async function POST(req: Request) {
  const body = await req.json();
  const prompt = body.prompt || body.question || body.input;
  const model = body.model || 'jaeminai-llm';
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const maxTokens = typeof body.max_tokens === 'number' ? body.max_tokens : 1024;
  const stop = Array.isArray(body.stop) ? body.stop : undefined;

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing prompt or question' }, { status: 400 });
  }

  try {
    const result = await requestJaeminaiLLM({
      prompt,
      model,
      temperature,
      max_tokens: maxTokens,
      stop,
      ...(body.options ?? {}),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
