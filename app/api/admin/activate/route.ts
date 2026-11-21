import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin";
import { activateLifetime, getUserForAdmin, logAdminAction } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const userId = String(body.userId ?? "");
    const note = String(body.note ?? "").trim().slice(0, 500);
    if (!(await getUserForAdmin(userId))) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }
    const user = await activateLifetime(userId, admin.id, note);
    await logAdminAction({
      adminId: admin.id,
      action: "user.activate_lifetime",
      targetId: userId,
      detail: note,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[admin/activate]", error);
    return NextResponse.json({ error: "Gagal mengaktifkan user." }, { status: 500 });
  }
}
