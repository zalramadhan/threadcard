"use client";

import {
  BadgeIcon,
  CommentIcon,
  HeartIcon,
  PlayIcon,
  RepostIcon,
  ShareIcon,
} from "@/components/icons";
import {
  CANVAS_PADDING,
  CANVAS_WIDTH,
  MAX_AUTO_HEIGHT,
  formatCount,
  formatTimestamp,
  lineLimit,
} from "@/lib/format";
import { t } from "@/lib/i18n";
import { getTheme } from "@/lib/themes";
import type {
  CardSettings,
  FontKey,
  Lang,
  Slide,
  ThreadsPost,
} from "@/lib/types";

const FONT_STACK: Record<FontKey, string> = {
  sans: "var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif",
  serif:
    "var(--font-instrument-serif), Georgia, 'Times New Roman', serif",
  mono: "var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, monospace",
};

interface CardMockupProps {
  slide: Slide;
  settings: CardSettings;
  lang: Lang;
  height: number | null;
  backgroundVideo?: string | null;
  backgroundFrame?: string | null;
  transparentBackground?: boolean;
}

function proxied(url: string): string {
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return letters || "?";
}

function countValue(
  override: number | null | undefined,
  source: number | null,
): number | null {
  if (override !== undefined) return override;
  return source;
}

function truncateText(
  text: string,
  settings: CardSettings,
  post: ThreadsPost,
): { text: string; truncated: boolean } {
  const innerWidth = CANVAS_WIDTH - CANVAS_PADDING * 2 - settings.padding * 2;
  const charsPerLine = Math.max(
    16,
    Math.floor(innerWidth / (settings.fontSize * 0.52)),
  );

  const maxLines = lineLimit(settings.aspect);
  let maxChars = maxLines ? charsPerLine * maxLines : 0;

  if (!maxLines) {
    // Auto height is capped at 2400 px. Reserve room for the header, action
    // row, padding, gaps, media, and the "See more" label before allowing
    // text to use the rest.
    const mediaCount = settings.showMedia ? post.media.length : 0;
    const mediaHeight =
      mediaCount === 0 ? 0 : mediaCount === 2 ? 424 : 560;
    const chrome =
      CANVAS_PADDING * 2 +
      settings.padding * 2 +
      80 +
      28 * 3 +
      (settings.showCounts ? 56 : 0) +
      44;
    const available = Math.max(0, MAX_AUTO_HEIGHT - chrome - mediaHeight);
    const lines = Math.max(
      1,
      Math.floor(available / (settings.fontSize * 1.4)),
    );
    maxChars = charsPerLine * lines;
  }

  if (text.length <= maxChars) return { text, truncated: false };

  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace > maxChars * 0.55 ? slice.slice(0, lastSpace) : slice;

  return { text: `${cut.trimEnd()}…`, truncated: true };
}

