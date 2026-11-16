import { NextRequest, NextResponse } from "next/server";
import {
  ScrapeError,
  fetchThreadsPosts,
  resolveShareCode,
  toFetchPostData,
} from "@/lib/scrape";
import type { FetchPostResponse } from "@/lib/types";
import { normalizeThreadsUrl } from "@/lib/url";

export const runtime = "nodejs";
export const maxDuration = 25;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
};

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const normalized = raw ? normalizeThreadsUrl(raw) : null;

  if (!normalized) {
    const body: FetchPostResponse = {
      ok: false,
      code: "INVALID_URL",
      message: "Not a Threads post URL",
    };
    return NextResponse.json(body, { status: 400 });
  }

  try {
    const shortcode =
      normalized.kind === "post"
        ? normalized.shortcode
        : await resolveShareCode(normalized.shareCode);
    const result = await fetchThreadsPosts(shortcode);
    const body: FetchPostResponse = {
      ok: true,
      data: toFetchPostData(result),
    };

    return NextResponse.json(body, { headers: CACHE_HEADERS });
  } catch (error) {
    if (error instanceof ScrapeError) {
      const body: FetchPostResponse = {
        ok: false,
        code: error.code,
        message: error.message,
      };
      return NextResponse.json(body, { status: error.status });
    }

    const body: FetchPostResponse = {
      ok: false,
      code: "UNKNOWN",
      message: "Unexpected error",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
