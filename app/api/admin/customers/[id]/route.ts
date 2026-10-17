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
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;
  const token = session.token;
  const apiUrl = getApiUrl();

  try {
    const payload = await request.json();
    const res = await fetch(`${apiUrl}/api/v1/customers/${id}/manager`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        body || { message: "Falha ao vincular gestor ao cliente." },
        { status: res.status },
      );
    }

    const response = NextResponse.json(body, { status: 200 });
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
