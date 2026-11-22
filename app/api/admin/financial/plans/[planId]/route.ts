import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  clearAuthCookies,
  getApiUrl,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ planId: string }> },
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

  const { planId } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const apiUrl = getApiUrl();

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/admin/financial/plans/${encodeURIComponent(planId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        body || { message: "Falha ao atualizar template de plano." },
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ planId: string }> },
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

  const { planId } = await context.params;
  const apiUrl = getApiUrl();

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/admin/financial/plans/${encodeURIComponent(planId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        body || { message: "Falha ao excluir template de plano." },
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
