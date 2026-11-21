import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const qs = request.nextUrl.searchParams.toString();
  return proxyAuthenticatedApi(
    request,
    `/api/v1/motorcycles/${id}/commands${qs ? `?${qs}` : ""}`,
    "GET",
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }
  return proxyAuthenticatedApi(
    request,
    `/api/v1/motorcycles/${id}/commands`,
    "POST",
    body,
  );
}
