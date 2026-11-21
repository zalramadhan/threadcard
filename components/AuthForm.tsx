"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const { lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      name: String(data.get("name") ?? ""),
      whatsapp: String(data.get("whatsapp") ?? ""),
    };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as {
        error?: string;
        pendingVerification?: boolean;
      };
      if (!res.ok) {
        setError(body.error ?? tp(lang, "common.genericError"));
        setBusy(false);
        return;
      }
      if (body.pendingVerification) {
        setPendingEmail(payload.email);
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError(tp(lang, "common.genericError"));
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[400px]">
          <p className="label">ThreadCard account</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-950 dark:text-neutral-50">
            {tp(lang, isLogin ? "auth.loginTitle" : "auth.registerTitle")}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            {tp(lang, isLogin ? "auth.loginSub" : "auth.registerSub")}
          </p>

          {pendingEmail ? (
            <div className="card mt-6 space-y-3 p-4">
              <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
                {tp(lang, "auth.pendingTitle")}
              </p>
              <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                {tp(lang, "auth.pendingBody", { email: pendingEmail })}
              </p>
              <p className="text-[10.5px] leading-relaxed text-neutral-400 dark:text-neutral-500">
                {tp(lang, "auth.pendingHint")}
              </p>
              <a href="/login" className="btn btn-primary w-full">
                {tp(lang, "auth.backToLogin")}
              </a>
            </div>
          ) : (
          <form onSubmit={submit} className="card mt-6 space-y-3 p-4">
            <label className="block space-y-1.5">
              <span className="label">{tp(lang, "auth.email")}</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
              />
            </label>

            {!isLogin && (
              <>
                <label className="block space-y-1.5">
                  <span className="label">{tp(lang, "auth.name")}</span>
                  <input name="name" autoComplete="name" className="input" />
                </label>
                <label className="block space-y-1.5">
                  <span className="label">{tp(lang, "auth.whatsapp")}</span>
                  <input
                    name="whatsapp"
                    inputMode="tel"
                    autoComplete="tel"
                    className="input"
                    placeholder="08…"
                  />
                </label>
              </>
            )}

            <label className="block space-y-1.5">
              <span className="label">{tp(lang, "auth.password")}</span>
              <input
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? undefined : 8}
                className="input"
              />
              {!isLogin && (
                <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">
                  {tp(lang, "auth.passwordHint")}
                </span>
              )}
            </label>

            {error && <p className="alert">{error}</p>}

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? "…" : tp(lang, isLogin ? "auth.login" : "auth.register")}
            </button>
          </form>
          )}

          <p className="mt-4 text-center text-[12px] text-neutral-500 dark:text-neutral-400">
            {tp(lang, isLogin ? "auth.needAccount" : "auth.haveAccount")}{" "}
            <a
              href={isLogin ? "/register" : "/login"}
              className="font-medium text-neutral-900 underline underline-offset-4 dark:text-neutral-100"
            >
              {tp(lang, isLogin ? "auth.toRegister" : "auth.toLogin")}
            </a>
          </p>

          <p className="mt-5 text-center text-[10.5px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            {tp(lang, "auth.freeNote")}
          </p>
        </div>
      </main>
    </div>
  );
}
