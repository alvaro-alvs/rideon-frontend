import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  clearAuthCookies,
  getApiUrl,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ riderId: string }> },
) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const { riderId } = await context.params;
  const apiUrl = getApiUrl();

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/admin/financial/customers/${encodeURIComponent(riderId)}/invoices`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        body || { message: "Falha ao listar cobranças do cliente." },
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

