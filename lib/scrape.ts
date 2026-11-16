import type {
  ErrorCode,
  FetchPostData,
  PostMedia,
  ThreadsPost,
} from "./types";
import { normalizeThreadsUrl } from "./url";

type RawRecord = Record<string, unknown>;

interface ParsedPost {
  post: ThreadsPost;
  pk: string;
  replyTo: string | null;
  rootAuthor: string | null;
  takenAt: number;
  index: number;
}

interface ScrapeResult {
  posts: ThreadsPost[];
  source: "scrape" | "og";
}

export class ScrapeError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, status = 502) {
    super(code);
    this.name = "ScrapeError";
    this.code = code;
    this.status = status;
  }
}

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const THREADS_HEADERS = {
  "user-agent": GOOGLEBOT_UA,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expires: number; result: ScrapeResult }>();

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(value: unknown): boolean {
  return value === true;
}

function record(value: unknown): RawRecord {
  return isRecord(value) ? value : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(
        isHex ? entity.slice(2) : entity.slice(1),
        isHex ? 16 : 10,
      );
      if (Number.isFinite(codePoint)) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      return match;
    }

    return named[entity.toLowerCase()] ?? match;
  });
}

function getAttribute(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*["']([^"']*)["']`,
    "i",
  ).exec(tag);
  return match ? decodeHtml(match[1]) : null;
}

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  canonical: string | null;
  url: string | null;
}

function extractOg(html: string): OgData {
  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;
  let url: string | null = null;

  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = (
      getAttribute(tag, "property") ??
      getAttribute(tag, "name") ??
      ""
    ).toLowerCase();
    const content = getAttribute(tag, "content");

    if (!content) continue;
    if (key === "og:title" && !title) title = content;
    if (key === "og:description" && !description) description = content;
    if (key === "og:image" && !image) image = content;
    if (key === "og:url" && !url) url = content;
  }

  if (!title) {
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleTag) title = decodeHtml(titleTag[1].trim());
  }

  const canonicalTag =
    /<link\b[^>]*rel=["']canonical["'][^>]*>/i.exec(html) ??
    /<link\b[^>]*href=["'][^"']+["'][^>]*rel=["']canonical["'][^>]*>/i.exec(
      html,
    );
  const canonical = canonicalTag ? getAttribute(canonicalTag[0], "href") : null;

  return { title, description, image, canonical, url };
}

function pickImageUrl(media: RawRecord): {
  url: string;
  width?: number;
  height?: number;
} | null {
  const candidates = array(record(media.image_versions2).candidates)
    .map((candidate) => record(candidate))
    .map((candidate) => ({
      url: str(candidate.url),
      width: num(candidate.width) ?? 0,
      height: num(candidate.height) ?? 0,
    }))
    .filter(
      (candidate): candidate is { url: string; width: number; height: number } =>
        Boolean(candidate.url),
    );

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.width * b.height - a.width * a.height);
  const best = candidates[0];

  return {
    url: best.url,
    width: best.width || undefined,
    height: best.height || undefined,
  };
}

function extractMedia(media: RawRecord): PostMedia[] {
  const carousel = array(media.carousel_media);
  const result: PostMedia[] = [];
  const seen = new Set<string>();

  const push = (item: RawRecord, fallbackType: "image" | "video") => {
    const image = pickImageUrl(item);
    if (!image || seen.has(image.url)) return;

    seen.add(image.url);
    result.push({
      type: num(item.media_type) === 2 ? "video" : fallbackType,
      url: image.url,
      width: image.width,
      height: image.height,
      alt: str(item.accessibility_caption) ?? undefined,
    });
  };

  if (carousel.length > 0) {
    for (const item of carousel) {
      if (!isRecord(item)) continue;
      push(item, "image");
    }
  } else {
    push(media, "image");
  }

  return result.slice(0, 8);
}

function extractText(media: RawRecord): string {
  const caption = record(media.caption);
  const captionText = str(caption.text);
  if (captionText) return captionText;

  const info = record(media.text_post_app_info);
  const fragments = array(record(info.text_fragments).fragments);
  const joined = fragments
    .map((fragment) => str(record(fragment).plaintext) ?? "")
    .join("")
    .trim();

  return joined;
}

function toPost(raw: RawRecord, index: number): ParsedPost | null {
  const code = str(raw.code);
  if (!code) return null;

  const user = record(raw.user);
  const info = record(raw.text_post_app_info);
  const username = str(user.username);
  if (!username) return null;

  const takenAt = num(raw.taken_at) ?? 0;
  const displayName = str(user.full_name) ?? username;
  const captionText = extractText(raw);

  return {
    post: {
      shortcode: code,
      url: str(raw.permalink) ?? `https://www.threads.com/t/${code}`,
      author: {
        username,
        displayName,
        avatarUrl: str(user.profile_pic_url),
        verified: bool(user.is_verified),
      },
      text: captionText,
      createdAt:
        takenAt > 0 ? new Date(takenAt * 1000).toISOString() : null,
      counts: {
        likes: num(raw.like_count),
        replies: num(info.direct_reply_count),
        reposts: num(info.repost_count),
        shares: num(info.reshare_count) ?? num(info.quote_count),
      },
      media: extractMedia(raw),
      isReply: bool(info.is_reply),
    },
    pk: String(raw.pk ?? raw.id ?? code),
    replyTo: str(record(info.reply_to_author).username),
    rootAuthor: str(record(info.root_post_author).username),
    takenAt,
    index,
  };
}

