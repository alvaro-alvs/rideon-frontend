import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  clearAuthCookies,
  hasAccessToken,
  hasRefreshToken,
  isTokenExpired,
  refreshAccessToken,
  REFRESH_COOKIE,
  ROLE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedPage =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  const host = request.headers.get("host") || "localhost";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-host", host);

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const role = request.cookies.get(ROLE_COOKIE)?.value || "rider";
  const userHome = role === "admin" ? "/admin" : "/dashboard";

  // Helper to attach tenant headers & cookie
  const finalizeResponse = (res: NextResponse) => {
    res.cookies.set("rideon_tenant_host", host, {
      path: "/",
      sameSite: "lax",
    });
    return res;
  };

  // Case 1: User visits login or register while session is active -> redirect to home
  if (isAuthPage) {
    if (sessionToken && !isTokenExpired(sessionToken)) {
      return finalizeResponse(NextResponse.redirect(new URL(userHome, request.url)));
    }

    if (refreshToken) {
      try {
        const { response, data } = await refreshAccessToken(refreshToken);
        if (response.ok && hasAccessToken(data)) {
          const redirectRes = NextResponse.redirect(new URL(userHome, request.url));
          applyAuthCookies(redirectRes, {
            accessToken: data.access_token,
            refreshToken: hasRefreshToken(data) ? data.refresh_token : refreshToken,
            role,
          });
          return finalizeResponse(redirectRes);
        }
      } catch {
        // Refresh failed, proceed to show auth page
      }
    }

    const nextRes = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return finalizeResponse(nextRes);
  }

  // Case 2: Protected routes (/dashboard, /admin)
  if (isProtectedPage) {
    let currentToken = sessionToken;
    let refreshed = false;
    let newAccessToken = "";
    let newRefreshToken = "";

    // If session token is missing or expired, attempt transparent refresh using refresh_token
    if (!currentToken || isTokenExpired(currentToken)) {
      if (refreshToken) {
        try {
          const { response, data } = await refreshAccessToken(refreshToken);
          if (response.ok && hasAccessToken(data)) {
            refreshed = true;
            newAccessToken = data.access_token;
            newRefreshToken = hasRefreshToken(data) ? data.refresh_token : refreshToken;
            currentToken = newAccessToken;
          }
        } catch {
          // Refresh failed
        }
      }
    }

    // If no valid session token exists even after refresh attempt, redirect to login
    if (!currentToken || (!refreshed && isTokenExpired(currentToken))) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/dashboard") {
        loginUrl.searchParams.set("from", pathname);
      }
      const redirectRes = NextResponse.redirect(loginUrl);
      clearAuthCookies(redirectRes);
      return finalizeResponse(redirectRes);
    }

    // Role-based access: /admin/* and /dashboard/devices require "admin" role
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard/devices")) {
      if (role !== "admin") {
        const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
        if (refreshed) {
          applyAuthCookies(redirectRes, {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            role,
          });
        }
        return finalizeResponse(redirectRes);
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    if (refreshed) {
      applyAuthCookies(response, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        role,
      });
    }

    return finalizeResponse(response);
  }

  // Case 3: Public routes (/ and others)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return finalizeResponse(response);
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
