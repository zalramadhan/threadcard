"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CardMockup } from "@/components/CardMockup";
import { Editor } from "@/components/Editor";
import { ErrorState } from "@/components/ErrorState";
import { Header } from "@/components/Header";
import { GithubIcon, InstagramIcon } from "@/components/icons";
import { I18nProvider, useI18n } from "@/components/I18nProvider";
import { Toast } from "@/components/Toast";
import { UrlForm } from "@/components/UrlForm";
import {
  captureVideoFrame,
  copyBlob,
  delay,
  downloadBlob,
  nodeToOverlayCanvas,
  nodeToPngBlob,
  readAudioDuration,
  readVideoDuration,
  recordingDuration,
  recordCardVideo,
  slideFilename,
  waitForVideoReady,
} from "@/lib/export";
import { fixedHeight } from "@/lib/format";
import {
  defaultSettings,
  settingsForTheme,
} from "@/lib/themes";
import type {
  BackgroundAudio,
  BackgroundVideo,
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

interface ExportRender {
  frame: string | null;
  transparent: boolean;
}

interface AudioGraph {
  context: AudioContext;
  gain: GainNode;
  destination: MediaStreamAudioDestinationNode;
}

const DEFAULT_EXPORT_RENDER: ExportRender = {
  frame: null,
  transparent: false,
};

function applyVolume(gain: GainNode, volume: number): void {
  gain.gain.value = Math.min(1, Math.max(0, volume / 100));
}

function nextPaint(): Promise<void> {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function findBackgroundVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>("video[data-bg-video]");
}

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

  const socialClass =
    "inline-flex items-center gap-1.5 font-medium text-neutral-500 transition hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50";

  return (
    <footer className="mt-auto border-t border-neutral-200/80 px-5 py-6 dark:border-neutral-800 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("footer.legal")}</p>
        <p className="sm:text-right">
          {t("footer.disclaimer")} · {t("footer.privacy")}
        </p>
      </div>
      <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-2 border-t border-neutral-200/70 pt-4 text-[11px] text-neutral-400 dark:border-neutral-800 dark:text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {t("footer.madeBy")}{" "}
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            zalramadhan
          </span>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/zalsomeone"
            target="_blank"
            rel="noreferrer"
            className={socialClass}
          >
            <InstagramIcon size={14} />
            @zalsomeone
          </a>
          <a
            href="https://github.com/zalramadhan"
            target="_blank"
            rel="noreferrer"
            className={socialClass}
          >
            <GithubIcon size={14} />
            GitHub
          </a>
        </div>
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
  const [backgroundVideo, setBackgroundVideo] =
    useState<BackgroundVideo | null>(null);
  const [backgroundAudio, setBackgroundAudio] =
    useState<BackgroundAudio | null>(null);
  const [audioVolume, setAudioVolume] = useState(100);
  const [audioStart, setAudioStart] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [exportRender, setExportRender] =
    useState<ExportRender>(DEFAULT_EXPORT_RENDER);

  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);
  const requestId = useRef(0);
  const backgroundVideoUrl = useRef<string | null>(null);
  const backgroundAudioUrl = useRef<string | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const audioGraphRef = useRef<AudioGraph | null>(null);

  const clipLength = recordingDuration(backgroundVideo?.duration ?? 0);
  const audioDuration = backgroundAudio?.duration ?? 0;
  const maxAudioStart = Math.max(0, audioDuration - clipLength);
  const clampedAudioStart = Math.min(audioStart, maxAudioStart);
  const musicLoops = clampedAudioStart + clipLength > audioDuration;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (backgroundVideoUrl.current) {
        URL.revokeObjectURL(backgroundVideoUrl.current);
      }
      if (backgroundAudioUrl.current) {
        URL.revokeObjectURL(backgroundAudioUrl.current);
      }
      void audioGraphRef.current?.context.close();
    };
  }, []);

  const applyBackgroundVideo = useCallback(
    (next: BackgroundVideo | null) => {
      const previous = backgroundVideoUrl.current;
      backgroundVideoUrl.current = next?.url ?? null;
      setBackgroundVideo(next);
      if (previous && previous !== next?.url) {
        URL.revokeObjectURL(previous);
      }
    },
    [],
  );

  const handleBackgroundVideo = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      const duration = await readVideoDuration(url);
      applyBackgroundVideo({ url, name: file.name, duration });
    },
    [applyBackgroundVideo],
  );

  const applyBackgroundAudio = useCallback((next: BackgroundAudio | null) => {
    const previous = backgroundAudioUrl.current;
    backgroundAudioUrl.current = next?.url ?? null;
    setBackgroundAudio(next);
    setMusicPlaying(false);
    setAudioStart(0);
    if (previous && previous !== next?.url) {
      URL.revokeObjectURL(previous);
    }
  }, []);

  const handleAudioStart = useCallback(
    (value: number) => {
      const next = Math.min(maxAudioStart, Math.max(0, value));
      setAudioStart(next);
      const element = musicRef.current;
      if (element && !element.paused) element.currentTime = next;
    },
    [maxAudioStart],
  );

  const handleBackgroundAudio = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      const duration = await readAudioDuration(url);
      applyBackgroundAudio({ url, name: file.name, duration });
    },
    [applyBackgroundAudio],
  );

  const clearBackgroundVideo = useCallback(() => {
    applyBackgroundVideo(null);
    applyBackgroundAudio(null);
  }, [applyBackgroundAudio, applyBackgroundVideo]);

  const ensureAudioGraph = useCallback(async (): Promise<AudioGraph | null> => {
    const element = musicRef.current;
    if (!element) return null;

    let graph = audioGraphRef.current;
    if (!graph) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(element);
      const gain = context.createGain();
      const destination = context.createMediaStreamDestination();
      source.connect(gain);
      gain.connect(destination);
      gain.connect(context.destination);
      graph = { context, gain, destination };
      audioGraphRef.current = graph;
    }

    if (graph.context.state === "suspended") {
      await graph.context.resume().catch(() => undefined);
    }
    applyVolume(graph.gain, audioVolume);
    return graph;
  }, [audioVolume]);

  useEffect(() => {
    const graph = audioGraphRef.current;
    if (graph) applyVolume(graph.gain, audioVolume);
  }, [audioVolume]);

  const toggleMusic = useCallback(async () => {
    const audio = musicRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    const graph = await ensureAudioGraph();
    if (!graph) return;

    audio.currentTime = clampedAudioStart;
    await audio.play().catch(() => undefined);
  }, [clampedAudioStart, ensureAudioGraph]);

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
    applyBackgroundVideo(null);
    applyBackgroundAudio(null);
    setExportRender(DEFAULT_EXPORT_RENDER);
  }, [applyBackgroundAudio, applyBackgroundVideo]);

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

      let frame: string | null = null;
      if (backgroundVideo) {
        const video = findBackgroundVideo();
        if (video) {
          await waitForVideoReady(video);
          frame = captureVideoFrame(video);
        }
      }

      setExportRender({ frame, transparent: false });
      await nextPaint();

      try {
        return await nodeToPngBlob(node, settings.background);
      } finally {
        setExportRender(DEFAULT_EXPORT_RENDER);
      }
    },
    [backgroundVideo, settings.background],
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

  const handleDownloadVideo = useCallback(async () => {
    if (busy || !backgroundVideo) return;
    const slide = slides[active];
    if (!slide) return;

    let music: HTMLAudioElement | null = null;
    setBusy(true);
    try {
      const node = exportRefs.current[active];
      if (!node) throw new Error("Export node not found");

      const video = findBackgroundVideo();
      if (!video) throw new Error("Background video is not ready");

      let audioTrack: MediaStreamTrack | null = null;
      if (backgroundAudio) {
        try {
          music = musicRef.current;
          if (music) {
            const graph = await ensureAudioGraph();
            audioTrack =
              graph?.destination.stream.getAudioTracks()[0] ?? null;
          }
        } catch (caught) {
          console.error(caught);
          audioTrack = null;
        }
      }

      setExportRender({ frame: null, transparent: true });
      await nextPaint();

      const overlay = await nodeToOverlayCanvas(node);
      setExportRender(DEFAULT_EXPORT_RENDER);
      await nextPaint();

      const { blob, extension } = await recordCardVideo(
        video,
        overlay,
        backgroundVideo.duration,
        audioTrack,
        () => {
          if (!music || !audioTrack) return;
          music.currentTime = clampedAudioStart;
          music.loop = musicLoops;
          void music.play().catch(() => undefined);
        },
      );
      downloadBlob(
        blob,
        slideFilename(slide.post, active, slides.length, extension),
      );
      setToast(
        t("toast.videoDownloaded", { format: extension.toUpperCase() }),
      );
    } catch (caught) {
      console.error(caught);
      setExportRender(DEFAULT_EXPORT_RENDER);
      setToast(t("toast.videoFailed"));
    } finally {
      if (music) {
        music.pause();
        music.currentTime = clampedAudioStart;
      }
      setBusy(false);
    }
  }, [
    active,
    backgroundAudio,
    backgroundVideo,
    busy,
    clampedAudioStart,
    ensureAudioGraph,
    musicLoops,
    slides,
    t,
  ]);

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
              backgroundVideo={backgroundVideo}
              onBackgroundVideo={(file) => {
                void handleBackgroundVideo(file);
              }}
              onRemoveBackgroundVideo={clearBackgroundVideo}
              backgroundAudio={backgroundAudio}
              onBackgroundAudio={(file) => {
                void handleBackgroundAudio(file);
              }}
              onRemoveBackgroundAudio={() => applyBackgroundAudio(null)}
              audioVolume={audioVolume}
              onAudioVolume={setAudioVolume}
              audioStart={clampedAudioStart}
              onAudioStart={handleAudioStart}
              videoClipLength={clipLength}
              musicPlaying={musicPlaying}
              onToggleMusic={() => {
                void toggleMusic();
              }}
              onSlideChange={setActive}
              onSettings={handleSettings}
              onTheme={handleTheme}
              onResetLook={() => {
                setSettings(defaultSettings());
                clearBackgroundVideo();
              }}
              onOverride={handleOverride}
              onResetContent={handleResetContent}
              onDownload={() => {
                void handleDownload();
              }}
              onDownloadAll={() => {
                void handleDownloadAll();
              }}
              onDownloadVideo={() => {
                void handleDownloadVideo();
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

      <audio
        ref={musicRef}
        src={backgroundAudio?.url}
        loop={musicLoops}
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
        onEnded={() => setMusicPlaying(false)}
        onTimeUpdate={(event) => {
          if (musicLoops) return;
          const audio = event.currentTarget;
          if (audio.currentTime >= clampedAudioStart + clipLength) {
            audio.pause();
            audio.currentTime = clampedAudioStart;
          }
        }}
        className="hidden"
      />

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
                backgroundFrame={exportRender.frame}
                transparentBackground={exportRender.transparent}
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
