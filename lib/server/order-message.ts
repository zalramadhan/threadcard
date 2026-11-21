import { APP_NAME, WHATSAPP_NUMBER } from "./config";

export function orderWhatsAppUrl(input: {
  email: string;
  code: string;
  amount: number;
}) {
  if (!WHATSAPP_NUMBER) return null;

  const price = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(input.amount);

  const message = [
    `Halo admin ${APP_NAME}, saya mau beli akses lifetime.`,
    `Email: ${input.email}`,
    `Kode order: ${input.code}`,
    `Harga: ${price}`,
    "Saya akan kirim bukti pembayaran di chat ini.",
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
