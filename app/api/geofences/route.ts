import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString();
  return proxyAuthenticatedApi(
    request,
    `/api/v1/geofences${qs ? `?${qs}` : ""}`,
    "GET",
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }
  return proxyAuthenticatedApi(request, "/api/v1/geofences", "POST", body);
}
