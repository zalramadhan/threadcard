"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";
import type { PublicUser } from "@/lib/types";

type OrderState = {
  code: string;
  whatsappUrl: string | null;
};

export function AccountMenu({ user }: { user: PublicUser }) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderState | null>(null);

  const initial = (user.name || user.email).slice(0, 1).toUpperCase();
  const paid = user.plan === "lifetime";

  async function upgrade() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        order?: { code: string };
        whatsappUrl?: string | null;
      };
      if (!res.ok || !data.order) {
        setError(data.error ?? tp(lang, "upgrade.error"));
        return;
      }
      setOrder({
        code: data.order.code,
        whatsappUrl: data.whatsappUrl ?? null,
      });
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      } else {
        setError(tp(lang, "upgrade.noWhatsapp"));
      }
    } catch {
      setError(tp(lang, "upgrade.error"));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/");
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={tp(lang, "account.menu")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`grid h-9 w-9 place-items-center rounded-full border text-[11px] font-semibold transition ${
          paid
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        }`}
      >
        {initial}
      </button>

      {open && (
        <div className="card absolute right-0 top-11 z-50 w-[248px] p-3 shadow-xl">
          <p className="truncate text-[11.5px] font-medium text-neutral-900 dark:text-neutral-100">
            {user.email}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className={`chip ${paid ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : ""}`}
            >
              {tp(lang, paid ? "account.lifetime" : "account.free")}
            </span>
            {user.role === "admin" && (
              <a href="/admin" className="chip hover:text-neutral-900 dark:hover:text-neutral-100">
                {tp(lang, "account.admin")}
              </a>
            )}
          </div>

          <a
            href="/orders"
            className="mt-2 flex items-center justify-between rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11.5px] font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800/60"
          >
            {tp(lang, "account.orders")}
            <span aria-hidden="true">→</span>
          </a>

          <a
            href="/help"
            className="mt-1.5 flex items-center justify-between px-1 py-1 text-[11px] font-medium text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {tp(lang, "account.help")}
            <span aria-hidden="true">→</span>
          </a>

          {!paid && (
            <button
              type="button"
              onClick={() => void upgrade()}
              disabled={busy}
              className="btn btn-primary mt-3 w-full"
            >
              {busy ? tp(lang, "upgrade.opening") : tp(lang, "account.upgrade")}
            </button>
          )}

          {order && (
            <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-[10.5px] leading-relaxed text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
              <p className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                {order.code}
              </p>
              <p>{tp(lang, "account.pending")}</p>
              {order.whatsappUrl && (
                <a
                  href={order.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-medium text-neutral-900 underline underline-offset-4 dark:text-neutral-100"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {error && (
            <p className="mt-2 text-[10.5px] leading-snug text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button type="button" onClick={() => void logout()} className="btn mt-2 w-full">
            {tp(lang, "account.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
