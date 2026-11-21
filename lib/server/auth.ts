import type { PublicUser } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "./db";

export { adminEmails } from "./config";

/**
 * Reads the Supabase session from cookies and returns the app profile.
 * Suspended accounts are treated as signed out.
 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return ensureProfile(user);
}

export async function destroyCurrentSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
