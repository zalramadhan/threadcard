import { HelpGuide } from "@/components/HelpGuide";
import { getCurrentUser } from "@/lib/server/auth";
import { LIFETIME_PRICE } from "@/lib/server/config";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const user = await getCurrentUser();
  return <HelpGuide user={user} lifetimePrice={LIFETIME_PRICE} />;
}
