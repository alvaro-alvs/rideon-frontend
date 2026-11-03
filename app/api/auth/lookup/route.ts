import { NextResponse } from "next/server";
import { callAuthApi } from "@/lib/auth";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!email && !name) {
    return NextResponse.json({ found: false, matches: [] }, { status: 200 });
  }

  try {
    const { response, data } = await callAuthApi("lookup", { email, name });

    if (!response.ok || !data) {
      return NextResponse.json(
        { found: false, matches: [], message: "Não foi possível realizar a consulta." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { found: false, matches: [], message: error instanceof Error ? error.message : "Erro interno." },
      { status: 502 },
    );
  }
}
