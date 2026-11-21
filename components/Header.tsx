"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThreadsMark } from "@/components/icons";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";
import type { PublicUser } from "@/lib/types";

export function Header({ user }: { user?: PublicUser | null }) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5">
        <ThreadsMark
          size={30}
          className="text-neutral-950 dark:text-neutral-50"
        />
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight">
            {t("app.name")}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {t("app.tagline")}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center rounded-full border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900"
          role="group"
          aria-label={t("nav.lang")}
        >
          {(["id", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                lang === code
                  ? "bg-neutral-950 text-white dark:bg-neutral-50 dark:text-neutral-950"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
        <ThemeToggle />
        {user ? (
          <AccountMenu user={user} />
        ) : (
          <Link href="/login" className="btn">
            {tp(lang, "auth.login")}
          </Link>
        )}
      </div>
    </header>
  );
}
