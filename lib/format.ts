import type { AspectRatio, Lang } from "./types";

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  if (value < 1000) return String(value);

  const units = [
    { limit: 1_000_000_000, suffix: "B" },
    { limit: 1_000_000, suffix: "M" },
    { limit: 1_000, suffix: "K" },
  ];

  for (const unit of units) {
    if (value >= unit.limit) {
      const amount = value / unit.limit;
      const rounded =
        amount >= 100 ? Math.round(amount) : Math.round(amount * 10) / 10;
      return `${String(rounded).replace(/\.0$/, "")}${unit.suffix}`;
    }
  }

  return String(value);
}

export function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatTimestamp(
  iso: string | null,
  lang: Lang,
  override?: string,
): string {
  if (override !== undefined) return override;
  return formatDate(iso, lang);
}

export const CANVAS_WIDTH = 1080;
export const CANVAS_PADDING = 48;
export const MAX_AUTO_HEIGHT = 2400;

export const ASPECT_HEIGHT: Record<Exclude<AspectRatio, "auto">, number> = {
  "1:1": 1080,
  "4:5": 1350,
  "9:16": 1920,
};

export function fixedHeight(aspect: AspectRatio): number | null {
  return aspect === "auto" ? null : ASPECT_HEIGHT[aspect];
}

export function lineLimit(aspect: AspectRatio): number | null {
  switch (aspect) {
    case "1:1":
      return 4;
    case "4:5":
      return 5;
    case "9:16":
      return 7;
    default:
      return null;
  }
}

export function moreThreshold(aspect: AspectRatio): number {
  switch (aspect) {
    case "1:1":
      return 180;
    case "4:5":
      return 240;
    case "9:16":
      return 330;
    default:
      return Number.POSITIVE_INFINITY;
  }
}
