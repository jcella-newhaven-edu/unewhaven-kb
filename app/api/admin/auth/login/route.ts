import { startAdminSignIn } from "@/lib/admin/auth";

export async function GET() {
  return startAdminSignIn();
}
