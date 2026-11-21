import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
