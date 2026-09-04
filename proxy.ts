import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Require authentication for all protected routes
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access: /admin/* is restricted to users with role "admin".
  // The role cookie is set at login time (POST /api/auth/login) after resolving
  // the role via GET /api/v1/auth/me (per README_FRONTEND.md §4).
  if (pathname.startsWith("/admin")) {
    const role = request.cookies.get(ROLE_COOKIE)?.value;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
