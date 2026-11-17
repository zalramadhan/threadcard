"use client";

import { CardPreview } from "@/components/CardPreview";
import { ControlPanel } from "@/components/ControlPanel";
import { useI18n } from "@/components/I18nProvider";
import { SlideTabs } from "@/components/SlideTabs";
import type {
  BackgroundAudio,
  BackgroundVideo,
  CardSettings,
  Lang,
  Slide,
  SlideOverrides,
} from "@/lib/types";

interface EditorProps {
  slides: Slide[];
  active: number;
  settings: CardSettings;
  lang: Lang;
  source: "scrape" | "og" | "manual";
  busy: boolean;
  backgroundVideo: BackgroundVideo | null;
  onBackgroundVideo: (file: File) => void;
  onRemoveBackgroundVideo: () => void;
  backgroundAudio: BackgroundAudio | null;
  onBackgroundAudio: (file: File) => void;
  onRemoveBackgroundAudio: () => void;
  audioVolume: number;
  onAudioVolume: (value: number) => void;
  audioStart: number;
  onAudioStart: (value: number) => void;
  videoClipLength: number;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  onSlideChange: (index: number) => void;
  onSettings: (patch: Partial<CardSettings>) => void;
  onTheme: (themeId: string) => void;
  onResetLook: () => void;
  onOverride: (patch: Partial<SlideOverrides>) => void;
  onResetContent: () => void;
  onDownload: () => void;
  onDownloadAll: () => void;
  onDownloadVideo: () => void;
  onCopy: () => void;
  onNewPost: () => void;
  onToast: (message: string) => void;
}

export function Editor({
  slides,
  active,
  settings,
  lang,
  source,
  busy,
  backgroundVideo,
  onBackgroundVideo,
  onRemoveBackgroundVideo,
  backgroundAudio,
  onBackgroundAudio,
  onRemoveBackgroundAudio,
  audioVolume,
  onAudioVolume,
  audioStart,
  onAudioStart,
  videoClipLength,
  musicPlaying,
  onToggleMusic,
  onSlideChange,
  onSettings,
  onTheme,
  onResetLook,
  onOverride,
  onResetContent,
  onDownload,
  onDownloadAll,
  onDownloadVideo,
  onCopy,
  onNewPost,
  onToast,
}: EditorProps) {
  const { t } = useI18n();
  const slide = slides[active];
  if (!slide) return null;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="min-w-0 lg:sticky lg:top-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            {t("editor.preview")}
          </span>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {backgroundVideo ? "PNG · MP4/WebM · 1080 px" : "PNG · 1080 px"}
          </span>
        </div>

        <CardPreview
          slide={slide}
          settings={settings}
          lang={lang}
          backgroundVideo={backgroundVideo?.url ?? null}
        />
        <SlideTabs
          total={slides.length}
          active={active}
          onChange={onSlideChange}
        />
      </div>

      <ControlPanel
        slide={slide}
        settings={settings}
        lang={lang}
        total={slides.length}
        source={source}
        busy={busy}
        backgroundVideo={backgroundVideo}
        onBackgroundVideo={onBackgroundVideo}
        onRemoveBackgroundVideo={onRemoveBackgroundVideo}
        backgroundAudio={backgroundAudio}
        onBackgroundAudio={onBackgroundAudio}
        onRemoveBackgroundAudio={onRemoveBackgroundAudio}
        audioVolume={audioVolume}
        onAudioVolume={onAudioVolume}
        audioStart={audioStart}
        onAudioStart={onAudioStart}
        videoClipLength={videoClipLength}
        musicPlaying={musicPlaying}
        onToggleMusic={onToggleMusic}
        onSettings={onSettings}
        onTheme={onTheme}
        onResetLook={onResetLook}
        onOverride={onOverride}
        onResetContent={onResetContent}
        onDownload={onDownload}
        onDownloadAll={onDownloadAll}
        onDownloadVideo={onDownloadVideo}
        onCopy={onCopy}
        onNewPost={onNewPost}
        onToast={onToast}
      />
    </div>
  );
}
