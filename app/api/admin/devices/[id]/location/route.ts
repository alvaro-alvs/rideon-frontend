import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getApiUrl, getSessionOrRefresh, clearAuthCookies, applyAuthCookies } from "@/lib/auth";

/**
 * GET /api/admin/devices/[id]/location
 *
 * Busca a última localização/telemetria gravada para o dispositivo pelo ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada." },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "Identificador do dispositivo não informado." },
      { status: 400 },
    );
  }

  const apiUrl = getApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/v1/devices/${id}/location`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
    });

    const resBody = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      return NextResponse.json(
        resBody || { message: "Localização do dispositivo não encontrada." },
        { status: response.status },
      );
    }

    const res = NextResponse.json(resBody);
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(res, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }
    return res;
  } catch {
    return NextResponse.json(
      { message: "Erro de conexão ao buscar localização do dispositivo." },
      { status: 502 },
    );
  }
}
