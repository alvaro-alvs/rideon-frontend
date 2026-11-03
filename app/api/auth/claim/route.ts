import { NextResponse } from "next/server";
import {
  applyAuthCookies,
  callApiMe,
  callAuthApi,
  getPublicError,
  getUserRole,
  hasAccessToken,
  hasRefreshToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { message: "E-mail e senha (mínimo de 6 caracteres) são obrigatórios." },
      { status: 400 },
    );
  }

  try {
    const { response, data } = await callAuthApi("claim", payload);

    if (!response.ok || !data) {
      const errMsg =
        data && typeof data === "object" && "error" in data
          ? ((data.error as Record<string, unknown>)?.message as string)
          : getPublicError(response.status);

      return NextResponse.json(
        { message: errMsg || "Não foi possível confirmar seu cadastro." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    if (!hasAccessToken(data)) {
      return NextResponse.json(
        { message: "Resposta inválida da API de autenticação." },
        { status: 502 },
      );
    }

    let role = "rider";
    try {
      const { response: meRes, data: meData } = await callApiMe(data.access_token);
      if (meRes.ok && meData) {
        role = getUserRole(meData);
      }
    } catch {
      // Default to "rider"
    }

    const successResponse = NextResponse.json({
      authenticated: true,
      autoLoggedIn: true,
      role,
      firstLogin: true,
      mustChangePassword: true,
      message: "Cadastro confirmado e login realizado com sucesso!",
    });

    applyAuthCookies(successResponse, {
      accessToken: data.access_token,
      refreshToken: hasRefreshToken(data) ? data.refresh_token : undefined,
      role,
    });

    return successResponse;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao conectar com o servidor." },
      { status: 502 },
    );
  }
}
