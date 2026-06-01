import { NextResponse } from "next/server";
import { requestGEMINIEmbedding } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

type RagDocumentRequest = {
  category?: unknown;
  title?: unknown;
  content?: unknown;
  source?: unknown;
  keywords?: unknown;
  metadata?: unknown;
  pdf_path?: unknown;
  page_start?: unknown;
  page_end?: unknown;
  section?: unknown;
  chunk_index?: unknown;
};

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toRequiredString(value: unknown, fieldName: string) {
  const normalized = toStringOrNull(value);
  if (!normalized) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return normalized;
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringArrayOrNull(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const values = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return values.length ? values : null;
}

function toJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RagDocumentRequest;
    const content = toRequiredString(body.content, "content");
    const title = toRequiredString(body.title, "title");
    const category = toStringOrNull(body.category) ?? "paper";
    const embedding = await requestGEMINIEmbedding(content);

    const { data, error } = await supabase
      .from("rag_documents")
      .insert({
        category,
        title,
        content,
        source: toStringOrNull(body.source),
        keywords: toStringArrayOrNull(body.keywords),
        metadata: toJsonObject(body.metadata),
        pdf_path: toStringOrNull(body.pdf_path),
        page_start: toNumberOrNull(body.page_start),
        page_end: toNumberOrNull(body.page_end),
        section: toStringOrNull(body.section),
        chunk_index: toNumberOrNull(body.chunk_index) ?? 0,
        embedding,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
