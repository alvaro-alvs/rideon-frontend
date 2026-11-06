import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  callAuthenticatedApi,
  clearAuthCookies,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const token = session.token;

  try {
    const { response, data } = await callAuthenticatedApi(
      "/api/v1/alerts/read-all",
      token,
      undefined,
      "PATCH",
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "Nao foi possivel marcar todas as notificacoes como lidas." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const res = NextResponse.json(data);
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(res, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }
    return res;
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}

