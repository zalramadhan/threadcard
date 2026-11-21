"use client";

import { Header } from "@/components/Header";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";

export function VerifyResult({
  ok,
  signedIn,
}: {
  ok: boolean;
  signedIn: boolean;
}) {
  const { lang } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[440px] text-center">
          <div
            className={`mx-auto grid h-12 w-12 place-items-center rounded-full border ${
              ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            <span className="text-[20px]">{ok ? "✓" : "!"}</span>
          </div>
          <h1 className="mt-4 text-[27px] font-semibold tracking-[-0.03em] text-neutral-950 dark:text-neutral-50">
            {tp(lang, ok ? "verify.successTitle" : "verify.invalidTitle")}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            {tp(lang, ok ? "verify.successBody" : "verify.invalidBody")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <a href={signedIn || ok ? "/" : "/login"} className="btn btn-primary">
              {tp(lang, signedIn || ok ? "verify.openEditor" : "verify.login")}
            </a>
            <a href="/help" className="btn">
              {tp(lang, "account.help")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
