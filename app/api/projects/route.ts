import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getProject, getMedia, saveProject, setMediaPinned } from "@/lib/server/db";
import { PAID_MAX_SLIDES } from "@/lib/server/config";
import type { SavedProject } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function projectAssetIds(project: SavedProject) {
  const ids = new Set<string>();
  if (project.backgroundVideo?.assetId) ids.add(project.backgroundVideo.assetId);
  if (project.backgroundAudio?.assetId) ids.add(project.backgroundAudio.assetId);
  return ids;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { project?: SavedProject };
    const project = body.project;

    if (
      !project ||
      project.version !== 1 ||
      !Array.isArray(project.slides) ||
      project.slides.length === 0 ||
      project.slides.length > PAID_MAX_SLIDES ||
      !project.settings
    ) {
      return NextResponse.json({ error: "Project tidak valid." }, { status: 400 });
    }

    if (JSON.stringify(project).length > 4_000_000) {
      return NextResponse.json({ error: "Project terlalu besar." }, { status: 413 });
    }

    const ids = projectAssetIds(project);
    for (const id of ids) {
      const media = await getMedia(id);
      if (!media || media.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Salah satu media project sudah tidak tersedia. Upload ulang." },
          { status: 409 },
        );
      }
    }

    const previous = await getProject(user.id);
    const previousIds = previous ? projectAssetIds(previous.data) : new Set<string>();

    for (const id of ids) {
      if (!(await setMediaPinned(id, user.id, true))) {
        return NextResponse.json(
          { error: "Salah satu media project tidak bisa disimpan." },
          { status: 409 },
        );
      }
    }

    const updatedAt = await saveProject(user.id, project);

    for (const id of previousIds) {
      if (!ids.has(id)) await setMediaPinned(id, user.id, false);
    }

    return NextResponse.json({ updatedAt });
  } catch (error) {
    console.error("[projects/save]", error);
    return NextResponse.json({ error: "Gagal menyimpan project." }, { status: 500 });
  }
}
