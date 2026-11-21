import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAuthenticatedApi(request, `/api/v1/geofences/${id}`, "GET");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }
  return proxyAuthenticatedApi(request, `/api/v1/geofences/${id}`, "PATCH", body);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAuthenticatedApi(request, `/api/v1/geofences/${id}`, "DELETE");
}
