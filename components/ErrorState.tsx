"use client";

import { useI18n } from "@/components/I18nProvider";
import { LinkIcon } from "@/components/icons";
import type { MessageKey } from "@/lib/i18n";
import type { ErrorCode } from "@/lib/types";

const MESSAGE_KEY: Record<ErrorCode, MessageKey> = {
  INVALID_URL: "error.invalid",
  NOT_FOUND: "error.notfound",
  PRIVATE_OR_BLOCKED: "error.private",
  UPSTREAM_TIMEOUT: "error.timeout",
  UPSTREAM_CHANGED: "error.changed",
  RATE_LIMITED: "error.ratelimited",
  IMAGE_FAILED: "error.unknown",
  UNKNOWN: "error.unknown",
};

interface ErrorStateProps {
  code: ErrorCode;
  onRetry: () => void;
  onManual: () => void;
}

export function ErrorState({ code, onRetry, onManual }: ErrorStateProps) {
  const { t } = useI18n();
  const messageKey = MESSAGE_KEY[code] ?? "error.unknown";

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <LinkIcon size={22} />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">
        {t("error.title")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        {t(messageKey)}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          {t("error.retry")}
        </button>
        <button
          type="button"
          onClick={onManual}
          className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {t("error.manual")}
        </button>
      </div>
    </div>
  );
}
