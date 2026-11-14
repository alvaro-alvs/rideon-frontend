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
  const qs = request.nextUrl.searchParams.toString();
  const target = qs
    ? `${apiUrl}/api/v1/devices/audits?${qs}`
    : `${apiUrl}/api/v1/devices/audits`;

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        body || { message: "Falha ao carregar auditoria de equipamentos." },
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
  } catch (err) {
    return NextResponse.json(
      { message: "Erro de conexão com o servidor.", error: String(err) },
      { status: 502 },
    );
  }
}

