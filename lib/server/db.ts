import type { User } from "@supabase/supabase-js";
import { adminEmails } from "./config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicUser, SavedProject, UserPlan, UserRole } from "@/lib/types";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  role: UserRole;
  plan: UserPlan;
  status: "active" | "suspended";
  created_at: number;
  activated_at: number | null;
  email_verified_at: number | null;
};

export type OrderRow = {
  id: string;
  code: string;
  user_id: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  note: string;
  created_at: number;
  confirmed_at: number | null;
  confirmed_by: string | null;
};

export type ProjectRow = {
  user_id: string;
  data: SavedProject;
  created_at: number;
  updated_at: number;
};

export type MediaRow = {
  id: string;
  owner_id: string;
  kind: "video" | "audio" | "image";
  name: string;
  mime: string;
  ext: string;
  size: number;
  duration: number | null;
  storage_path: string;
  pinned_by: string | null;
  created_at: number;
};

function fail(scope: string, error: unknown): never {
  console.error(`[db:${scope}]`, error);
  throw error instanceof Error ? error : new Error(String(error));
}

function publicUser(row: ProfileRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    whatsapp: row.whatsapp,
    role: row.role,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    emailVerifiedAt: row.email_verified_at ?? null,
  };
}

/**
 * Makes sure an auth user has a profile row and keeps the admin flag and
 * verified timestamp in sync. Returns null for suspended accounts, which are
 * treated as signed out everywhere.
 */
export async function ensureProfile(user: User): Promise<PublicUser | null> {
  if (!user.email) return null;
  const admin = createAdminClient();
  const email = user.email.toLowerCase();

  const { data: found, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) fail("ensureProfile/select", error);

  let row = found as ProfileRow | null;
  if (!row) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { data: inserted, error: insertError } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        email,
        name: String(metadata.name ?? "").slice(0, 80),
        whatsapp: String(metadata.whatsapp ?? "").slice(0, 40),
        role: adminEmails().includes(email) ? "admin" : "user",
        created_at: Date.now(),
      })
      .select("*")
      .single();
    if (insertError) fail("ensureProfile/insert", insertError);
    row = inserted as ProfileRow;
  }

  const patch: Partial<ProfileRow> = {};
  if (adminEmails().includes(email) && row.role !== "admin") {
    patch.role = "admin";
  }
  const confirmedAt = user.email_confirmed_at
    ? Date.parse(user.email_confirmed_at)
    : null;
  if (confirmedAt && row.email_verified_at !== confirmedAt) {
    patch.email_verified_at = confirmedAt;
  }
  if (Object.keys(patch).length > 0) {
    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("*")
      .single();
    if (updateError) fail("ensureProfile/update", updateError);
    row = updated as ProfileRow;
  }

  if (row.status !== "active") return null;
  return publicUser(row);
}

export async function findUserByEmail(email: string) {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) fail("findUserByEmail", error);
  const row = data as ProfileRow | null;
  return row ? { row, user: publicUser(row) } : null;
}

export async function findUserById(id: string) {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("findUserById", error);
  const row = data as ProfileRow | null;
  return row ? { row, user: publicUser(row) } : null;
}

export async function getUserForAdmin(id: string) {
  return (await findUserById(id))?.user ?? null;
}

export async function markEmailVerified(userId: string) {
  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (authError) {
    // Already confirmed accounts surface an error; the profile below still
    // records the verification so the UI stays accurate.
    console.warn("[db:markEmailVerified/auth]", authError.message);
  }
  const { data, error } = await admin
    .from("profiles")
    .update({ email_verified_at: Date.now() })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) fail("markEmailVerified", error);
  return publicUser(data as ProfileRow);
}

export async function getPendingOrder(userId: string) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("getPendingOrder", error);
  return (data as OrderRow | null) ?? undefined;
}

export async function listOrdersByUser(userId: string) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) fail("listOrdersByUser", error);
  return (data ?? []) as OrderRow[];
}

export async function createOrder(userId: string, amount: number, code: string) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .insert({ user_id: userId, amount, code, status: "pending", created_at: Date.now() })
    .select("*")
    .single();
  if (error) fail("createOrder", error);
  return data as OrderRow;
}

