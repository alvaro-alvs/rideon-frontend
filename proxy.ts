import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  clearAuthCookies,
  hasAccessToken,
  hasRefreshToken,
  isMasterAdmin,
  isPlatformOrTenantAdmin,
  isTokenExpired,
  refreshAccessToken,
  REFRESH_COOKIE,
  ROLE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    pathname !== "/api/health";
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/admin") && !pathname.startsWith("/api/"));

  const host = request.headers.get("host") || "localhost";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-host", host);

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const role = request.cookies.get(ROLE_COOKIE)?.value || "rider";
  const userHome = isPlatformOrTenantAdmin(role) ? "/admin" : "/dashboard";

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

  // Case 2: Protected API routes (/api/vehicles, /api/admin/*, /api/motorcycles/*)
  if (isProtectedApi) {
    let currentToken = sessionToken;
    let refreshed = false;
    let newAccessToken = "";
    let newRefreshToken = "";

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

    if (!currentToken || (!refreshed && isTokenExpired(currentToken))) {
      const unauthRes = NextResponse.json(
        { message: "Sua sessão expirou. Faça login novamente.", code: "SESSION_EXPIRED" },
        { status: 401 },
      );
      clearAuthCookies(unauthRes);
      return finalizeResponse(unauthRes);
    }

    // Role-based restrictions on API routes
    if (pathname.startsWith("/api/admin")) {
      if (!isPlatformOrTenantAdmin(role)) {
        const forbiddenRes = NextResponse.json(
          { message: "Acesso restrito a administradores.", code: "FORBIDDEN" },
          { status: 403 },
        );
        return finalizeResponse(forbiddenRes);
      }
      if (pathname.startsWith("/api/admin/managers") && !isMasterAdmin(role)) {
        const forbiddenRes = NextResponse.json(
          { message: "Acesso restrito ao Master Admin.", code: "FORBIDDEN" },
          { status: 403 },
        );
        return finalizeResponse(forbiddenRes);
      }
    }

    if (refreshed) {
      requestHeaders.set(
        "cookie",
        `rideon_access_token=${newAccessToken}; rideon_refresh_token=${newRefreshToken}; rideon_user_role=${role}; rideon_session_active=1`,
      );
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

  // Case 3: Protected Page routes (/dashboard, /admin)
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
      loginUrl.searchParams.set("expired", "1");
      if (pathname !== "/dashboard") {
        loginUrl.searchParams.set("from", pathname);
      }
      const redirectRes = NextResponse.redirect(loginUrl);
      clearAuthCookies(redirectRes);
      return finalizeResponse(redirectRes);
    }

    // Role-based access: /admin/* and /dashboard/devices require platform or tenant admin role
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard/devices")) {
      if (!isPlatformOrTenantAdmin(role)) {
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

      // Master Admin specific access: /admin/managers is restricted to platform admins
      if (pathname.startsWith("/admin/managers") && !isMasterAdmin(role)) {
        const redirectRes = NextResponse.redirect(new URL("/admin", request.url));
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

    if (refreshed) {
      requestHeaders.set(
        "cookie",
        `rideon_access_token=${newAccessToken}; rideon_refresh_token=${newRefreshToken}; rideon_user_role=${role}; rideon_session_active=1`,
      );
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

  // Case 4: Public routes (/ and others)
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
