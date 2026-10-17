import { NextResponse } from "next/server";

import {
  applyAuthCookies,
  callApiMe,
  callAuthApi,
  getPublicError,
  getUserRole,
  hasAccessToken,
  hasRefreshToken,
  hasUserId,
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
    const { response, data } = await callAuthApi("register", payload);

    if (!response.ok) {
      return NextResponse.json(
        { message: getPublicError(response.status) },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    if (!hasUserId(data)) {
      return NextResponse.json(
        { message: "Resposta invalida da API de autenticacao." },
        { status: 502 },
      );
    }

    // Auto-login immediately upon registration
    try {
      const { response: loginRes, data: loginData } = await callAuthApi(
        "login",
        payload,
      );

      if (loginRes.ok && hasAccessToken(loginData)) {
        let role = "rider";
        let sessionUsable = true;
        try {
          const { response: meRes, data: meData } = await callApiMe(
            loginData.access_token,
          );
          if (meRes.ok && meData) {
            role = getUserRole(meData);
          } else if (meRes.status === 401 || meRes.status === 403) {
            // Account exists but cannot use this portal yet; never create a
            // session that every protected page would reject (redirect loop).
            sessionUsable = false;
          }
        } catch {
          // Default role is "rider" for newly registered users
        }

        if (!sessionUsable) {
          return NextResponse.json({
            registered: true,
            authenticated: false,
            autoLoggedIn: false,
            message: "Conta criada com sucesso. Faca login para acessar.",
          });
        }

        const successResponse = NextResponse.json({
          registered: true,
          authenticated: true,
          autoLoggedIn: true,
          role,
          message: "Conta criada e autenticada com sucesso!",
        });

        applyAuthCookies(successResponse, {
          accessToken: loginData.access_token,
          refreshToken: hasRefreshToken(loginData) ? loginData.refresh_token : undefined,
          role,
        });

        return successResponse;
      }
    } catch {
      // If auto-login network call fails, proceed with fallback
    }

    // Fallback: registered successfully but client must log in manually
    return NextResponse.json({
      registered: true,
      authenticated: false,
      autoLoggedIn: false,
      message: "Conta criada com sucesso. Faca login para acessar.",
    });
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}

