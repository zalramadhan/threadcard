export type Lang = "id" | "en";

export type AspectRatio = "auto" | "1:1" | "4:5" | "9:16";

export type FontKey = "sans" | "serif" | "mono";

export type ErrorCode =
  | "INVALID_URL"
  | "NOT_FOUND"
  | "PRIVATE_OR_BLOCKED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_CHANGED"
  | "RATE_LIMITED"
  | "IMAGE_FAILED"
  | "UNKNOWN";

export interface Author {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface PostMedia {
  type: "image" | "video";
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface Counts {
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  shares: number | null;
}

export interface ThreadsPost {
  shortcode: string;
  url: string;
  author: Author;
  text: string;
  createdAt: string | null;
  counts: Counts;
  media: PostMedia[];
  isReply: boolean;
}

export interface FetchPostData {
  posts: ThreadsPost[];
  source: "scrape" | "og" | "manual";
  fetchedAt: string;
}

export type FetchPostResponse =
  | { ok: true; data: FetchPostData }
  | { ok: false; code: ErrorCode; message?: string };

export interface Theme {
  id: string;
  name: string;
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
}

export interface CardSettings {
  themeId: string;
  background: string;
  textColor: string;
  accentColor: string;
  font: FontKey;
  fontSize: number;
  padding: number;
  aspect: AspectRatio;
  cardScale: number;
  cardX: number;
  cardY: number;
  showAvatar: boolean;
  showVerified: boolean;
  showTimestamp: boolean;
  showCounts: boolean;
  showMedia: boolean;
  showWatermark: boolean;
}

export interface SlideOverrides {
  displayName?: string;
  username?: string;
  text?: string;
  timestamp?: string;
  likes?: number | null;
  replies?: number | null;
  reposts?: number | null;
  avatarDataUrl?: string;
}

export interface Slide {
  post: ThreadsPost;
  overrides: SlideOverrides;
}

export interface BackgroundVideo {
  url: string;
  name: string;
  duration: number;
}

export interface BackgroundAudio {
  url: string;
  name: string;
  duration: number;
}
