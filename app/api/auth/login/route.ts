import { NextResponse } from "next/server";

import {
  callAuthApi,
  getPublicError,
  hasAccessToken,
  hasRefreshToken,
  isValidCredentials,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
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

    const result = NextResponse.json({ authenticated: true });
    result.cookies.set({
      name: SESSION_COOKIE,
      value: data.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    if (hasRefreshToken(data)) {
      result.cookies.set({
        name: REFRESH_COOKIE,
        value: data.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_MAX_AGE,
      });
    }

    return result;
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}
