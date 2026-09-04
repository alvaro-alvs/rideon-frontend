import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { callApiMe, getUserRole, SESSION_COOKIE } from "@/lib/auth";

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile from the backend's /api/v1/auth/me endpoint.
 * The role is resolved server-side (JWT does NOT carry the role per README_FRONTEND.md §2.2).
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  try {
    const { response, data } = await callApiMe(token);

    if (!response.ok) {
      return NextResponse.json(
        { message: "Sessao expirada ou invalida." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    if (!data) {
      return NextResponse.json({ message: "Resposta invalida." }, { status: 502 });
    }

    const role = getUserRole(data);

    return NextResponse.json({
      id: data.id ?? null,
      email: data.email ?? null,
      role,
      status: data.status ?? null,
    });
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel verificar a sessao." },
      { status: 502 },
    );
  }
}
