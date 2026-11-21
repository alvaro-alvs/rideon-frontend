import type { NextRequest } from "next/server";

import { proxyNdjsonStream } from "@/lib/stream-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const batchSize = searchParams.get("batch_size");
  if (batchSize) qs.set("batch_size", batchSize);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return proxyNdjsonStream(
    request,
    `/api/v1/trips/${encodeURIComponent(id)}/stream${query}`,
    "Nao foi possivel iniciar o streaming de coordenadas do trajeto.",
  );
}
