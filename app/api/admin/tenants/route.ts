import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyAuthCookies,
  clearAuthCookies,
  getApiUrl,
  getSessionOrRefresh,
} from "@/lib/auth";

/**
 * GET /api/admin/tenants
 * Lists all white-label tenants in the platform.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sessão expirada ou não autenticada.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const token = session.token;
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

    const response = NextResponse.json(data);
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(response, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }
    return response;
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
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sessão expirada ou não autenticada.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const token = session.token;
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

    const response = NextResponse.json(data, { status: 201 });
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(response, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }
    return response;
  } catch (err) {
    return NextResponse.json(
      { message: "Falha de conexão ao cadastrar parceiro.", error: String(err) },
      { status: 502 },
    );
  }
}
