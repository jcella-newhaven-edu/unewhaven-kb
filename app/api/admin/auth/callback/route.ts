import type { NextRequest } from "next/server";
import { finishAdminSignIn } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  return finishAdminSignIn(request);
}
