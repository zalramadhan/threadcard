export {
  FREE_MAX_SLIDES,
  FREE_MAX_WIDTH,
  FREE_UNLOCK_SECONDS,
  PAID_MAX_SLIDES,
  PAID_WIDTH,
} from "../plan";

export const APP_NAME = "threadcard";

export const LIFETIME_PRICE = Math.max(
  0,
  Number(process.env.LIFETIME_PRICE || 49000),
);

export const WHATSAPP_NUMBER = (process.env.WHATSAPP_NUMBER || "").replace(
  /\D/g,
  "",
);

/** Emails listed in ADMIN_EMAIL are promoted to admin on sign-in. */
export function adminEmails() {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
