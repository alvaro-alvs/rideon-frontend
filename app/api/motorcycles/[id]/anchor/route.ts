import type { NextRequest } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return proxyAuthenticatedApi(
    request,
    `/api/v1/motorcycles/${id}/anchor`,
    "POST",
    body,
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAuthenticatedApi(
    request,
    `/api/v1/motorcycles/${id}/anchor`,
    "DELETE",
  );
}
