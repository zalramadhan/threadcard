import { NextResponse } from "next/server";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_IP_LIMIT = 30;
export const LOGIN_EMAIL_LIMIT = 8;
export const REGISTER_WINDOW_MS = 60 * 60 * 1000;
export const REGISTER_IP_LIMIT = 10;
export const ORDER_WINDOW_MS = 60 * 60 * 1000;
export const ORDER_USER_LIMIT = 10;
export const VERIFY_WINDOW_MS = 60 * 60 * 1000;
export const VERIFY_USER_LIMIT = 5;
export const FETCH_WINDOW_MS = 10 * 60 * 1000;
export const FETCH_USER_LIMIT = 60;

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: "Terlalu banyak percobaan. Coba lagi nanti." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}
