import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
}

export function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

export function supabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function supabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey() && supabaseServiceKey());
}

let cached: SupabaseClient | null = null;

/** Service-role client. Only import this from server code. */
export function createAdminClient() {
  if (!supabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(supabaseUrl(), supabaseServiceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}
