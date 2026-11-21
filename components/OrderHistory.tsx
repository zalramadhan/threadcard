"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";
import type { PublicUser, UserOrder } from "@/lib/types";

function formatDate(value: number, lang: "en" | "id") {
  return new Date(value).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function OrderHistory({
  user,
  orders,
}: {
  user: PublicUser;
  orders: UserOrder[];
}) {
  const { lang } = useI18n();
  const currency = new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

  return (
    <div className="min-h-screen">
      <Header user={user} />

      <main className="mx-auto max-w-3xl px-5 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">account</p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-neutral-950 dark:text-neutral-50">
              {tp(lang, "orders.title")}
            </h1>
            <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">
              {tp(lang, "orders.subtitle")}
            </p>
          </div>
          <Link href="/" className="btn">
            {tp(lang, "orders.back")}
          </Link>
        </div>

        <div className="mt-5 space-y-2">
          {orders.length === 0 && (
            <div className="card p-4">
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                {tp(lang, "orders.empty")}
              </p>
              <p className="mt-1 text-[11.5px] text-neutral-500 dark:text-neutral-400">
                {tp(lang, "orders.emptyHint")}
              </p>
            </div>
          )}

          {orders.map((order) => {
            const statusKey =
              order.status === "paid"
                ? "orders.paid"
                : order.status === "cancelled"
                  ? "orders.cancelled"
                  : "orders.pending";
            const statusClass =
              order.status === "paid"
                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : order.status === "pending"
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
                  : "";

            return (
              <section key={order.id} className="card p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="label">{tp(lang, "orders.code")}</p>
                    <p className="mt-0.5 font-mono text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      {order.code}
                    </p>
                  </div>
                  <span className={`chip ${statusClass}`}>{tp(lang, statusKey)}</span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-[11.5px]">
                  <div>
                    <dt className="label">{tp(lang, "orders.amount")}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                      {currency.format(order.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label">{tp(lang, "orders.created")}</dt>
                    <dd className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                      {formatDate(order.createdAt, lang)}
                    </dd>
                  </div>
                </dl>

                {order.confirmedAt && (
                  <p className="mt-2 text-[10.5px] text-neutral-500 dark:text-neutral-400">
                    {tp(lang, "orders.confirmed")} · {formatDate(order.confirmedAt, lang)}
                  </p>
                )}

                {order.note && (
                  <p className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[11px] leading-relaxed text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                    {tp(lang, "orders.note")}: {order.note}
                  </p>
                )}

                {order.status === "pending" && order.whatsappUrl && (
                  <a
                    href={order.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary mt-3 w-full sm:w-auto"
                  >
                    {tp(lang, "orders.pay")}
                  </a>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
