import { NextResponse } from "next/server";
import { clearRateLimit, consumeRateLimit, ensureProfile } from "@/lib/server/db";
import {
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  LOGIN_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const ipKey = `login:ip:${clientIp(req)}`;
    const emailKey = email ? `login:email:${email}` : null;

    const blocked = Math.max(
      await consumeRateLimit(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS),
      emailKey
        ? await consumeRateLimit(emailKey, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS)
        : 0,
    );
    if (blocked) return tooManyRequests(blocked);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (error.code === "email_not_confirmed" || message.includes("email not confirmed")) {
        return NextResponse.json(
          {
            error:
              "Email belum dikonfirmasi. Buka tautan verifikasi di kotak masuk, lalu masuk lagi.",
            code: "email_not_confirmed",
          },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    await clearRateLimit(ipKey);
    if (emailKey) await clearRateLimit(emailKey);

    const user = data.user ? await ensureProfile(data.user) : null;
    if (!user) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Akun ini sedang dinonaktifkan." },
        { status: 403 },
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Gagal masuk." }, { status: 500 });
  }
}
