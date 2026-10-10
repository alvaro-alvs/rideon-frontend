import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUrl, SESSION_COOKIE } from "@/lib/auth";

/**
 * PATCH /api/admin/tenants/[id]/branding
 * Updates white-label branding tokens for a tenant.
 */
export async function PATCH(
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
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { message: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    const res = await fetch(`${apiUrl}/api/v1/admin/tenants/${id}/branding`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.error?.message || "Erro ao atualizar branding do tenant." },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: "Falha de conexão ao salvar branding.", error: String(err) },
      { status: 502 },
    );
  }
}
