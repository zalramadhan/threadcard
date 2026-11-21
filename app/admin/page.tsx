import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { getCurrentUser } from "@/lib/server/auth";
import {
  getAdminStats,
  getAdminUsers,
  getSetting,
  listAdminAudit,
  listAdminOrders,
  storageUsage,
} from "@/lib/server/db";
import { supabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const [rows, orders, audit, stats, storage, shopeeUrl] = await Promise.all([
    getAdminUsers(),
    listAdminOrders(),
    listAdminAudit(20),
    getAdminStats(),
    storageUsage(),
    getSetting("shopee_url"),
  ]);

  const users = rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    whatsapp: row.whatsapp,
    role: row.role,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    emailVerifiedAt: row.email_verified_at,
    pendingCode: row.pending_code,
    pendingSince: row.pending_created_at,
    projectUpdatedAt: row.project_updated_at,
  }));

  return (
    <AdminPanel
      user={user}
      users={users}
      orders={orders}
      audit={audit}
      stats={stats}
      storage={storage}
      shopeeUrl={shopeeUrl ?? ""}
      emailConfigured={supabaseConfigured()}
    />
  );
}
