import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callAuthApi, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: "Sessão não autenticada." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const newPassword = typeof payload.new_password === "string" ? payload.new_password : "";
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { message: "A nova senha deve ter no mínimo 8 caracteres." },
      { status: 400 },
    );
  }

  try {
    const { response, data } = await callAuthApi("change-password", payload, token);

    if (!response.ok) {
      const errMsg =
        data && typeof data === "object" && "error" in data
          ? ((data.error as Record<string, unknown>)?.message as string)
          : "Não foi possível atualizar a senha.";

      return NextResponse.json(
        { message: errMsg },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Senha atualizada com sucesso!",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro interno ao atualizar senha." },
      { status: 502 },
    );
  }
}
