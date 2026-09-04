import { NextResponse } from "next/server";

import { PENDING_RIDER_COOKIE, REFRESH_COOKIE, ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(PENDING_RIDER_COOKIE);
  response.cookies.delete(ROLE_COOKIE);
  return response;
}
