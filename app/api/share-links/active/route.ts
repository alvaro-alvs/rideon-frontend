import type { NextRequest } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedApi(request, "/api/v1/share-links/active", "GET");
}
