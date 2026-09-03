import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { callAuthenticatedApi, SESSION_COOKIE } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const { response, data } = await callAuthenticatedApi(
      `/api/v1/motorcycles/${id}/location`,
      token,
      undefined,
      "GET",
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "Nao foi possivel obter a localizacao da motocicleta." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}
