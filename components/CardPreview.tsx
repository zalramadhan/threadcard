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
}

export function CardPreview({ slide, settings, lang }: CardPreviewProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [cardHeight, setCardHeight] = useState(
    fixedHeight(settings.aspect) ?? 1200,
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const width = element.clientWidth;
      if (width > 0) {
        setScale(Math.min(1, width / CANVAS_WIDTH));
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const update = () => {
      const height = element.getBoundingClientRect().height;
      if (height > 0) setCardHeight(height);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [slide, settings]);

  const automaticHeight = fixedHeight(settings.aspect) ?? cardHeight;
  const displayHeight = automaticHeight * scale;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-900"
      style={{ height: displayHeight }}
      aria-label={t("preview.aria")}
    >
      <div
        style={{
          width: CANVAS_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div ref={cardRef}>
          <CardMockup
            slide={slide}
            settings={settings}
            lang={lang}
            height={fixedHeight(settings.aspect)}
          />
        </div>
      </div>
    </div>
  );
}