function collectRawPosts(html: string): RawRecord[] {
  const scripts =
    html.match(/<script\b[^>]*\bdata-sjs\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const found: RawRecord[] = [];
  const seenPk = new Set<string>();
  let index = 0;

  for (const scriptTag of scripts) {
    const content = /^[\s\S]*?>([\s\S]*)<\/script>$/i.exec(scriptTag)?.[1];
    if (!content) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      continue;
    }

    const walk = (value: unknown, depth: number) => {
      if (depth > 60 || value === null || typeof value !== "object") return;

      if (Array.isArray(value)) {
        for (const item of value) walk(item, depth + 1);
        return;
      }

      const candidate = value as RawRecord;
      if (
        typeof candidate.like_count === "number" &&
        typeof candidate.code === "string" &&
        (isRecord(candidate.caption) || isRecord(candidate.text_post_app_info))
      ) {
        const key = String(candidate.pk ?? candidate.id ?? candidate.code);
        if (!seenPk.has(key)) {
          seenPk.add(key);
          found.push(candidate);
        }
      }

      for (const child of Object.values(candidate)) {
        walk(child, depth + 1);
      }
    };

    walk(parsed, 0);
    index += 1;
  }

  if (index === 0) return [];
  return found;
}

function buildThread(rawPosts: RawRecord[], shortcode: string): ParsedPost[] {
  const parsed = rawPosts
    .map((raw, index) => toPost(raw, index))
    .filter((post): post is ParsedPost => post !== null);

  const target = parsed.find((post) => post.post.shortcode === shortcode);
  if (!target) return [];

  const author = target.post.author.username.toLowerCase();
  const sameAuthor = parsed.filter(
    (post) => post.post.author.username.toLowerCase() === author,
  );

  const inThread = sameAuthor.filter((post) => {
    if (post.post.shortcode === shortcode) return true;
    if (post.replyTo?.toLowerCase() === author) return true;
    if (
      post.replyTo === null &&
      (post.rootAuthor === null || post.rootAuthor.toLowerCase() === author)
    ) {
      return true;
    }
    return false;
  });

  const unique = new Map<string, ParsedPost>();
  for (const post of inThread) unique.set(post.pk, post);

  const ordered = [...unique.values()].sort((a, b) => {
    if (a.takenAt !== b.takenAt) return a.takenAt - b.takenAt;
    return a.index - b.index;
  });

  const limited = ordered.slice(0, 10);

  if (!limited.some((post) => post.post.shortcode === shortcode)) {
    return [target];
  }

  return limited;
}

function ogPost(shortcode: string, og: OgData): ThreadsPost | null {
  const title = og.title?.trim().toLowerCase() ?? "";
  const genericTitle =
    !title || /^threads(?:\s*[•|-]\s*log in)?$/.test(title);
  const genericDescription = /join threads to share ideas/i.test(
    og.description ?? "",
  );
  if ((genericTitle || genericDescription) && !og.image) return null;

  let displayName = genericTitle ? "" : (og.title ?? "");
  let username = "";
  const titleMatch = /^(.*?)\s*\(@([^)]+)\)\s*(?:on\s*Threads)?$/i.exec(
    displayName,
  );

  if (titleMatch) {
    displayName = titleMatch[1].trim();
    username = titleMatch[2].trim();
  }

  if (!username && og.canonical) {
    username = /@([^/]+)/.exec(og.canonical)?.[1] ?? "";
  }

  if (!username) username = "threads.user";
  if (!displayName) displayName = username;

  const media: PostMedia[] = [];
  if (og.image) {
    media.push({ type: "image", url: og.image });
  }

  return {
    shortcode,
    url: og.canonical ?? `https://www.threads.com/t/${shortcode}`,
    author: {
      username,
      displayName,
      avatarUrl: null,
      verified: false,
    },
    text: og.description ?? "",
    createdAt: null,
    counts: { likes: null, replies: null, reposts: null, shares: null },
    media,
    isReply: false,
  };
}

function threadsHost(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return host === "threads.com" || host === "threads.net";
}