export async function orderCodeExists(code: string) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (error) fail("orderCodeExists", error);
  return Boolean(data);
}

export async function activateLifetime(
  userId: string,
  adminId: string,
  note = "",
) {
  const admin = createAdminClient();
  const now = Date.now();
  const { data, error } = await admin
    .from("profiles")
    .update({ plan: "lifetime", activated_at: now, activated_by: adminId })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) fail("activateLifetime", error);

  const { error: orderError } = await admin
    .from("orders")
    .update({
      status: "paid",
      note,
      confirmed_at: now,
      confirmed_by: adminId,
    })
    .eq("user_id", userId)
    .eq("status", "pending");
  if (orderError) fail("activateLifetime/orders", orderError);

  return publicUser(data as ProfileRow);
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  });
  if (error) {
    // A broken limiter must not take the whole app down.
    console.error("[db:consumeRateLimit]", error);
    return 0;
  }
  return Number(data ?? 0);
}

export async function clearRateLimit(key: string) {
  const { error } = await createAdminClient()
    .from("rate_limits")
    .delete()
    .eq("key", key);
  if (error) console.error("[db:clearRateLimit]", error);
}

export async function getProject(userId: string) {
  const { data, error } = await createAdminClient()
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail("getProject", error);
  return (data as ProjectRow | null) ?? undefined;
}

export async function saveProject(userId: string, project: SavedProject) {
  const admin = createAdminClient();
  const now = Date.now();
  const { error } = await admin.from("projects").upsert(
    {
      user_id: userId,
      data: project,
      created_at: (await getProject(userId))?.created_at ?? now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) fail("saveProject", error);
  return now;
}

export async function getSetting(key: string) {
  const { data, error } = await createAdminClient()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) fail("getSetting", error);
  return (data as { value: string } | null)?.value ?? null;
}

export async function setSetting(key: string, value: string, adminId: string) {
  const { error } = await createAdminClient().from("settings").upsert(
    { key, value, updated_at: Date.now(), updated_by: adminId },
    { onConflict: "key" },
  );
  if (error) fail("setSetting", error);
}

export async function logAdminAction(input: {
  adminId: string;
  action: string;
  targetId?: string;
  detail?: string;
}) {
  const { error } = await createAdminClient().from("admin_audit").insert({
    admin_id: input.adminId,
    action: input.action,
    target_id: input.targetId ?? "",
    detail: input.detail ?? "",
    created_at: Date.now(),
  });
  if (error) console.error("[db:logAdminAction]", error);
}

export async function setUserStatus(
  userId: string,
  status: "active" | "suspended",
) {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ status })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) fail("setUserStatus", error);
  return publicUser(data as ProfileRow);
}

export async function cancelOrder(
  orderId: string,
  adminId: string,
  note = "",
) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .update({
      status: "cancelled",
      note,
      confirmed_at: Date.now(),
      confirmed_by: adminId,
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id");
  if (error) fail("cancelOrder", error);
  return (data ?? []).length > 0;
}

export type AdminStats = {
  users: number;
  lifetime: number;
  free: number;
  suspended: number;
  unverified: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  revenue: number;
  projects: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await createAdminClient().rpc("admin_stats");
  if (error) fail("getAdminStats", error);
  const value = (data ?? {}) as Partial<AdminStats>;
  return {
    users: Number(value.users ?? 0),
    lifetime: Number(value.lifetime ?? 0),
    free: Number(value.free ?? 0),
    suspended: Number(value.suspended ?? 0),
    unverified: Number(value.unverified ?? 0),
    pendingOrders: Number(value.pendingOrders ?? 0),
    paidOrders: Number(value.paidOrders ?? 0),
    cancelledOrders: Number(value.cancelledOrders ?? 0),
    revenue: Number(value.revenue ?? 0),
    projects: Number(value.projects ?? 0),
  };
}

export type AdminOrder = {
  id: string;
  code: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  note: string;
  createdAt: number;
  confirmedAt: number | null;
  userEmail: string;
  userName: string;
};

type AdminOrderQueryRow = {
  id: string;
  code: string;
  amount: number;
  status: AdminOrder["status"];
  note: string;
  created_at: number;
  confirmed_at: number | null;
  profiles: { email: string; name: string } | { email: string; name: string }[] | null;
};

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select(
      "id, code, amount, status, note, created_at, confirmed_at, profiles(email, name)",
    )
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) fail("listAdminOrders", error);

  return ((data ?? []) as unknown as AdminOrderQueryRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      code: row.code,
      amount: row.amount,
      status: row.status,
      note: row.note,
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at,
      userEmail: profile?.email ?? "—",
      userName: profile?.name ?? "",
    };
  });
}

