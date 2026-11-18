"use client";

import { useEffect, useRef, useState } from "react";
import { CardMockup } from "@/components/CardMockup";
import { useI18n } from "@/components/I18nProvider";
import { CANVAS_WIDTH, fixedHeight } from "@/lib/format";
import type { CardSettings, Lang, Slide } from "@/lib/types";

interface CardPreviewProps {
  slide: Slide;
  settings: CardSettings;
  lang: Lang;
  backgroundVideo?: string | null;
  /**
   * On screens narrower than `lg`, cap the preview height to this share of the
   * viewport so the sticky preview stays compact.
   */
  compactMaxHeightVh?: number;
}

export function CardPreview({
  slide,
  settings,
  lang,
  backgroundVideo = null,
  compactMaxHeightVh,
}: CardPreviewProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [compactHeight, setCompactHeight] = useState(0);
  const [cardHeight, setCardHeight] = useState(
    fixedHeight(settings.aspect) ?? 1200,
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const next = element.clientWidth;
      if (next > 0) setWidth(next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (compactMaxHeightVh === undefined) return;

    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      setCompactHeight(
        query.matches ? (window.innerHeight * compactMaxHeightVh) / 100 : 0,
      );
    };

    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, [compactMaxHeightVh]);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const update = () => {
      // offsetHeight ignores the ancestor's transform, so the measurement stays
      // in canvas pixels instead of the already-scaled preview pixels.
      const height = element.offsetHeight;
      if (height > 0) setCardHeight(height);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [slide, settings]);

  const automaticHeight = fixedHeight(settings.aspect) ?? cardHeight;
  const maxHeight = compactHeight > 0 ? compactHeight : Number.POSITIVE_INFINITY;
  const scale =
    width > 0
      ? Math.min(1, width / CANVAS_WIDTH, maxHeight / automaticHeight)
      : 0.6;
  const displayHeight = automaticHeight * scale;

  return (
    <div
      ref={containerRef}
      className="flex w-full justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-900"
      style={{ height: displayHeight }}
      aria-label={t("preview.aria")}
    >
      <div
        className="shrink-0"
        style={{
          width: CANVAS_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <div ref={cardRef}>
          <CardMockup
            slide={slide}
            settings={settings}
            lang={lang}
            height={fixedHeight(settings.aspect)}
            backgroundVideo={backgroundVideo}
          />
        </div>
      </div>
    </div>
  );
}
