import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin";
import {
  findUserById,
  getAdminUsers,
  logAdminAction,
  markEmailVerified,
  setUserStatus,
  type AdminUserRow,
} from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapUser(row: AdminUserRow) {
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
    emailVerifiedAt: row.email_verified_at,
    pendingCode: row.pending_code,
    pendingSince: row.pending_created_at,
    projectUpdatedAt: row.project_updated_at,
  };
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });
  }

  return NextResponse.json(
    { users: (await getAdminUsers()).map(mapUser) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(req: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const userId = String(body.userId ?? "");
    const target = await findUserById(userId);
    if (!target) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }
    if (userId === admin.id && body.status === "suspended") {
      return NextResponse.json(
        { error: "Tidak bisa menonaktifkan akun sendiri." },
        { status: 400 },
      );
    }

    if (body.verifyEmail === true) {
      const user = await markEmailVerified(userId);
      await logAdminAction({
        adminId: admin.id,
        action: "user.verify_email",
        targetId: userId,
      });
      return NextResponse.json({ user });
    }

    const status = String(body.status ?? "");
    if (status !== "active" && status !== "suspended") {
      return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    }
    const user = await setUserStatus(userId, status);
    await logAdminAction({
      adminId: admin.id,
      action: status === "suspended" ? "user.suspend" : "user.reactivate",
      targetId: userId,
      detail: target.user.email,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[admin/users]", error);
    return NextResponse.json({ error: "Gagal memperbarui user." }, { status: 500 });
  }
}
