import { NextResponse } from "next/server";

import {
  callAuthApi,
  getPublicError,
  hasUserId,
  isValidCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
  }

  if (!isValidCredentials(payload)) {
    return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
  }

  try {
    const { response, data } = await callAuthApi("register", payload);

    if (!response.ok) {
      return NextResponse.json(
        { message: getPublicError(response.status) },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    if (!hasUserId(data)) {
      return NextResponse.json(
        { message: "Resposta invalida da API de autenticacao." },
        { status: 502 },
      );
    }

    return NextResponse.json({ registered: true });
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}
