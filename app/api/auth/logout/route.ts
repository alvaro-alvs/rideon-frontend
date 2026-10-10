import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  clearAuthCookies(response);
  return response;
}

