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

  // Role-based access: /admin/* and /dashboard/devices are strictly restricted to users with role "admin".
  // Legacy or rider users are redirected to the dashboard.
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard/devices")) {
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
