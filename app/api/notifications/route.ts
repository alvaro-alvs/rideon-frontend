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

    // Filter out non-actionable hardware diagnostics, raw code 0x00 and heartbeats
    if (data && Array.isArray((data as { data?: unknown[] }).data)) {
      const payload = data as { data: Array<{ type?: string; message?: string }>; total?: number };
      payload.data = payload.data.filter((item) => {
        if (!item || !item.type) return false;
        if (
          item.type === "unknown_hardware_alarm" ||
          item.type === "unknown" ||
          item.type === "heartbeat" ||
          item.type === "heartbeat_2" ||
          item.type === "normal"
        ) {
          return false;
        }
        const msg = (item.message || "").toLowerCase();
        if (
          msg.includes("código 0x00") ||
          msg.includes("code 0x00") ||
          msg.includes("firmware variant") ||
          msg.includes("heartbeat")
        ) {
          return false;
        }
        return true;
      });
      if (typeof payload.total === "number") {
        payload.total = payload.data.length;
      }
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

