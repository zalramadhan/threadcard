import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin";
import { getSetting, logAdminAction, setSetting } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });
  }
  return NextResponse.json({
    settings: { shopeeUrl: (await getSetting("shopee_url")) ?? "" },
  });
}

export async function PATCH(req: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const raw = String(body.shopeeUrl ?? "").trim();
    let shopeeUrl = "";
    if (raw) {
      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        return NextResponse.json({ error: "Link Shopee tidak valid." }, { status: 400 });
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json({ error: "Link harus http atau https." }, { status: 400 });
      }
      if (raw.length > 500) {
        return NextResponse.json({ error: "Link terlalu panjang." }, { status: 400 });
      }
      shopeeUrl = parsed.toString();
    }

    await setSetting("shopee_url", shopeeUrl, admin.id);
    await logAdminAction({
      adminId: admin.id,
      action: "settings.shopee",
      detail: shopeeUrl || "cleared",
    });
    return NextResponse.json({ settings: { shopeeUrl } });
  } catch (error) {
    console.error("[admin/settings]", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}
