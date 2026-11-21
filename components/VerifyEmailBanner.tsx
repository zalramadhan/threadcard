"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";
import type { PublicUser } from "@/lib/types";

export function VerifyEmailBanner({ user }: { user: PublicUser }) {
  const { lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user.emailVerifiedAt) return null;

  async function resend() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(
          data.error?.includes("not configured")
            ? tp(lang, "verify.notConfigured")
            : (data.error ?? tp(lang, "common.genericError")),
        );
        return;
      }
      setMessage(tp(lang, "verify.sent"));
    } catch {
      setError(tp(lang, "common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-amber-500/25 bg-amber-500/[0.07]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="text-[11.5px]">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            {tp(lang, "verify.bannerTitle")}
          </p>
          <p className="mt-0.5 leading-relaxed text-neutral-500 dark:text-neutral-400">
            {tp(lang, "verify.bannerBody", { email: user.email })}
          </p>
          {message && (
            <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-300">
              {message}
            </p>
          )}
          {error && <p className="mt-1 text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy}
          className="btn shrink-0 self-start sm:self-auto"
        >
          {busy ? tp(lang, "verify.sending") : tp(lang, "verify.resend")}
        </button>
      </div>
    </div>
  );
}
