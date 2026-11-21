import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin";
import { cancelOrder, listAdminOrders, logAdminAction } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });
  }
  return NextResponse.json(
    { orders: await listAdminOrders() },
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
    const orderId = String(body.orderId ?? "");
    const status = String(body.status ?? "");
    if (!orderId || status !== "cancelled") {
      return NextResponse.json({ error: "Aksi order tidak valid." }, { status: 400 });
    }

    const note = String(body.note ?? "").trim().slice(0, 500);
    if (!(await cancelOrder(orderId, admin.id, note))) {
      return NextResponse.json(
        { error: "Order tidak ditemukan atau sudah selesai." },
        { status: 404 },
      );
    }
    await logAdminAction({
      adminId: admin.id,
      action: "order.cancel",
      targetId: orderId,
      detail: note,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/orders]", error);
    return NextResponse.json({ error: "Gagal memperbarui order." }, { status: 500 });
  }
}
