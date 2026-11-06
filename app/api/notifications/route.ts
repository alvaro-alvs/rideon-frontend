import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  callAuthenticatedApi,
  clearAuthCookies,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
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
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.toString();
  const endpoint = query ? `/api/v1/alerts?${query}` : "/api/v1/alerts";

  try {
    const { response, data } = await callAuthenticatedApi(
      endpoint,
      token,
      undefined,
      "GET",
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "Nao foi possivel carregar notificacoes.", error: data },
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

export async function POST(request: NextRequest) {
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
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo da requisicao invalido." }, { status: 400 });
  }

  try {
    const { response, data } = await callAuthenticatedApi(
      "/api/v1/alerts",
      token,
      body,
      "POST",
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "Falha ao criar notificacao.", error: data },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const res = NextResponse.json(data, { status: 201 });
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

