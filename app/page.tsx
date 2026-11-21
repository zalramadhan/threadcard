import { App } from "@/components/ThreadCardApp";
import { getCurrentUser } from "@/lib/server/auth";
import { LIFETIME_PRICE } from "@/lib/server/config";
import { getProject, getSetting } from "@/lib/server/db";
import type { SavedProject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, shopeeUrl] = await Promise.all([
    getCurrentUser(),
    getSetting("shopee_url"),
  ]);
  let savedProject: { project: SavedProject; updatedAt: number } | null = null;

  if (user) {
    const row = await getProject(user.id);
    if (row) {
      const parsed = row.data;
      if (
        parsed &&
        parsed.version === 1 &&
        Array.isArray(parsed.slides) &&
        parsed.slides.length > 0
      ) {
        savedProject = { project: parsed, updatedAt: row.updated_at };
      }
    }
  }

  return (
    <App
      user={user}
      savedProject={savedProject}
      shopeeUrl={shopeeUrl ?? ""}
      lifetimePrice={LIFETIME_PRICE}
    />
  );
}
