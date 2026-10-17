import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  callAuthenticatedApi,
  callApiMe,
  clearAuthCookies,
  getSessionOrRefresh,
  getUserRole,
  type UserRole,
} from "@/lib/auth";
import { cleanPhone, validatePhone } from "@/lib/phone";

export async function GET(request: NextRequest) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessão expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const token = session.token;
  let userRole: UserRole = "rider";

  try {
    // 1. Fetch user credentials and RBAC status
    const { response: userRes, data: userData } = await callApiMe(token);
    if (!userRes.ok || !userData) {
      if (userRes.status === 401 || userRes.status === 403) {
        const unauth = NextResponse.json(
          { message: "Sessão inválida ou não autorizada.", code: "UNAUTHORIZED" },
          { status: userRes.status },
        );
        clearAuthCookies(unauth);
        return unauth;
      }
      return NextResponse.json(
        { message: "Falha ao obter perfil de usuário." },
        { status: userRes.status >= 500 ? 502 : userRes.status },
      );
    }

    userRole = getUserRole(userData);

    // 2. Fetch rider personal/business profile (if created)
    let riderData: Record<string, unknown> | null = null;
    const { response: riderRes, data: riderBody } = await callAuthenticatedApi(
      "/api/v1/riders/me",
      token,
      undefined,
      "GET",
    );

    if (riderRes.ok && riderBody) {
      riderData = riderBody;
    }

    const response = NextResponse.json({
      user: {
        id: userData.id ?? null,
        email: userData.email ?? null,
        role: userRole,
        status: userData.status ?? "active",
        created_at: userData.created_at ?? null,
      },
      rider: riderData
        ? {
            id: riderData.id ?? null,
            user_id: riderData.user_id ?? null,
            name: riderData.name ?? "",
            phone: riderData.phone ?? "",
            date_of_birth: riderData.date_of_birth ?? null,
            status: riderData.status ?? "active",
            created_at: riderData.created_at ?? null,
          }
        : null,
    });

    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(response, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
        role: userRole,
      });
    }

    return response;
  } catch (err) {
    return NextResponse.json(
      { message: "Erro de comunicação com os serviços centrais." },
      { status: 502 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessão expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const token = session.token;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const rawDob = typeof body.date_of_birth === "string" ? body.date_of_birth.trim() : undefined;

  // Validation
  if (name !== undefined && (name.length < 2 || name.length > 100)) {
    return NextResponse.json(
      { message: "O nome completo deve ter entre 2 e 100 caracteres." },
      { status: 422 },
    );
  }

  let formattedPhone: string | undefined = undefined;
  if (rawPhone !== undefined && rawPhone.length > 0) {
    const phoneValidation = validatePhone(rawPhone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { message: phoneValidation.message || "Número de telefone ou celular inválido." },
        { status: 422 },
      );
    }
    const digits = cleanPhone(rawPhone);
    formattedPhone = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
  }

  try {
    // Check if rider profile already exists
    const { response: riderCheckRes, data: existingRider } = await callAuthenticatedApi(
      "/api/v1/riders/me",
      token,
      undefined,
      "GET",
    );

    const riderExists = riderCheckRes.ok && existingRider && existingRider.id;

    if (riderExists) {
      // Profile exists -> Update via PATCH /api/v1/riders/:id
      const updatePayload: Record<string, unknown> = {};
      if (name !== undefined) updatePayload.name = name;
      if (formattedPhone !== undefined) updatePayload.phone = formattedPhone;

      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json(
          { message: "Nenhum dado informado para atualização." },
          { status: 400 },
        );
      }

      const riderId = String(existingRider.id);
      const { response: patchRes, data: updatedRider } = await callAuthenticatedApi(
        `/api/v1/riders/${riderId}`,
        token,
        updatePayload,
        "PATCH",
      );

      if (!patchRes.ok) {
        const errorMsg =
          (updatedRider?.error as Record<string, unknown>)?.message ||
          "Não foi possível atualizar o perfil cadastral.";
        return NextResponse.json(
          { message: String(errorMsg) },
          { status: patchRes.status >= 500 ? 502 : patchRes.status },
        );
      }

      const res = NextResponse.json({
        message: "Dados cadastrais atualizados com sucesso!",
        rider: updatedRider,
      });

      if (session.refreshed && session.newAccessToken) {
        applyAuthCookies(res, {
          accessToken: session.newAccessToken,
          refreshToken: session.newRefreshToken,
        });
      }

      return res;
    } else {
      // Profile doesn't exist yet -> Create via POST /api/v1/riders
      if (!name || !formattedPhone || !rawDob) {
        return NextResponse.json(
          {
            message:
              "Para criar o perfil cadastral inicial, informe Nome, Telefone e Data de Nascimento.",
          },
          { status: 422 },
        );
      }

      // Convert Date of Birth to RFC3339
      let dobIso: string;
      try {
        const parsedDate = new Date(rawDob.includes("T") ? rawDob : `${rawDob}T12:00:00Z`);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date");
        }
        dobIso = parsedDate.toISOString();
      } catch {
        return NextResponse.json(
          { message: "Data de nascimento inválida (utilize o formato AAAA-MM-DD)." },
          { status: 422 },
        );
      }

      const createPayload = {
        name,
        phone: formattedPhone,
        date_of_birth: dobIso,
      };

      const { response: postRes, data: createdRider } = await callAuthenticatedApi(
        "/api/v1/riders",
        token,
        createPayload,
        "POST",
      );

      if (!postRes.ok) {
        const errorMsg =
          (createdRider?.error as Record<string, unknown>)?.message ||
          "Não foi possível criar o perfil cadastral.";
        return NextResponse.json(
          { message: String(errorMsg) },
          { status: postRes.status >= 500 ? 502 : postRes.status },
        );
      }

      const res = NextResponse.json({
        message: "Perfil de piloto cadastrado com sucesso!",
        rider: createdRider,
      });

      if (session.refreshed && session.newAccessToken) {
        applyAuthCookies(res, {
          accessToken: session.newAccessToken,
          refreshToken: session.newRefreshToken,
        });
      }

      return res;
    }
  } catch (err) {
    return NextResponse.json(
      { message: "Erro de comunicação ao salvar os dados cadastrais." },
      { status: 502 },
    );
  }
}
