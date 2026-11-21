import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUrl } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const poll = request.nextUrl.searchParams.get("poll") === "1";
  const apiUrl = getApiUrl();

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/public/share/${encodeURIComponent(token)}${poll ? "?poll=1" : ""}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        (data as { error?: { message?: string }; message?: string } | null)?.error?.message ||
        "Link de rastreamento inválido ou expirado.";
      return NextResponse.json({ message: msg, error: data }, { status: res.status });
    }
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Serviço temporariamente indisponível." },
      { status: 502 },
    );
  }
}
