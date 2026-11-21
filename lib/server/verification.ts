import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/admin";

export function appBaseUrl(request: Request) {
  const configured = (process.env.APP_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

/** Asks Supabase Auth to send another signup confirmation link. */
export async function resendVerification(email: string, baseUrl: string) {
  if (!supabaseUrl() || !supabaseAnonKey()) {
    return { ok: false, error: "Email service is not configured yet." } as const;
  }

  const client = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${baseUrl.replace(/\/+$/, "")}/auth/confirm` },
  });

  if (error) {
    console.error("[verification/resend]", error.message);
    return { ok: false, error: "Email could not be sent." } as const;
  }
  return { ok: true } as const;
}
