"use client";

import { tp } from "@/lib/platform-i18n";
import type { Lang, UserPlan } from "@/lib/types";

function formatSaved(value: number, lang: Lang) {
  return new Date(value).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AccountBar({
  lang,
  plan,
  signedIn,
  verified,
  savedAt,
  saving,
  onSave,
  slideCount,
  maxSlides,
}: {
  lang: Lang;
  plan: UserPlan;
  signedIn: boolean;
  verified: boolean;
  savedAt: number | null;
  saving: boolean;
  onSave: () => void;
  slideCount: number;
  maxSlides: number;
}) {
  return (
    <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={`chip ${
            plan === "lifetime"
              ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : ""
          }`}
        >
          {tp(lang, plan === "lifetime" ? "account.lifetime" : "account.free")}
        </span>
        {plan === "lifetime" ? (
          <span className="text-neutral-500 dark:text-neutral-400">
            {tp(lang, "plan.lifetimeExport")}
          </span>
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400">
            {tp(lang, "plan.freeExport")}
          </span>
        )}
        {savedAt && (
          <span className="text-neutral-400 dark:text-neutral-500">
            · {tp(lang, "project.updated", { when: formatSaved(savedAt, lang) })}
          </span>
        )}
        {signedIn && !verified && (
          <span className="text-amber-700 dark:text-amber-300">
            · {tp(lang, "editor.verifiedOnly")}
          </span>
        )}
        {plan === "free" && slideCount >= maxSlides && (
          <span className="text-amber-700 dark:text-amber-300">
            · {tp(lang, "editor.freeLimitSlides")}
          </span>
        )}
      </div>

      {signedIn ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn"
        >
          {saving ? tp(lang, "project.saving") : tp(lang, "project.save")}
        </button>
      ) : (
        <a href="/login" className="btn">
          {tp(lang, "auth.login")}
        </a>
      )}
    </div>
  );
}
