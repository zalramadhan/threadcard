import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_HOSTS = [
  /(^|\.)cdninstagram\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)threads\.com$/i,
  /(^|\.)threads\.net$/i,
];

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
};

function isAllowed(target: URL): boolean {
  return ALLOWED_HOSTS.some((pattern) => pattern.test(target.hostname));
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return new NextResponse(null, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return new NextResponse(null, { status: 400 });
  }

  if (target.username || target.password) {
    return new NextResponse(null, { status: 400 });
  }

  if (!isAllowed(target)) {
    return new NextResponse(null, { status: 403 });
  }

  let upstream: Response | null = null;
  let current = target;

  try {
    for (let hop = 0; hop < 4; hop += 1) {
      upstream = await fetch(current, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          referer: "https://www.threads.com/",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });

      if (upstream.status < 300 || upstream.status >= 400) break;

      const location = upstream.headers.get("location");
      if (!location) break;

      const next = new URL(location, current);
      if (next.protocol !== "https:" || !isAllowed(next)) {
        return new NextResponse(null, { status: 403 });
      }
      current = next;
    }
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  if (!upstream) return new NextResponse(null, { status: 502 });

  if (!upstream.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return new NextResponse(null, { status: 502 });
  }

  const contentLength = Number(upstream.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BYTES) {
    return new NextResponse(null, { status: 502 });
  }

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return new NextResponse(null, { status: 502 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      ...CACHE_HEADERS,
    },
  });
}
