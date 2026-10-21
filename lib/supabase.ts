import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  ? getSupabaseProjectUrl()
  : null;

let client: SupabaseClient | undefined;

function getSupabaseClient() {
  client ??= createClient(getSupabaseProjectUrl(), getSupabaseServiceRoleKey());
  return client;
}

// Legacy routes import this module during builds even when DB features are not
// used. Resolve the client only when a route actually accesses a DB method.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const resolved = getSupabaseClient();
    const value = Reflect.get(resolved, property, resolved);
    return typeof value === "function" ? value.bind(resolved) : value;
  },
});
