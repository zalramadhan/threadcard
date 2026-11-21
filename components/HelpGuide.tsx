"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";
import type { PublicUser } from "@/lib/types";

export function HelpGuide({
  user,
  lifetimePrice,
}: {
  user: PublicUser | null;
  lifetimePrice: number;
}) {
  const { lang } = useI18n();
  const price = new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(lifetimePrice);

  const sections = [
    { title: "help.accountTitle", body: "help.accountBody" },
    { title: "help.projectTitle", body: "help.projectBody" },
    { title: "help.exportTitle", body: "help.exportBody" },
    { title: "help.upgradeTitle", body: "help.upgradeBody" },
  ] as const;

  return (
    <div className="min-h-screen">
      <Header user={user} />

      <main className="mx-auto max-w-3xl px-5 pb-16">
        <p className="label">ThreadCard</p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.03em] text-neutral-950 dark:text-neutral-50">
          {tp(lang, "help.title")}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
          {tp(lang, "help.subtitle")}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <section className="card p-4">
            <p className="label">{tp(lang, "account.free")}</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-300">
              <li>· {tp(lang, "plan.freeExport")}</li>
              <li>· {tp(lang, "plan.freeAds")}</li>
              <li>· {tp(lang, "plan.freeSlides")}</li>
            </ul>
          </section>
          <section className="card p-4">
            <p className="label text-emerald-700 dark:text-emerald-300">
              {tp(lang, "account.lifetime")}
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-300">
              <li>· {tp(lang, "plan.lifetimeExport")}</li>
              <li>· {tp(lang, "plan.lifetimeAds")}</li>
              <li>· {tp(lang, "plan.lifetimeSlides")}</li>
            </ul>
            <p className="mt-3 text-[12px] font-semibold text-neutral-900 dark:text-neutral-100">
              {tp(lang, "plan.price", { price })}
            </p>
            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
              {tp(lang, "plan.oneTime")}
            </p>
          </section>
        </div>

        <div className="mt-6 space-y-2">
          {sections.map((section) => (
            <section key={section.title} className="card p-4">
              <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
                {tp(lang, section.title)}
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                {tp(lang, section.body)}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            {tp(lang, "verify.openEditor")}
          </Link>
          {user ? (
            <a href="/orders" className="btn">
              {tp(lang, "account.orders")}
            </a>
          ) : (
            <a href="/register" className="btn">
              {tp(lang, "auth.register")}
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
