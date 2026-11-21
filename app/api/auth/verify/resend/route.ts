import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { consumeRateLimit } from "@/lib/server/db";
import {
  VERIFY_USER_LIMIT,
  VERIFY_WINDOW_MS,
  tooManyRequests,
} from "@/lib/server/rate-limit";
import { appBaseUrl, resendVerification } from "@/lib/server/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user?.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = (user?.email ?? String(body.email ?? "")).trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email tidak ditemukan." }, { status: 400 });
  }

  const retryAfter = await consumeRateLimit(
    `verify:user:${user?.id ?? email}`,
    VERIFY_USER_LIMIT,
    VERIFY_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  const result = await resendVerification(email, appBaseUrl(req));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
