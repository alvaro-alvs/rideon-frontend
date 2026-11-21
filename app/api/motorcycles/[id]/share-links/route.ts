import type { NextRequest } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAuthenticatedApi(
    request,
    `/api/v1/motorcycles/${id}/share-links`,
    "GET",
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return proxyAuthenticatedApi(
    request,
    `/api/v1/motorcycles/${id}/share-links`,
    "POST",
    body,
  );
}
