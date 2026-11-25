import type { NextRequest } from "next/server";
import { signOutAdmin } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  return signOutAdmin(request);
}
