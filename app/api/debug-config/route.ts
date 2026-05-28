import { NextResponse } from "next/server";
import { supabaseUrl } from "@/lib/supabase";

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export async function GET() {
  return NextResponse.json({
    success: true,
    supabaseUrl,
    rawSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? null,
    hasPublishableKey: hasValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    hasServiceRoleKey: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasGeminiApiKey: hasValue(process.env.GEMINI_API_KEY),
    geminiLlmModel: process.env.GEMINI_LLM_MODEL || "gemini-2.5-flash",
    geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  });
}
