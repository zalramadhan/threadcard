import { redirect } from "next/navigation";
import { OrderHistory } from "@/components/OrderHistory";
import { getCurrentUser } from "@/lib/server/auth";
import { listOrdersByUser } from "@/lib/server/db";
import { orderWhatsAppUrl } from "@/lib/server/order-message";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orders = (await listOrdersByUser(user.id)).map((row) => ({
    id: row.id,
    code: row.code,
    amount: row.amount,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    whatsappUrl:
      row.status === "pending"
        ? orderWhatsAppUrl({
            email: user.email,
            code: row.code,
            amount: row.amount,
          })
        : null,
  }));

  return <OrderHistory user={user} orders={orders} />;
}
