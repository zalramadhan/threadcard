import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { createMedia, deleteMedia } from "@/lib/server/db";
import {
  ASSET_TYPES,
  MAX_ASSET_BYTES,
  MEDIA_BUCKET,
  type AssetKind,
  storagePath,
} from "@/lib/server/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isKind(value: string): value is AssetKind {
  return value === "video" || value === "audio" || value === "image";
}

/**
 * Creates the media row and a short-lived signed upload URL. The browser
 * uploads the bytes straight to Supabase Storage, which keeps large files
 * away from the serverless body limit.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const kind = String(body.kind ?? "");
    const name = String(body.name ?? "").slice(0, 200);
    const mime = String(body.mime ?? "");
    const size = Number(body.size ?? 0);
    const duration = Number(body.duration ?? 0);

    if (!isKind(kind)) {
      return NextResponse.json({ error: "Jenis media tidak valid." }, { status: 400 });
    }
    const ext = ASSET_TYPES[kind][mime];
    if (!ext) {
      return NextResponse.json({ error: "Format file tidak didukung." }, { status: 415 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_ASSET_BYTES[kind]) {
      return NextResponse.json({ error: "Ukuran file melebihi batas." }, { status: 413 });
    }

    const path = storagePath(user.id, ext);
    const media = await createMedia({
      ownerId: user.id,
      kind,
      name,
      mime,
      ext,
      size,
      duration: Number.isFinite(duration) && duration > 0 ? duration : null,
      storagePath: path,
    });

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(MEDIA_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      await deleteMedia(media.id, user.id).catch(() => undefined);
      console.error("[media/sign]", error?.message);
      return NextResponse.json(
        { error: "Gagal menyiapkan upload media." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        asset: {
          id: media.id,
          url: `/api/media/${media.id}`,
          name,
          kind,
        },
        upload: {
          path: data.path,
          token: data.token,
          signedUrl: data.signedUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[media/sign]", error);
    return NextResponse.json({ error: "Gagal menyiapkan upload media." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Gunakan POST untuk mengunggah." }, { status: 405 });
}