export type AdminAudit = {
  id: string;
  action: string;
  targetId: string;
  detail: string;
  createdAt: number;
  adminEmail: string;
};

type AdminAuditQueryRow = {
  id: string;
  admin_id: string;
  action: string;
  target_id: string;
  detail: string;
  created_at: number;
};

export async function listAdminAudit(limit = 20): Promise<AdminAudit[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_audit")
    .select("id, admin_id, action, target_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("listAdminAudit", error);

  const rows = (data ?? []) as AdminAuditQueryRow[];
  // admin_id is intentionally not a foreign key (logs survive user deletion),
  // so resolve emails with a second lookup instead of an embedded select.
  const ids = [...new Set(rows.map((row) => row.admin_id).filter(Boolean))];
  let emails = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", ids);
    if (profileError) fail("listAdminAudit/profiles", profileError);
    emails = new Map(
      (profiles ?? []).map((profile: { id: string; email: string }) => [
        profile.id,
        profile.email,
      ]),
    );
  }

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    targetId: row.target_id,
    detail: row.detail,
    createdAt: row.created_at,
    adminEmail: emails.get(row.admin_id) ?? "—",
  }));
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  role: UserRole;
  plan: UserPlan;
  status: "active" | "suspended";
  created_at: number;
  activated_at: number | null;
  email_verified_at: number | null;
  pending_code: string | null;
  pending_created_at: number | null;
  project_updated_at: number | null;
};

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await createAdminClient().rpc("admin_users");
  if (error) fail("getAdminUsers", error);
  return (data ?? []) as AdminUserRow[];
}

export async function createMedia(input: {
  id?: string;
  ownerId: string;
  kind: MediaRow["kind"];
  name: string;
  mime: string;
  ext: string;
  size: number;
  duration?: number | null;
  storagePath: string;
}) {
  const { data, error } = await createAdminClient()
    .from("media")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      owner_id: input.ownerId,
      kind: input.kind,
      name: input.name,
      mime: input.mime,
      ext: input.ext,
      size: input.size,
      duration: input.duration ?? null,
      storage_path: input.storagePath,
      created_at: Date.now(),
    })
    .select("*")
    .single();
  if (error) fail("createMedia", error);
  return data as MediaRow;
}

export async function getMedia(id: string) {
  const { data, error } = await createAdminClient()
    .from("media")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("getMedia", error);
  return (data as MediaRow | null) ?? null;
}

export async function deleteMedia(id: string, ownerId: string) {
  const { error } = await createAdminClient()
    .from("media")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId);
  if (error) fail("deleteMedia", error);
}

export async function setMediaPinned(
  id: string,
  userId: string,
  pinned: boolean,
) {
  const { data, error } = await createAdminClient()
    .from("media")
    .update({ pinned_by: pinned ? userId : null })
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error) fail("setMediaPinned", error);
  return Boolean(data);
}

export async function storageUsage() {
  const { data, error } = await createAdminClient().rpc("storage_usage");
  if (error) fail("storageUsage", error);
  const value = (data ?? {}) as { uploadsBytes?: number; uploadsFiles?: number };
  const bytes = Number(value.uploadsBytes ?? 0);
  return {
    uploadsBytes: bytes,
    uploadsFiles: Number(value.uploadsFiles ?? 0),
    totalBytes: bytes,
  };
}
