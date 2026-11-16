export type NormalizedThreadsUrl =
  | {
      kind: "post";
      shortcode: string;
      canonicalUrl: string;
    }
  | {
      kind: "share";
      shareCode: string;
      canonicalUrl: string;
    };

const SHORTCODE = /^[A-Za-z0-9_-]{5,40}$/;

/**
 * Accepts threads.com / threads.net links in the common shapes:
 *   /@user/post/{code}
 *   /@user/post/{code}/{slug}
 *   /t/{code}
 *   /share/{code}
 * Query strings, hashes, and missing protocols are tolerated.
 */
export function normalizeThreadsUrl(raw: string): NormalizedThreadsUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "threads.com" && host !== "threads.net") return null;

  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments[0] === "share" && segments[1]) {
    if (!SHORTCODE.test(segments[1])) return null;
    return {
      kind: "share",
      shareCode: segments[1],
      canonicalUrl: `https://www.threads.com/share/${segments[1]}`,
    };
  }

  let shortcode: string | null = null;

  if (segments[0] === "t" && segments[1]) {
    shortcode = segments[1];
  } else if (
    segments[0]?.startsWith("@") &&
    segments[1] === "post" &&
    segments[2]
  ) {
    shortcode = segments[2];
  }

  if (!shortcode || !SHORTCODE.test(shortcode)) return null;

  return {
    kind: "post",
    shortcode,
    canonicalUrl: `https://www.threads.com/t/${shortcode}`,
  };
}

export function isThreadsPostUrl(raw: string): boolean {
  return normalizeThreadsUrl(raw) !== null;
}