function RichText({ text, accent }: { text: string; accent: string }) {
  const parts = text.split(/(@[A-Za-z0-9._]+|#[^\s#@]+|https?:\/\/[^\s]+)/g);

  return (
    <>
      {parts.map((part, index) =>
        /^(@|#|https?:\/\/)/.test(part) ? (
          <span key={`${part}-${index}`} style={{ color: accent }}>
            {part}
          </span>
        ) : (
          <span key={`t-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function MediaBlock({
  post,
  settings,
}: {
  post: ThreadsPost;
  settings: CardSettings;
}) {
  if (!settings.showMedia || post.media.length === 0) return null;

  const visible = post.media.slice(0, 4);
  const extra = post.media.length - visible.length;
  const cellHeight =
    settings.aspect === "auto" ? (visible.length > 2 ? 276 : 424) : 132;

  if (visible.length === 1) {
    const media = visible[0];
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: settings.aspect === "auto" ? "4 / 3" : "16 / 9",
          maxHeight: settings.aspect === "auto" ? 560 : 280,
          borderRadius: 20,
          overflow: "hidden",
          background: "#00000010",
        }}
      >
        <img
          src={proxied(media.url)}
          alt={media.alt ?? ""}
          crossOrigin="anonymous"
          draggable={false}
          loading="eager"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {media.type === "video" && (
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 64,
              height: 64,
              borderRadius: 9999,
              background: "#00000070",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PlayIcon size={28} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridAutoRows: `${cellHeight}px`,
        gap: 8,
        maxHeight: settings.aspect === "auto" ? undefined : 280,
        overflow: "hidden",
      }}
    >
      {visible.map((media, index) => (
        <div
          key={`${media.url}-${index}`}
          style={{
            position: "relative",
            height: cellHeight,
            borderRadius: 16,
            overflow: "hidden",
            background: "#00000010",
          }}
        >
          <img
            src={proxied(media.url)}
            alt={media.alt ?? ""}
            crossOrigin="anonymous"
            draggable={false}
            loading="eager"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          {media.type === "video" && (
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 44,
                height: 44,
                borderRadius: 9999,
                background: "#00000070",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PlayIcon size={20} />
            </span>
          )}
          {index === visible.length - 1 && extra > 0 && (
            <span
              style={{
                position: "absolute",
                inset: 0,
                background: "#00000075",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                fontWeight: 600,
              }}
            >
              +{extra}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function CardMockup({
  slide,
  settings,
  lang,
  height,
  backgroundVideo = null,
  backgroundFrame = null,
  transparentBackground = false,
}: CardMockupProps) {
  const { post, overrides } = slide;
  const theme = getTheme(settings.themeId);
  const cardScale = Math.min(120, Math.max(40, settings.cardScale)) / 100;
  const cardX = Math.min(50, Math.max(-50, settings.cardX));
  const cardY = Math.min(50, Math.max(-50, settings.cardY));

  const displayName = overrides.displayName ?? post.author.displayName;
  const username = (overrides.username ?? post.author.username).replace(
    /^@/,
    "",
  );
  const rawText = overrides.text ?? post.text;
  const timestamp = formatTimestamp(
    post.createdAt,
    lang,
    overrides.timestamp,
  );
  const avatar = overrides.avatarDataUrl ?? post.author.avatarUrl;
  const { text, truncated } = truncateText(rawText, settings, post);

  const likes = countValue(overrides.likes, post.counts.likes);
  const replies = countValue(overrides.replies, post.counts.replies);
  const reposts = countValue(overrides.reposts, post.counts.reposts);
  const shares = post.counts.shares;

  const showHeader = settings.showAvatar || displayName || username;

  return (
    <div
      data-card-root
      style={{
        position: "relative",
        width: CANVAS_WIDTH,
        height: height ?? undefined,
        minHeight: height ?? 1080,
        maxHeight: height ?? MAX_AUTO_HEIGHT,
        background: transparentBackground ? "transparent" : settings.background,
        padding: CANVAS_PADDING,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {backgroundVideo && !backgroundFrame && (
        <video
          data-bg-video
          src={backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
      )}

      {backgroundFrame && (
        <img
          src={backgroundFrame}
          alt=""
          draggable={false}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
      )}

      <article
        style={{
          position: "relative",
          zIndex: 1,
          transform: `translate(${(cardX / 100) * CANVAS_WIDTH}px, ${
            (cardY / 100) * CANVAS_WIDTH
          }px) scale(${cardScale})`,
          transformOrigin: "center",
          width: "100%",
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 24,
          padding: settings.padding,
          color: settings.textColor,
          fontFamily: FONT_STACK[settings.font],
          display: "flex",
          flexDirection: "column",
          gap: 28,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {showHeader && (
          <header style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {settings.showAvatar && (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 9999,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: theme.background,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: theme.muted,
                  fontSize: 30,
                  fontWeight: 600,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {initials(displayName)}
                </span>
                {avatar && (
                  <img
                    src={proxied(avatar)}
                    alt=""
                    crossOrigin="anonymous"
                    draggable={false}
                    loading="eager"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </span>
                {settings.showVerified && post.author.verified && (
                  <BadgeIcon size={26} style={{ flexShrink: 0 }} />
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 6,
                  fontSize: 26,
                  color: theme.muted,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  @{username}
                </span>
                {settings.showTimestamp && timestamp && (
                  <>
                    <span>·</span>
                    <span style={{ whiteSpace: "nowrap" }}>{timestamp}</span>
                  </>
                )}
              </div>
            </div>
          </header>
        )}

        {rawText.length > 0 && (
          <div>
            <div
              style={{
                fontSize: settings.fontSize,
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              <RichText text={text} accent={settings.accentColor} />
            </div>
            {truncated && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 26,
                  color: theme.muted,
                }}
              >
                {t(lang, "more.label")}
              </div>
            )}
          </div>
        )}

        <MediaBlock post={post} settings={settings} />

        {settings.showCounts && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 44,
              borderTop: `1px solid ${theme.border}`,
              paddingTop: 22,
              color: theme.muted,
              fontSize: 26,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <HeartIcon size={34} />
              {likes !== null && <span>{formatCount(likes)}</span>}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CommentIcon size={34} />
              {replies !== null && <span>{formatCount(replies)}</span>}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RepostIcon size={34} />
              {reposts !== null && <span>{formatCount(reposts)}</span>}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShareIcon size={34} />
              {shares !== null && <span>{formatCount(shares)}</span>}
            </span>
          </div>
        )}
      </article>

      {settings.showWatermark && (
        <div
          style={{
            position: "absolute",
            right: 28,
            bottom: 24,
            zIndex: 2,
            padding: "6px 14px",
            borderRadius: 9999,
            background: "rgba(0, 0, 0, 0.42)",
            color: "#FFFFFF",
            fontFamily: FONT_STACK[settings.font],
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "0.04em",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          ThreadCard
        </div>
      )}
    </div>
  );
}
