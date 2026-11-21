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
  for (const key of ["from", "to", "limit", "batch_size"]) {
    const val = searchParams.get(key);
    if (val) qs.set(key, val);
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return proxyNdjsonStream(
    request,
    `/api/v1/motorcycles/${encodeURIComponent(id)}/telemetry/stream${query}`,
    "Nao foi possivel iniciar o streaming de telemetria do veiculo.",
  );
}
