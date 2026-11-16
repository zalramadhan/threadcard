"use client";

import { useI18n } from "@/components/I18nProvider";

interface SlideTabsProps {
  total: number;
  active: number;
  onChange: (index: number) => void;
}

export function SlideTabs({ total, active, onChange }: SlideTabsProps) {
  const { t } = useI18n();
  if (total <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {Array.from({ length: total }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index)}
            aria-current={active === index ? "step" : undefined}
            className={`h-8 min-w-8 rounded-full px-2 text-xs font-semibold transition ${
              active === index
                ? "bg-neutral-950 text-white dark:bg-neutral-50 dark:text-neutral-950"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {t("slide.label", { n: active + 1, total })}
      </span>
    </div>
  );
}
