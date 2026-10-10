import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  callApiMe,
  clearAuthCookies,
  getUserRole,
  hasAccessToken,
  hasRefreshToken,
  isTokenExpired,
  refreshAccessToken,
  REFRESH_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth";

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile from the backend's /api/v1/auth/me endpoint.
 * Supports silent token refresh using REFRESH_COOKIE if access_token is expired.
 */
export async function GET(request: NextRequest) {
  let token = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let refreshedTokens: { accessToken: string; refreshToken?: string } | null = null;

  // 1. If access token is missing or expired, attempt transparent refresh
  if ((!token || isTokenExpired(token)) && refreshToken) {
    try {
      const { response: refRes, data: refData } = await refreshAccessToken(refreshToken);
      if (refRes.ok && hasAccessToken(refData)) {
        token = refData.access_token;
        refreshedTokens = {
          accessToken: refData.access_token,
          refreshToken: hasRefreshToken(refData) ? refData.refresh_token : refreshToken,
        };
      }
    } catch {
      // Proceed to verification
    }
  }

  if (!token) {
    const unauthResponse = NextResponse.json(
      { message: "Nao autenticado." },
      { status: 401 },
    );
    clearAuthCookies(unauthResponse);
    return unauthResponse;
  }

  try {
    let { response, data } = await callApiMe(token);

    // 2. If the access token was revoked/rejected with 401, try refreshing once
    if (response.status === 401 && refreshToken && !refreshedTokens) {
      try {
        const { response: refRes, data: refData } = await refreshAccessToken(refreshToken);
        if (refRes.ok && hasAccessToken(refData)) {
          token = refData.access_token;
          refreshedTokens = {
            accessToken: refData.access_token,
            refreshToken: hasRefreshToken(refData) ? refData.refresh_token : refreshToken,
          };
          const retried = await callApiMe(token);
          response = retried.response;
          data = retried.data;
        }
      } catch {
        // Fall through to error handling
      }
    }

    if (!response.ok) {
      const errorResponse = NextResponse.json(
        { message: "Sessao expirada ou invalida." },
        { status: response.status >= 500 ? 502 : response.status },
      );
      if (response.status === 401) {
        clearAuthCookies(errorResponse);
      }
      return errorResponse;
    }

    if (!data) {
      return NextResponse.json({ message: "Resposta invalida." }, { status: 502 });
    }

    const role = getUserRole(data);

    const successResponse = NextResponse.json({
      id: data.id ?? null,
      email: data.email ?? null,
      role,
      status: data.status ?? null,
    });

    if (refreshedTokens) {
      applyAuthCookies(successResponse, {
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken,
        role,
      });
    }

    return successResponse;
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel verificar a sessao." },
      { status: 502 },
    );
  }
}

