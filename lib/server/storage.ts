export type AssetKind = "video" | "audio" | "image";

export const MAX_ASSET_BYTES: Record<AssetKind, number> = {
  video: 25 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  image: 2 * 1024 * 1024,
};

export const ASSET_TYPES: Record<AssetKind, Record<string, string>> = {
  video: {
    "video/mp4": "mp4",
    "video/webm": "webm",
  },
  audio: {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
  },
  image: {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  },
};

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export const MEDIA_BUCKET = "media";

export function isSafeId(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

export function mimeForExt(ext: string) {
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/** Object path for a user-owned asset, e.g. `<uuid>/<uuid>.mp4`. */
export function storagePath(userId: string, ext: string) {
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}
