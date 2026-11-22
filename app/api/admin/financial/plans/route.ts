import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  clearAuthCookies,
  getApiUrl,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const apiUrl = getApiUrl();
  const searchParams = request.nextUrl.searchParams.toString();
  const url = searchParams
    ? `${apiUrl}/api/v1/admin/financial/plans?${searchParams}`
    : `${apiUrl}/api/v1/admin/financial/plans`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        body || { message: "Falha ao carregar templates de planos." },
        { status: res.status },
      );
    }

    const response = NextResponse.json(body);
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(response, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Erro de conexão com o servidor.", error: String(error) },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const payload = await request.json().catch(() => ({}));
  const apiUrl = getApiUrl();

  try {
    const res = await fetch(`${apiUrl}/api/v1/admin/financial/plans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        body || { message: "Falha ao criar template de plano." },
        { status: res.status },
      );
    }

    const response = NextResponse.json(body, { status: res.status });
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(response, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Erro de conexão com o servidor.", error: String(error) },
      { status: 502 },
    );
  }
}
