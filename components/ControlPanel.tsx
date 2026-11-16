"use client";

import { useRef, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import {
  CopyIcon,
  DownloadIcon,
  SpinnerIcon,
} from "@/components/icons";
import { formatDate } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import { THEMES } from "@/lib/themes";
import type {
  AspectRatio,
  CardSettings,
  Lang,
  Slide,
  SlideOverrides,
} from "@/lib/types";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400/20";

const ASPECTS: Array<{
  value: AspectRatio;
  labelKey: MessageKey;
  hint: string;
}> = [
  { value: "auto", labelKey: "aspect.auto", hint: "1080×auto" },
  { value: "1:1", labelKey: "aspect.1:1", hint: "1080×1080" },
  { value: "4:5", labelKey: "aspect.4:5", hint: "1080×1350" },
  { value: "9:16", labelKey: "aspect.9:16", hint: "1080×1920" },
];

interface ControlPanelProps {
  slide: Slide;
  settings: CardSettings;
  lang: Lang;
  total: number;
  source: "scrape" | "og" | "manual";
  busy: boolean;
  onSettings: (patch: Partial<CardSettings>) => void;
  onTheme: (themeId: string) => void;
  onResetLook: () => void;
  onOverride: (patch: Partial<SlideOverrides>) => void;
  onResetContent: () => void;
  onDownload: () => void;
  onDownloadAll: () => void;
  onCopy: () => void;
  onNewPost: () => void;
  onToast: (message: string) => void;
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-900 ${
          checked
            ? "bg-neutral-950 dark:bg-neutral-100"
            : "bg-neutral-200 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all dark:bg-neutral-950 ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function CountInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? Math.max(0, parsed) : null);
        }}
        className={inputClass}
      />
    </label>
  );
}

