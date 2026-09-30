import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getApiUrl, SESSION_COOKIE } from "@/lib/auth";

/**
 * PATCH /api/admin/devices/[id]
 *
 * Conforme README_ADMIN.md § 4.4:
 * Permite vincular um rastreador em standby a uma motocicleta,
 * desvincular um equipamento em uso (retornando a standby) ou atualizar firmware/protocolo/status.
 *
 * Exemplo 1: Vincular a uma motocicleta (Ativação):
 * { "motorcycle_id": "26b7f0bd-4d22-4d96-b83c-cd71d7ea1b90" }
 *
 * Exemplo 2: Desvincular de motocicleta (Retornar para Standby):
 * { "unlink": true }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada." },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "Identificador do dispositivo não informado." },
      { status: 400 },
    );
  }

  const apiUrl = getApiUrl();

  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {};

    if (body.unlink === true) {
      payload.unlink = true;
    } else if (
      body.motorcycle_id &&
      typeof body.motorcycle_id === "string" &&
      body.motorcycle_id.trim() !== ""
    ) {
      payload.motorcycle_id = body.motorcycle_id.trim();
    }

    if (body.status && typeof body.status === "string") {
      payload.status = body.status.trim();
    }

    if (body.protocol && typeof body.protocol === "string") {
      payload.protocol = body.protocol.trim();
    }

    if (body.firmware_version && typeof body.firmware_version === "string") {
      payload.firmware_version = body.firmware_version.trim();
    }

    const response = await fetch(`${apiUrl}/api/v1/devices/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMsg = "Não foi possível atualizar o dispositivo.";
      if (resBody && typeof resBody === "object") {
        const errObj = resBody as Record<string, unknown>;
        if (errObj.error && typeof errObj.error === "object") {
          const inner = errObj.error as Record<string, unknown>;
          if (inner.message) errorMsg = String(inner.message);
          else if (inner.code) errorMsg = `Erro do servidor: ${inner.code}`;
        } else if (errObj.message) {
          errorMsg = String(errObj.message);
        }
      }

      return NextResponse.json(
        { message: errorMsg },
        { status: response.status },
      );
    }

    const successMessage =
      body.unlink === true
        ? "Dispositivo desvinculado e retornado ao estoque com sucesso!"
        : payload.motorcycle_id
        ? "Dispositivo vinculado à motocicleta com sucesso!"
        : "Dispositivo atualizado com sucesso!";

    return NextResponse.json({
      message: successMessage,
      device: resBody,
    });
  } catch (err) {
    return NextResponse.json(
      {
        message:
          err instanceof Error
            ? err.message
            : "Erro ao conectar com o servidor para atualizar o dispositivo.",
      },
      { status: 502 },
    );
  }
}

/**
 * GET /api/admin/devices/[id]
 *
 * Conforme README_ADMIN.md § 4.3:
 * Retorna as informações completas de um dispositivo individual pelo seu identificador único.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada." },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "Identificador do dispositivo não informado." },
      { status: 400 },
    );
  }

  const apiUrl = getApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/v1/devices/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const resBody: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: "Dispositivo não encontrado." },
        { status: response.status },
      );
    }

    return NextResponse.json(resBody);
  } catch {
    return NextResponse.json(
      { message: "Erro de conexão ao buscar dispositivo." },
      { status: 502 },
    );
  }
}
