import type { UserPlan, UserRole } from "./types";

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  role: UserRole;
  plan: UserPlan;
  status: "active" | "suspended";
  createdAt: number;
  activatedAt: number | null;
  emailVerifiedAt: number | null;
  pendingCode: string | null;
  pendingSince: number | null;
  projectUpdatedAt: number | null;
};

export type AdminOrderRecord = {
  id: string;
  code: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  note: string;
  createdAt: number;
  confirmedAt: number | null;
  userEmail: string;
  userName: string;
};

export type Stats = {
  users: number;
  lifetime: number;
  free: number;
  suspended: number;
  unverified: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  revenue: number;
  projects: number;
};
