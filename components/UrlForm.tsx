"use client";

import { LinkIcon, SpinnerIcon } from "@/components/icons";
import { useI18n } from "@/components/I18nProvider";

interface UrlFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error?: string | null;
  compact?: boolean;
  onReset?: () => void;
}

export function UrlForm({
  value,
  onChange,
  onSubmit,
  loading,
  error,
  compact = false,
  onReset,
}: UrlFormProps) {
  const { t } = useI18n();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={compact ? "w-full" : "mx-auto w-full max-w-2xl"}
    >
      <div
        className={`flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none sm:flex-row sm:items-center ${
          error ? "ring-1 ring-red-200 dark:ring-red-900" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
          <LinkIcon
            size={18}
            className="shrink-0 text-neutral-400 dark:text-neutral-500"
          />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={t("hero.placeholder")}
            aria-label={t("hero.placeholder")}
            aria-invalid={Boolean(error)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {compact && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              {t("action.newPost")}
            </button>
          )}
          <button
            type="submit"
            disabled={loading || value.trim().length === 0}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            {loading && <SpinnerIcon size={16} />}
            {loading ? t("state.loading") : t("hero.cta")}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 px-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
