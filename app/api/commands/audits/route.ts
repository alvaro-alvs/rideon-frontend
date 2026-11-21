import type { NextRequest } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString();
  return proxyAuthenticatedApi(
    request,
    `/api/v1/commands/audits${qs ? `?${qs}` : ""}`,
    "GET",
  );
}
