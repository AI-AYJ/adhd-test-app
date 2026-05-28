import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requestGEMINIEmbedding } from '@/lib/gemini';

export async function POST(req: Request) {
  const body = await req.json();
  const input = body.input || body.text;
  const model = body.model || 'gemini-embedding-001';

  if (!input || typeof input !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing input text' }, { status: 400 });
  }

  try {
    const embedding = await requestGEMINIEmbedding(input, model);

    if (body.store === true || body.content) {
      const { data, error } = await supabase.from('documents').insert({
        content: body.content ?? input,
        metadata: body.metadata ?? null,
        embedding,
      });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, embedding, document: data?.[0] ?? null });
    }

    return NextResponse.json({ success: true, embedding });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