/**
 * Threads share links (threads.com/share/{code}) redirect to the canonical
 * post URL. Follow only the redirect chain on Threads hosts; the final post
 * URL is then handled by the normal scraper.
 */
export async function resolveShareCode(shareCode: string): Promise<string> {
  let current = new URL(`https://www.threads.com/share/${shareCode}`);
  const maxRedirects = 5;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const normalized = normalizeThreadsUrl(current.toString());
    if (normalized?.kind === "post") return normalized.shortcode;

    let response: Response;
    try {
      response = await fetch(current, {
        headers: THREADS_HEADERS,
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new ScrapeError("UPSTREAM_TIMEOUT", 504);
      }
      throw new ScrapeError("UPSTREAM_CHANGED", 502);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;

      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        break;
      }

      if (!threadsHost(next)) {
        throw new ScrapeError("PRIVATE_OR_BLOCKED", 403);
      }

      if (/^\/(?:accounts\/)?login(?:\/|$)/.test(next.pathname)) {
        throw new ScrapeError("PRIVATE_OR_BLOCKED", 403);
      }

      current = next;
      continue;
    }

    if (response.status === 404) throw new ScrapeError("NOT_FOUND", 404);
    if (response.status === 429) throw new ScrapeError("RATE_LIMITED", 429);
    if (response.status === 403) {
      throw new ScrapeError("PRIVATE_OR_BLOCKED", 403);
    }
    if (!response.ok) throw new ScrapeError("UPSTREAM_CHANGED", 502);

    // Some share links answer 200 with the post metadata inline instead of a
    // redirect. Use the canonical URL when present.
    const html = await response.text();
    const og = extractOg(html);
    const target = normalizeThreadsUrl(og.canonical ?? og.url ?? "");
    if (target?.kind === "post") return target.shortcode;
    if (target?.kind === "share" && target.shareCode !== shareCode) {
      current = new URL(target.canonicalUrl);
      continue;
    }

    if (/log in/i.test(og.title ?? "")) {
      throw new ScrapeError("PRIVATE_OR_BLOCKED", 403);
    }

    throw new ScrapeError("NOT_FOUND", 404);
  }

  throw new ScrapeError("NOT_FOUND", 404);
}

export async function fetchThreadsPosts(
  shortcode: string,
): Promise<ScrapeResult> {
  const cached = cache.get(shortcode);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  let response: Response;
  try {
    response = await fetch(`https://www.threads.com/t/${shortcode}`, {
      headers: THREADS_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new ScrapeError("UPSTREAM_TIMEOUT", 504);
    }
    throw new ScrapeError("UPSTREAM_CHANGED", 502);
  }

  if (response.status === 404) throw new ScrapeError("NOT_FOUND", 404);
  if (response.status === 429) throw new ScrapeError("RATE_LIMITED", 429);
  if (response.status === 403) {
    throw new ScrapeError("PRIVATE_OR_BLOCKED", 403);
  }
  if (!response.ok) throw new ScrapeError("UPSTREAM_CHANGED", 502);

  const html = await response.text();
  const og = extractOg(html);
  const rawPosts = collectRawPosts(html);
  const thread = buildThread(rawPosts, shortcode);

  if (thread.length > 0) {
    const result: ScrapeResult = {
      posts: thread.map((post) => post.post),
      source: "scrape",
    };
    cache.set(shortcode, { expires: Date.now() + CACHE_TTL_MS, result });
    return result;
  }

  const fallback = ogPost(shortcode, og);
  if (fallback) {
    const result: ScrapeResult = { posts: [fallback], source: "og" };
    cache.set(shortcode, { expires: Date.now() + CACHE_TTL_MS, result });
    return result;
  }

  if (/page not found|isn['’]t available|no longer available/i.test(html)) {
    throw new ScrapeError("NOT_FOUND", 404);
  }

  if (
    /log in or sign up|log in to see/i.test(html) ||
    /log in/i.test(og.title ?? "")
  ) {
    throw new ScrapeError("PRIVATE_OR_BLOCKED", 403);
  }

  // Deleted posts redirect to a generic shell. It has a "Threads" title and
  // no post metadata, unlike a live post that always exposes Open Graph data.
  if (
    !og.title ||
    /^threads$/i.test(og.title.trim()) ||
    (!og.description && !og.image && !og.canonical)
  ) {
    throw new ScrapeError("NOT_FOUND", 404);
  }

  // A small shell without post metadata means the post is unavailable, not
  // that Meta changed the payload shape.
  if (html.length < 200_000) {
    throw new ScrapeError("NOT_FOUND", 404);
  }

  throw new ScrapeError("UPSTREAM_CHANGED", 502);
}

export function toFetchPostData(result: ScrapeResult): FetchPostData {
  return {
    posts: result.posts,
    source: result.source,
    fetchedAt: new Date().toISOString(),
  };
}
