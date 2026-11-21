import { getCurrentUser } from "./auth";

export async function getAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
