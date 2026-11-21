import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  callAuthenticatedApi,
  clearAuthCookies,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function proxyAuthenticatedApi(
  request: NextRequest,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>,
) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessão expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  try {
    const { response, data } = await callAuthenticatedApi(
      endpoint,
      session.token,
      body,
      method,
    );

    if (!response.ok) {
      const errObj = data as { error?: { message?: string; code?: string }; message?: string } | null;
      const message = errObj?.error?.message || errObj?.message || "Erro ao comunicar com o servidor.";
      const code = errObj?.error?.code;
      return NextResponse.json(
        { message, code, error: data },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const res = NextResponse.json(data, { status: response.status });
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(res, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }
    return res;
  } catch {
    return NextResponse.json(
      { message: "Não foi possível conectar ao servidor." },
      { status: 502 },
    );
  }
}
