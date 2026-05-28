import { createClient } from "@supabase/supabase-js";

function getSupabaseProjectUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!rawUrl) {
    throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_URL");
  }

  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.origin;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL");
  }
}

function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error("Missing environment variable SUPABASE_SERVICE_ROLE_KEY");
  }

  return serviceRoleKey;
}

export const supabaseUrl = getSupabaseProjectUrl();

export const supabase = createClient(supabaseUrl, getSupabaseServiceRoleKey());
