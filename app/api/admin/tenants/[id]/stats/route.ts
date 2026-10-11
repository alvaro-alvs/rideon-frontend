import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUrl, SESSION_COOKIE } from "@/lib/auth";

/**
 * GET /api/admin/tenants/[id]/stats
 * Returns tenant device usage count, max quota, percentage and module states.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sessão expirada ou não autenticada." },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "ID do tenant é obrigatório." },
      { status: 400 },
    );
  }

  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/v1/admin/tenants/${id}/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.error?.message || "Erro ao consultar estatísticas do tenant." },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: "Falha de conexão com a API Go.", error: String(err) },
      { status: 502 },
    );
  }
}
