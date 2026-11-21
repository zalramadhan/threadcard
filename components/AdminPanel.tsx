"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { tp } from "@/lib/platform-i18n";
import type { AdminOrderRecord, AdminUserRecord, Stats } from "@/lib/admin-types";
import type { PublicUser } from "@/lib/types";

type AuditEntry = {
  id: string;
  action: string;
  targetId: string;
  detail: string;
  createdAt: number;
  adminEmail: string;
};

function formatDate(value: number | null, lang: "id" | "en") {
  if (!value) return "—";
  return new Date(value).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

type Tab = "users" | "orders" | "settings" | "system";
type Filter = "all" | "free" | "lifetime" | "unverified" | "suspended";

export function AdminPanel({
  user,
  users,
  orders,
  audit,
  stats,
  storage,
  shopeeUrl: initialShopeeUrl,
  emailConfigured,
}: {
  user: PublicUser;
  users: AdminUserRecord[];
  orders: AdminOrderRecord[];
  audit: AuditEntry[];
  stats: Stats;
  storage: { uploadsBytes: number; uploadsFiles: number; totalBytes: number };
  shopeeUrl: string;
  emailConfigured: boolean;
}) {
  const { lang } = useI18n();
  const [tab, setTab] = useState<Tab>("users");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shopee, setShopee] = useState(initialShopeeUrl);
  const [notice, setNotice] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminUserRecord[]>(users);
  const [orderRows, setOrderRows] = useState<AdminOrderRecord[]>(orders);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        needle &&
        !row.email.toLowerCase().includes(needle) &&
        !row.name.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (filter === "free") return row.plan === "free";
      if (filter === "lifetime") return row.plan === "lifetime";
      if (filter === "unverified") return !row.emailVerifiedAt;
      if (filter === "suspended") return row.status === "suspended";
      return true;
    });
  }, [filter, query, rows]);

  async function patchUser(userId: string, body: Record<string, unknown>) {
    if (busyId) return;
    setBusyId(userId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = (await res.json()) as {
        user?: { emailVerifiedAt: number | null; status: string };
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error ?? tp(lang, "admin.error"));
        return;
      }
      setRows((previous) =>
        previous.map((row) =>
          row.id === userId
            ? {
                ...row,
                emailVerifiedAt: data.user!.emailVerifiedAt,
                status: data.user!.status as "active" | "suspended",
              }
            : row,
        ),
      );
    } catch {
      setError(tp(lang, "admin.error"));
    } finally {
      setBusyId(null);
    }
  }

  async function activate(userId: string) {
    if (busyId) return;
    if (!window.confirm(tp(lang, "admin.confirmActivate"))) return;
    const note = window.prompt(tp(lang, "admin.activateNote")) ?? "";
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, note }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? tp(lang, "admin.error"));
        return;
      }
      setRows((previous) =>
        previous.map((row) =>
          row.id === userId ? { ...row, plan: "lifetime" } : row,
        ),
      );
      setOrderRows((previous) =>
        previous.map((row) =>
          row.userEmail === rows.find((item) => item.id === userId)?.email &&
          row.status === "pending"
            ? { ...row, status: "paid" }
            : row,
        ),
      );
    } catch {
      setError(tp(lang, "admin.error"));
    } finally {
      setBusyId(null);
    }
  }

  async function cancelOrder(orderId: string) {
    if (!window.confirm(tp(lang, "admin.confirmCancel"))) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "cancelled" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? tp(lang, "admin.error"));
        return;
      }
      setOrderRows((previous) =>
        previous.map((row) =>
          row.id === orderId ? { ...row, status: "cancelled" } : row,
        ),
      );
    } catch {
      setError(tp(lang, "admin.error"));
    }
  }

  async function saveShopee() {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopeeUrl: shopee }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? tp(lang, "admin.error"));
        return;
      }
      setNotice(tp(lang, "admin.saved"));
    } catch {
      setError(tp(lang, "admin.error"));
    }
  }

  const statCards = [
    { label: "admin.users", value: stats.users },
    { label: "admin.lifetime", value: stats.lifetime },
    { label: "admin.free", value: stats.free },
    { label: "admin.unverified", value: stats.unverified },
    { label: "admin.pendingOrders", value: stats.pendingOrders },
    { label: "admin.projects", value: stats.projects },
  ] as const;

  const tabs: Tab[] = ["users", "orders", "settings", "system"];

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">admin</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-neutral-950 dark:text-neutral-50">
            {tp(lang, "admin.title")}
          </h1>
          <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">
            {tp(lang, "admin.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{user.email}</span>
          <Link href="/" className="btn">
            {tp(lang, "admin.back")}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <div key={card.label} className="card p-3">
            <p className="label">{tp(lang, card.label)}</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-neutral-950 dark:text-neutral-50">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {(error || notice) && (
        <p
          className={`mt-3 text-[11.5px] ${
            error ? "alert" : "text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error ?? notice}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5 border-b border-neutral-200 pb-2 dark:border-neutral-800">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition ${
              tab === item
                ? "bg-neutral-950 text-white dark:bg-neutral-50 dark:text-neutral-950"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            {tp(lang, `admin.tab${item[0].toUpperCase()}${item.slice(1)}` as never)}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <section className="mt-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tp(lang, "admin.search")}
              className="input max-w-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "admin.filterAll"],
                  ["free", "admin.filterFree"],
                  ["lifetime", "admin.filterLifetime"],
                  ["unverified", "admin.filterUnverified"],
                  ["suspended", "admin.filterSuspended"],
                ] as const
              ).map(([value, key]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`chip ${
                    filter === value
                      ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                      : ""
                  }`}
                >
                  {tp(lang, key)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-[0.1em] text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
                  <th className="py-2 pr-3 font-semibold">{tp(lang, "admin.email")}</th>
                  <th className="py-2 pr-3 font-semibold">{tp(lang, "admin.plan")}</th>
                  <th className="py-2 pr-3 font-semibold">{tp(lang, "admin.status")}</th>
                  <th className="py-2 pr-3 font-semibold">{tp(lang, "admin.created")}</th>
                  <th className="py-2 pr-3 font-semibold">{tp(lang, "admin.project")}</th>
                  <th className="py-2 font-semibold">{tp(lang, "admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 align-top dark:border-neutral-800/60"
                  >
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {row.email}
                      </p>
                      <p className="text-[10.5px] text-neutral-400 dark:text-neutral-500">
                        {row.name || "—"} {row.whatsapp ? `· ${row.whatsapp}` : ""}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`chip ${
                          row.plan === "lifetime"
                            ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : ""
                        }`}
                      >
                        {tp(lang, row.plan === "lifetime" ? "admin.lifetime" : "admin.free")}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-neutral-600 dark:text-neutral-300">
                          {tp(lang, row.status === "active" ? "admin.active" : "admin.banned")}
                        </span>
                        <span
                          className={
                            row.emailVerifiedAt
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          }
                        >
                          {row.emailVerifiedAt
                            ? tp(lang, "verify.successTitle")
                            : tp(lang, "admin.unverified")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-500 dark:text-neutral-400">
                      {formatDate(row.createdAt, lang)}
                      {row.pendingCode && (
                        <p className="mt-1 font-mono text-[10.5px] text-amber-700 dark:text-amber-300">
                          {row.pendingCode}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-500 dark:text-neutral-400">
                      {row.projectUpdatedAt ? formatDate(row.projectUpdatedAt, lang) : "—"}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {!row.emailVerifiedAt && (
                          <button
                            type="button"
                            className="btn px-2 py-1 text-[10.5px]"
                            disabled={busyId === row.id}
                            onClick={() => void patchUser(row.id, { verifyEmail: true })}
                          >
                            {tp(lang, "admin.verify")}
                          </button>
                        )}
                        {row.plan === "free" && (
                          <button
                            type="button"
                            className="btn px-2 py-1 text-[10.5px]"
                            disabled={busyId === row.id}
                            onClick={() => void activate(row.id)}
                          >
                            {tp(lang, "admin.activate")}
                          </button>
                        )}
                        {row.status === "active" ? (
                          <button
                            type="button"
                            className="btn px-2 py-1 text-[10.5px]"
                            disabled={busyId === row.id}
                            onClick={() => {
                              if (window.confirm(tp(lang, "admin.confirmSuspend"))) {
                                void patchUser(row.id, { status: "suspended" });
                              }
                            }}
                          >
                            {tp(lang, "admin.suspend")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn px-2 py-1 text-[10.5px]"
                            disabled={busyId === row.id}
                            onClick={() => void patchUser(row.id, { status: "active" })}
                          >
                            {tp(lang, "admin.reactivate")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="mt-3 text-[12px] text-neutral-500 dark:text-neutral-400">
              {tp(lang, "admin.noUsers")}
            </p>
          )}
        </section>
      )}

      {tab === "orders" && (
        <section className="mt-4 space-y-2">
          {orderRows.length === 0 && (
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
              {tp(lang, "admin.noOrders")}
            </p>
          )}
          {orderRows.map((order) => (
            <div key={order.id} className="card flex flex-wrap items-start justify-between gap-3 p-3.5">
              <div>
                <p className="font-mono text-[12.5px] font-medium text-neutral-900 dark:text-neutral-100">
                  {order.code}
                </p>
                <p className="mt-0.5 text-[10.5px] text-neutral-500 dark:text-neutral-400">
                  {order.userEmail} · {formatDate(order.createdAt, lang)}
                </p>
                {order.note && (
                  <p className="mt-1 text-[10.5px] text-neutral-500 dark:text-neutral-400">
                    {order.note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(order.amount)}
                </span>
                <span
                  className={`chip ${
                    order.status === "paid"
                      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : order.status === "pending"
                        ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
                        : ""
                  }`}
                >
                  {tp(lang, `orders.${order.status}` as never)}
                </span>
                {order.status === "pending" && (
                  <button
                    type="button"
                    className="btn px-2 py-1 text-[10.5px]"
                    onClick={() => void cancelOrder(order.id)}
                  >
                    {tp(lang, "admin.cancel")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "settings" && (
        <section className="mt-4 max-w-xl space-y-3">
          <div className="card p-4">
            <label className="block space-y-1.5">
              <span className="label">{tp(lang, "admin.shopee")}</span>
              <input
                value={shopee}
                onChange={(event) => setShopee(event.target.value)}
                placeholder="https://shopee.co.id/…"
                className="input"
              />
              <span className="block text-[10.5px] text-neutral-500 dark:text-neutral-400">
                {tp(lang, "admin.shopeeHint")}
              </span>
            </label>
            <button type="button" onClick={() => void saveShopee()} className="btn btn-primary mt-3">
              {tp(lang, "admin.save")}
            </button>
          </div>

          <div className="card p-4">
            <p className="label">{tp(lang, "admin.email")}</p>
            <p
              className={`mt-1 text-[11.5px] ${
                emailConfigured
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {tp(lang, emailConfigured ? "admin.emailReady" : "admin.emailMissing")}
            </p>
          </div>
        </section>
      )}

      {tab === "system" && (
        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="card p-4">
            <p className="label">{tp(lang, "admin.storage")}</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatBytes(storage.totalBytes)}
            </p>
            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
              {storage.uploadsFiles} file · uploads
            </p>
          </div>

          <div className="card p-4">
            <p className="label">{tp(lang, "admin.revenue")}</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(stats.revenue)}
            </p>
            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
              {stats.paidOrders} paid · {stats.pendingOrders} pending
            </p>
          </div>

          <div className="card p-4">
            <p className="label">{tp(lang, "admin.audit")}</p>
            {audit.length === 0 ? (
              <p className="mt-1 text-[11.5px] text-neutral-500 dark:text-neutral-400">
                {tp(lang, "admin.noAudit")}
              </p>
            ) : (
              <ul className="mt-1 space-y-1 text-[10.5px] text-neutral-500 dark:text-neutral-400">
                {audit.slice(0, 6).map((entry) => (
                  <li key={entry.id}>
                    <span className="font-mono text-neutral-900 dark:text-neutral-100">
                      {entry.action}
                    </span>{" "}
                    · {entry.adminEmail} · {formatDate(entry.createdAt, lang)}
                    {entry.detail && <span className="block truncate">{entry.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
