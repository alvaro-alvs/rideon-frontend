import type { NextRequest } from "next/server";
import { proxyAuthenticatedApi } from "@/lib/bff-proxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAuthenticatedApi(request, `/api/v1/share-links/${id}`, "DELETE");
}
