import { NextResponse } from "next/server";

import {
  applyAuthCookies,
  callAuthApi,
  callApiMe,
  getPublicError,
  getUserRole,
  hasAccessToken,
  hasRefreshToken,
  isValidCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
  }

  if (!isValidCredentials(payload)) {
    return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
  }

  try {
    const { response, data } = await callAuthApi("login", payload);

    if (!response.ok) {
      return NextResponse.json(
        { message: getPublicError(response.status) },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    if (!hasAccessToken(data)) {
      return NextResponse.json(
        { message: "Resposta invalida da API de autenticacao." },
        { status: 502 },
      );
    }

    // Per README_FRONTEND.md §4: call GET /api/v1/auth/me right after login to
    // resolve the user's role (JWT does NOT contain the role field).
    let role = "rider";
    try {
      const { response: meRes, data: meData } = await callApiMe(data.access_token);
      if (meRes.ok && meData) {
        role = getUserRole(meData);
      }
    } catch {
      // Non-fatal — default to "rider" (safe fallback for legacy accounts)
    }

    const result = NextResponse.json({ authenticated: true, role });

    applyAuthCookies(result, {
      accessToken: data.access_token,
      refreshToken: hasRefreshToken(data) ? data.refresh_token : undefined,
      role,
    });

    return result;
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}

