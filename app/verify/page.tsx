import { VerifyResult } from "@/components/VerifyResult";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();
  return <VerifyResult ok={status === "success"} signedIn={Boolean(user)} />;
}
