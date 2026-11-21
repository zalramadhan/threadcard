import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { LIFETIME_PRICE } from "@/lib/server/config";
import {
  consumeRateLimit,
  createOrder,
  getPendingOrder,
  orderCodeExists,
} from "@/lib/server/db";
import { orderWhatsAppUrl } from "@/lib/server/order-message";
import {
  ORDER_USER_LIMIT,
  ORDER_WINDOW_MS,
  tooManyRequests,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function makeCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `TC-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    if (!(await orderCodeExists(code))) return code;
  }
  throw new Error("Gagal membuat kode order.");
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }
  if (user.plan === "lifetime") {
    return NextResponse.json({ error: "Akun ini sudah lifetime." }, { status: 400 });
  }

  const retryAfter = await consumeRateLimit(
    `order:user:${user.id}`,
    ORDER_USER_LIMIT,
    ORDER_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  let order = await getPendingOrder(user.id);
  if (!order) {
    order = await createOrder(user.id, LIFETIME_PRICE, await makeCode());
  }

  const whatsappUrl = orderWhatsAppUrl({
    email: user.email,
    code: order.code,
    amount: order.amount,
  });

  return NextResponse.json({
    order: {
      code: order.code,
      amount: order.amount,
      status: order.status,
      createdAt: order.created_at,
    },
    whatsappUrl,
  });
}
