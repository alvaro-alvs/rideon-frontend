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
  context: { params: Promise<{ id: string }> },
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

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/v1/devices/${id}/transfer`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ manager_id: body.manager_id ?? null }),
      cache: "no-store",
    });

    const resBody = await res.json().catch(() => null);
    if (!res.ok) {
      let msg = "Não foi possível transferir o equipamento.";
      if (resBody && typeof resBody === "object") {
        const obj = resBody as Record<string, unknown>;
        if (obj.error && typeof obj.error === "object" && "message" in (obj.error as object)) {
          msg = String((obj.error as Record<string, unknown>).message);
        } else if ("message" in obj) {
          msg = String(obj.message);
        }
      }
      return NextResponse.json({ message: msg }, { status: res.status });
    }

    const response = NextResponse.json(resBody);
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

