import { NextResponse } from "next/server";

import {
  callAuthApi,
  callApiMe,
  getPublicError,
  getUserRole,
  hasAccessToken,
  hasRefreshToken,
  isValidCredentials,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  ROLE_COOKIE,
  ROLE_MAX_AGE,
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

    const cookieDefaults = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    const result = NextResponse.json({ authenticated: true, role });

    result.cookies.set({ name: SESSION_COOKIE, value: data.access_token, maxAge: SESSION_MAX_AGE, ...cookieDefaults });

    if (hasRefreshToken(data)) {
      result.cookies.set({ name: REFRESH_COOKIE, value: data.refresh_token, maxAge: REFRESH_MAX_AGE, ...cookieDefaults });
    }

    // Store role in an HttpOnly cookie so proxy.ts can enforce route-level RBAC
    // without making outbound API calls (proxy runs in Edge-compatible context).
    result.cookies.set({ name: ROLE_COOKIE, value: role, maxAge: ROLE_MAX_AGE, ...cookieDefaults });

    return result;
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}
