import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { deleteMedia, getMedia } from "@/lib/server/db";
import { MEDIA_BUCKET } from "@/lib/server/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Streams a private Storage object through the app so exports stay
 * same-origin and Range requests still work for video.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const media = await getMedia(id);
  if (!media || (media.owner_id !== user.id && user.role !== "admin")) {
    return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(media.storage_path, 60 * 60);
  if (error || !data?.signedUrl) {
    console.error("[media/read]", error?.message);
    return NextResponse.json({ error: "Media tidak tersedia." }, { status: 502 });
  }

  const range = req.headers.get("range");
  const upstream = await fetch(data.signedUrl, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
  });
  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: "Media tidak tersedia." }, { status: 502 });
  }

  const headers = new Headers();
  for (const key of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("Content-Type", media.mime || upstream.headers.get("content-type") || "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const media = await getMedia(id);
  if (!media || media.owner_id !== user.id) {
    return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
  }
  if (media.pinned_by) {
    return NextResponse.json(
      { error: "Media masih dipakai project tersimpan." },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  await admin.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
  await deleteMedia(media.id, user.id);
  return NextResponse.json({ ok: true });
}
