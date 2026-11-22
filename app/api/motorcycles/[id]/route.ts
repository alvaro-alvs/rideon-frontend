import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  callAuthenticatedApi,
  clearAuthCookies,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  if (typeof body.nickname === "string") payload.nickname = body.nickname;
  if (typeof body.color === "string") payload.color = body.color;
  if (typeof body.license_plate === "string") payload.license_plate = body.license_plate;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Nenhum campo valido para atualizar." },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    const { response, data } = await callAuthenticatedApi(
      `/api/v1/motorcycles/${encodeURIComponent(id)}`,
      session.token,
      payload,
      "PATCH",
    );

    if (!response.ok) {
      const errorObj = (data as { error?: { message?: string }; message?: string } | null);
      const message =
        errorObj?.error?.message ||
        errorObj?.message ||
        "Nao foi possivel atualizar o veiculo.";
      return NextResponse.json(
        { message },
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
