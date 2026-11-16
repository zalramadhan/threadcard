"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CardMockup } from "@/components/CardMockup";
import { Editor } from "@/components/Editor";
import { ErrorState } from "@/components/ErrorState";
import { Header } from "@/components/Header";
import { I18nProvider, useI18n } from "@/components/I18nProvider";
import { Toast } from "@/components/Toast";
import { UrlForm } from "@/components/UrlForm";
import {
  copyBlob,
  delay,
  downloadBlob,
  nodeToPngBlob,
  slideFilename,
} from "@/lib/export";
import { fixedHeight } from "@/lib/format";
import {
  defaultSettings,
  settingsForTheme,
} from "@/lib/themes";
import type {
  CardSettings,
  ErrorCode,
  FetchPostResponse,
  Slide,
  SlideOverrides,
  ThreadsPost,
} from "@/lib/types";
import { normalizeThreadsUrl } from "@/lib/url";

type Status = "idle" | "loading" | "error" | "ready";
type Source = "scrape" | "og" | "manual";

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16">
      <div className="animate-pulse rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-1/4 rounded bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
          <div className="h-4 w-11/12 rounded bg-neutral-100 dark:bg-neutral-800/60" />
          <div className="h-4 w-8/12 rounded bg-neutral-100 dark:bg-neutral-800/60" />
        </div>
        <div className="mt-6 aspect-[4/3] w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="mt-6 h-8 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800/60" />
      </div>
    </div>
  );
}

function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-neutral-200/80 px-5 py-6 dark:border-neutral-800 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("footer.legal")}</p>
        <p className="sm:text-right">
          {t("footer.disclaimer")} · {t("footer.privacy")}
        </p>
      </div>
    </footer>
  );
}

