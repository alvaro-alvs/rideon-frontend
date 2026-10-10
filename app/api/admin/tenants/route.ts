import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUrl, SESSION_COOKIE } from "@/lib/auth";

/**
 * GET /api/admin/tenants
 * Lists all white-label tenants in the platform.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sessão expirada ou não autenticada." },
      { status: 401 },
    );
  }

  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/v1/admin/tenants`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.error?.message || "Erro ao listar tenants." },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: "Falha de conexão com a API de tenants.", error: String(err) },
      { status: 502 },
    );
  }
}

/**
 * POST /api/admin/tenants
 * Creates a new partner white-label tenant.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sessão expirada ou não autenticada." },
      { status: 401 },
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

    const res = await fetch(`${apiUrl}/api/v1/admin/tenants`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.error?.message || "Erro ao criar tenant." },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: "Falha de conexão ao cadastrar parceiro.", error: String(err) },
      { status: 502 },
    );
  }
}