export function ControlPanel({
  slide,
  settings,
  lang,
  total,
  source,
  busy,
  onSettings,
  onTheme,
  onResetLook,
  onOverride,
  onResetContent,
  onDownload,
  onDownloadAll,
  onCopy,
  onNewPost,
  onToast,
}: ControlPanelProps) {
  const { t } = useI18n();
  const { post, overrides } = slide;
  const avatarInput = useRef<HTMLInputElement>(null);

  const displayName = overrides.displayName ?? post.author.displayName;
  const username = overrides.username ?? post.author.username;
  const text = overrides.text ?? post.text;
  const timestamp =
    overrides.timestamp ?? formatDate(post.createdAt, lang);

  const avatarSrc = overrides.avatarDataUrl ?? post.author.avatarUrl;

  const handleAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      onToast(t("editor.avatarTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onOverride({ avatarDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside className="flex flex-col gap-4">
      {source !== "scrape" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {source === "manual" ? t("notice.manual") : t("notice.og")}
        </div>
      )}

      <Section
        title={t("editor.look")}
        action={
          <button
            type="button"
            onClick={onResetLook}
            className="text-[11px] font-medium text-neutral-400 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-500 dark:hover:text-neutral-100"
          >
            {t("editor.reset")}
          </button>
        }
      >
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((theme) => {
            const active = settings.themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onTheme(theme.id)}
                aria-pressed={active}
                className={`rounded-xl border p-1.5 text-center transition ${
                  active
                    ? "border-neutral-900 ring-1 ring-neutral-900 dark:border-neutral-100 dark:ring-neutral-100"
                    : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                }`}
              >
                <span
                  className="flex h-8 items-center justify-center rounded-lg border border-black/5"
                  style={{ background: theme.background }}
                >
                  <span
                    className="block h-4 w-4 rounded-full border border-black/10"
                    style={{ background: theme.card }}
                  />
                </span>
                <span className="mt-1 block text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {t("editor.background")}
            </span>
            <input
              type="color"
              value={settings.background}
              onChange={(event) =>
                onSettings({ background: event.target.value })
              }
              aria-label={t("editor.background")}
              className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {t("editor.textColor")}
            </span>
            <input
              type="color"
              value={settings.textColor}
              onChange={(event) =>
                onSettings({ textColor: event.target.value })
              }
              aria-label={t("editor.textColor")}
              className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {t("editor.font")}
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {(
              [
                ["sans", "font.sans"],
                ["serif", "font.serif"],
                ["mono", "font.mono"],
              ] as const
            ).map(([value, labelKey]) => (
              <button
                key={value}
                type="button"
                onClick={() => onSettings({ font: value })}
                aria-pressed={settings.font === value}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                  settings.font === value
                    ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-600 dark:text-neutral-300">
              {t("editor.fontSize")}
            </span>
            <span className="tabular-nums text-neutral-400 dark:text-neutral-500">
              {settings.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min={32}
            max={56}
            step={2}
            value={settings.fontSize}
            onChange={(event) =>
              onSettings({ fontSize: Number(event.target.value) })
            }
            aria-label={t("editor.fontSize")}
            className="mt-2 w-full accent-neutral-950 dark:accent-neutral-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-600 dark:text-neutral-300">
              {t("editor.padding")}
            </span>
            <span className="tabular-nums text-neutral-400 dark:text-neutral-500">
              {settings.padding}px
            </span>
          </div>
          <input
            type="range"
            min={32}
            max={80}
            step={8}
            value={settings.padding}
            onChange={(event) =>
              onSettings({ padding: Number(event.target.value) })
            }
            aria-label={t("editor.padding")}
            className="mt-2 w-full accent-neutral-950 dark:accent-neutral-100"
          />
        </div>
      </Section>

      <Section
        title={t("editor.content")}
        action={
          <button
            type="button"
            onClick={onResetContent}
            className="text-[11px] font-medium text-neutral-400 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-500 dark:hover:text-neutral-100"
          >
            {t("editor.resetContent")}
          </button>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {t("editor.name")}
          </span>
          <input
            value={displayName}
            maxLength={60}
            onChange={(event) =>
              onOverride({ displayName: event.target.value })
            }
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {t("editor.username")}
          </span>
          <div className="flex items-center rounded-xl border border-neutral-200 bg-white px-3.5 transition focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10 dark:border-neutral-800 dark:bg-neutral-950 dark:focus-within:border-neutral-400 dark:focus-within:ring-neutral-400/20">
            <span className="text-sm text-neutral-400 dark:text-neutral-500">
              @
            </span>
            <input
              value={username.replace(/^@/, "")}
              maxLength={30}
              onChange={(event) =>
                onOverride({ username: event.target.value.replace(/^@/, "") })
              }
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-neutral-900 outline-none dark:text-neutral-100"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span>{t("editor.text")}</span>
            <span className="tabular-nums text-neutral-400 dark:text-neutral-500">
              {t("char.count", { n: text.length })}
            </span>
          </span>
          <textarea
            value={text}
            maxLength={500}
            rows={5}
            onChange={(event) => onOverride({ text: event.target.value })}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {t("editor.timestamp")}
          </span>
          <input
            value={timestamp}
            onChange={(event) =>
              onOverride({ timestamp: event.target.value })
            }
            placeholder="—"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <CountInput
            label={t("editor.likes")}
            value={
              overrides.likes !== undefined
                ? overrides.likes
                : post.counts.likes
            }
            onChange={(value) => onOverride({ likes: value })}
          />
          <CountInput
            label={t("editor.replies")}
            value={
              overrides.replies !== undefined
                ? overrides.replies
                : post.counts.replies
            }
            onChange={(value) => onOverride({ replies: value })}
          />
          <CountInput
            label={t("editor.reposts")}
            value={
              overrides.reposts !== undefined
                ? overrides.reposts
                : post.counts.reposts
            }
            onChange={(value) => onOverride({ reposts: value })}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              {avatarSrc ? (
                <img
                  src={
                    avatarSrc.startsWith("data:")
                      ? avatarSrc
                      : `/api/image?url=${encodeURIComponent(avatarSrc)}`
                  }
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <span className="truncate text-xs text-neutral-600 dark:text-neutral-300">
              {t("editor.avatar")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {overrides.avatarDataUrl && (
              <button
                type="button"
                onClick={() => onOverride({ avatarDataUrl: undefined })}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                {t("editor.removeAvatar")}
              </button>
            )}
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              {t("editor.uploadAvatar")}
            </button>
          </div>
          <input
            ref={avatarInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => handleAvatar(event.target.files?.[0])}
          />
        </div>
      </Section>

      <Section title={t("editor.elements")}>
        <Toggle
          label={t("toggle.avatar")}
          checked={settings.showAvatar}
          onChange={(value) => onSettings({ showAvatar: value })}
        />
        <Toggle
          label={t("toggle.verified")}
          checked={settings.showVerified}
          onChange={(value) => onSettings({ showVerified: value })}
        />
        <Toggle
          label={t("toggle.timestamp")}
          checked={settings.showTimestamp}
          onChange={(value) => onSettings({ showTimestamp: value })}
        />
        <Toggle
          label={t("toggle.counts")}
          checked={settings.showCounts}
          onChange={(value) => onSettings({ showCounts: value })}
        />
        <Toggle
          label={t("toggle.media")}
          checked={settings.showMedia}
          onChange={(value) => onSettings({ showMedia: value })}
        />
      </Section>

      <Section title={t("editor.size")}>
        <div className="grid grid-cols-4 gap-2">
          {ASPECTS.map((aspect) => {
            const active = settings.aspect === aspect.value;
            return (
              <button
                key={aspect.value}
                type="button"
                onClick={() => onSettings({ aspect: aspect.value })}
                aria-pressed={active}
                className={`rounded-xl border px-1 py-2.5 text-center transition ${
                  active
                    ? "border-neutral-900 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600"
                }`}
              >
                <span className="block text-xs font-semibold">
                  {t(aspect.labelKey)}
                </span>
                <span
                  className={`mt-0.5 block text-[9px] ${
                    active
                      ? "text-white/60 dark:text-neutral-950/60"
                      : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {aspect.hint}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t("editor.export")}>
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          {busy ? <SpinnerIcon size={16} /> : <DownloadIcon size={16} />}
          {busy ? t("state.exporting") : t("action.download")}
        </button>

        <button
          type="button"
          onClick={onCopy}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <CopyIcon size={16} />
          {t("action.copy")}
        </button>

        {total > 1 && (
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <DownloadIcon size={16} />
            {t("action.downloadAll")}
          </button>
        )}

        <button
          type="button"
          onClick={onNewPost}
          className="w-full rounded-xl px-4 py-2 text-xs font-medium text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100"
        >
          {t("action.newPost")}
        </button>
      </Section>
    </aside>
  );
}

