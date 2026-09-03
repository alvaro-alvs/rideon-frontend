import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  SESSION_MAX_AGE,
  REFRESH_MAX_AGE,
  refreshAccessToken,
  hasAccessToken,
  hasRefreshToken,
} from "@/lib/auth";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8"),
    );
    if (!payload.exp) return false;
    // Expired or expiring in the next 30 seconds
    return Date.now() >= payload.exp * 1000 - 30_000;
  } catch {
    return true;
  }
}

export async function GET(request: NextRequest) {
  let token = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // Se o access_token estiver expirado ou ausente, tenta renovar se houver refresh_token
  if ((!token || isTokenExpired(token)) && refreshToken) {
    try {
      const { response, data } = await refreshAccessToken(refreshToken);
      if (response.ok && hasAccessToken(data)) {
        token = data.access_token;
        const res = NextResponse.json({ token });
        res.cookies.set({
          name: SESSION_COOKIE,
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: SESSION_MAX_AGE,
        });

        if (hasRefreshToken(data)) {
          res.cookies.set({
            name: REFRESH_COOKIE,
            value: data.refresh_token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: REFRESH_MAX_AGE,
          });
        }
        return res;
      }
    } catch {
      // Ignora erro no refresh e cai na validação abaixo
    }
  }

  if (!token) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  return NextResponse.json({ token });
}