function ThreadCardApp() {
  const { t, lang } = useI18n();

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ErrorCode | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);
  const [settings, setSettings] = useState<CardSettings>(defaultSettings);
  const [source, setSource] = useState<Source>("scrape");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);
  const requestId = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleFetch = useCallback(
    async (rawUrl: string) => {
      const normalized = normalizeThreadsUrl(rawUrl);
      if (!normalized) {
        setFormError(t("error.invalid"));
        return;
      }

      setFormError(null);
      setError(null);
      setStatus("loading");

      const id = ++requestId.current;

      try {
        const response = await fetch(
          `/api/fetch-post?url=${encodeURIComponent(normalized.canonicalUrl)}`,
          { signal: AbortSignal.timeout(20000) },
        );
        const body = (await response.json()) as FetchPostResponse;

        if (id !== requestId.current) return;

        if (!body.ok) {
          if (body.code === "INVALID_URL") {
            setFormError(t("error.invalid"));
            setStatus("idle");
            return;
          }
          setError(body.code);
          setStatus("error");
          return;
        }

        if (body.data.posts.length === 0) {
          setError("NOT_FOUND");
          setStatus("error");
          return;
        }

        setSlides(
          body.data.posts.map((post) => ({ post, overrides: {} })),
        );
        setActive(0);
        setSettings(defaultSettings());
        setSource(body.data.source === "og" ? "og" : "scrape");
        setStatus("ready");
        setUrl(normalized.canonicalUrl);
      } catch (caught) {
        if (id !== requestId.current) return;
        console.error(caught);
        setError("UNKNOWN");
        setStatus("error");
      }
    },
    [t],
  );

  const startManual = useCallback(() => {
    requestId.current += 1;
    const post: ThreadsPost = {
      shortcode: "manual",
      url: "",
      author: {
        username: "username",
        displayName: lang === "id" ? "Nama Kamu" : "Your Name",
        avatarUrl: null,
        verified: false,
      },
      text: "",
      createdAt: new Date().toISOString(),
      counts: {
        likes: null,
        replies: null,
        reposts: null,
        shares: null,
      },
      media: [],
      isReply: false,
    };

    setSlides([{ post, overrides: {} }]);
    setActive(0);
    setSettings(defaultSettings());
    setSource("manual");
    setError(null);
    setFormError(null);
    setStatus("ready");
    setUrl("");
  }, [lang]);

  const reset = useCallback(() => {
    requestId.current += 1;
    setUrl("");
    setStatus("idle");
    setError(null);
    setFormError(null);
    setSlides([]);
    setActive(0);
    setSettings(defaultSettings());
    setSource("scrape");
    setBusy(false);
  }, []);

  const handleSettings = useCallback((patch: Partial<CardSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  const handleTheme = useCallback((themeId: string) => {
    setSettings((previous) => settingsForTheme(previous, themeId));
  }, []);

  const handleOverride = useCallback(
    (patch: Partial<SlideOverrides>) => {
      setSlides((previous) =>
        previous.map((slide, index) =>
          index === active
            ? { ...slide, overrides: { ...slide.overrides, ...patch } }
            : slide,
        ),
      );
    },
    [active],
  );

  const handleResetContent = useCallback(() => {
    setSlides((previous) =>
      previous.map((slide, index) =>
        index === active ? { ...slide, overrides: {} } : slide,
      ),
    );
  }, [active]);

  const exportSlide = useCallback(
    async (index: number): Promise<Blob> => {
      const node = exportRefs.current[index];
      if (!node) throw new Error("Export node not found");
      return nodeToPngBlob(node, settings.background);
    },
    [settings.background],
  );

  const handleDownload = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const slide = slides[active];
      const blob = await exportSlide(active);
      downloadBlob(blob, slideFilename(slide.post, active, slides.length));
      setToast(t("toast.downloaded"));
    } catch (caught) {
      console.error(caught);
      setToast(t("toast.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [active, busy, exportSlide, slides, t]);

  const handleDownloadAll = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      for (let index = 0; index < slides.length; index += 1) {
        const blob = await exportSlide(index);
        downloadBlob(
          blob,
          slideFilename(slides[index].post, index, slides.length),
        );
        if (index < slides.length - 1) await delay(400);
      }
      setToast(t("toast.allDownloaded", { total: slides.length }));
    } catch (caught) {
      console.error(caught);
      setToast(t("toast.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [busy, exportSlide, slides, t]);

  const handleCopy = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const slide = slides[active];
      const blob = await exportSlide(active);
      const copied = await copyBlob(blob);

      if (copied) {
        setToast(t("toast.copySuccess"));
      } else {
        downloadBlob(
          blob,
          slideFilename(slide.post, active, slides.length),
        );
        setToast(t("toast.copyFallback"));
      }
    } catch (caught) {
      console.error(caught);
      setToast(t("toast.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [active, busy, exportSlide, slides, t]);

  const currentSlide = slides[active];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <Header />

      <main className="flex-1">
        {status !== "ready" && (
          <section className="mx-auto max-w-3xl px-5 pb-10 pt-10 text-center sm:pt-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
              Threads → PNG · Free
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-7 text-neutral-500 dark:text-neutral-400 sm:text-base">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8">
              <UrlForm
                value={url}
                onChange={(value) => {
                  setUrl(value);
                  if (formError) setFormError(null);
                }}
                onSubmit={() => {
                  void handleFetch(url);
                }}
                loading={status === "loading"}
                error={formError}
              />
            </div>
            <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">{t("hero.note")}</p>
          </section>
        )}

        {status === "loading" && <LoadingState />}

        {status === "error" && error && (
          <div className="px-5 pb-16">
            <ErrorState
              code={error}
              onRetry={() => {
                void handleFetch(url);
              }}
              onManual={startManual}
            />
          </div>
        )}

        {status === "ready" && (
          <>
            <div className="mx-auto max-w-7xl px-5 pb-6 sm:px-8">
              <UrlForm
                value={url}
                onChange={(value) => {
                  setUrl(value);
                  if (formError) setFormError(null);
                }}
                onSubmit={() => {
                  void handleFetch(url);
                }}
                loading={false}
                compact
                onReset={reset}
              />
            </div>

            <Editor
              slides={slides}
              active={active}
              settings={settings}
              lang={lang}
              source={source}
              busy={busy}
              onSlideChange={setActive}
              onSettings={handleSettings}
              onTheme={handleTheme}
              onResetLook={() => setSettings(defaultSettings())}
              onOverride={handleOverride}
              onResetContent={handleResetContent}
              onDownload={() => {
                void handleDownload();
              }}
              onDownloadAll={() => {
                void handleDownloadAll();
              }}
              onCopy={() => {
                void handleCopy();
              }}
              onNewPost={reset}
              onToast={setToast}
            />
          </>
        )}
      </main>

      <Footer />
      <Toast message={toast} />

      {status === "ready" && currentSlide && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-[-20000px] top-0"
        >
          {slides.map((slide, index) => (
            <div
              key={`export-${slide.post.shortcode}-${index}`}
              ref={(element) => {
                exportRefs.current[index] = element;
              }}
              style={{ width: 1080 }}
            >
              <CardMockup
                slide={slide}
                settings={settings}
                lang={lang}
                height={fixedHeight(settings.aspect)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <ThreadCardApp />
    </I18nProvider>
  );
}
