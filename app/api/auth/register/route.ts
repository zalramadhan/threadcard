import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/server/db";
import {
  REGISTER_IP_LIMIT,
  REGISTER_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";
import { consumeRateLimit } from "@/lib/server/db";
import { appBaseUrl } from "@/lib/server/verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const retryAfter = await consumeRateLimit(
    `register:ip:${clientIp(req)}`,
    REGISTER_IP_LIMIT,
    REGISTER_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim().slice(0, 80);
    const whatsapp = String(body.whatsapp ?? "").trim().slice(0, 40);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 200) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter." },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, whatsapp },
        emailRedirectTo: `${appBaseUrl(req)}/auth/confirm`,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already registered") || message.includes("already been registered")) {
        return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
      }
      if (error.status === 429 || message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Terlalu banyak email dikirim. Coba lagi nanti." },
          { status: 429 },
        );
      }
      console.error("[auth/register]", error.message);
      return NextResponse.json(
        { error: error.message || "Gagal membuat akun." },
        { status: 400 },
      );
    }

    if (!data.user) {
      return NextResponse.json({ error: "Gagal membuat akun." }, { status: 500 });
    }
    // Supabase returns an obfuscated user with no identities when the email is
    // already registered and confirmations are enabled.
    if (data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const user = await ensureProfile(data.user);
    return NextResponse.json(
      {
        user,
        pendingVerification: !data.session,
        verificationSent: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Gagal membuat akun." }, { status: 500 });
  }
}
