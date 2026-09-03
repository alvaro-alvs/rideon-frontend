import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  callAuthenticatedApi,
  isValidVehicleRegistration,
  PENDING_RIDER_COOKIE,
  PENDING_RIDER_MAX_AGE,
  SESSION_COOKIE,
  type RiderPayload,
} from "@/lib/auth";

type PendingRider = RiderPayload & {
  id: string;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente." },
      { status: 401 },
    );
  }

  const pendingRider = getPendingRider(request);

  try {
    let riderId = pendingRider?.id;

    // Se não tiver rider pendente no cookie, busca o rider logado via /api/v1/riders/me
    if (!riderId) {
      const { response: riderRes, data: riderData } = await callAuthenticatedApi(
        "/api/v1/riders/me",
        token,
        undefined,
        "GET",
      );

      if (!riderRes.ok) {
        return NextResponse.json(
          {
            message: getVehicleError(riderRes.status),
            pendingRider: toPublicPendingRider(pendingRider),
            motorcycles: [],
          },
          { status: toPublicStatus(riderRes.status) },
        );
      }

      if (riderData) {
        riderId = getId(riderData) ?? undefined;
      }
    }

    if (!riderId) {
      return NextResponse.json({
        pendingRider: toPublicPendingRider(pendingRider),
        motorcycles: [],
      });
    }

    const query = new URLSearchParams({ rider_id: riderId });
    const { response: motoRes, data } = await callAuthenticatedApi(
      `/api/v1/motorcycles?${query}`,
      token,
      undefined,
      "GET",
    );

    console.log("motoRes", motoRes);
    console.log("data", data);

    if (!motoRes.ok) {
      return NextResponse.json(
        {
          message: getVehicleError(motoRes.status),
          pendingRider: toPublicPendingRider(pendingRider),
          motorcycles: [],
        },
        { status: toPublicStatus(motoRes.status) },
      );
    }

    let motorcycles: Array<Record<string, unknown>> = [];

    if (data) {
      if (Array.isArray(data)) {
        motorcycles = data as Array<Record<string, unknown>>;
      } else if (Array.isArray(data.data)) {
        motorcycles = data.data as Array<Record<string, unknown>>;
      } else if (Array.isArray(data.motorcycles)) {
        motorcycles = data.motorcycles as Array<Record<string, unknown>>;
      } else if (Array.isArray(data.items)) {
        motorcycles = data.items as Array<Record<string, unknown>>;
      }
    }

    return NextResponse.json({
      pendingRider: toPublicPendingRider(pendingRider),
      motorcycles,
    });
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
  }

  if (!isValidVehicleRegistration(payload)) {
    return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente." },
      { status: 401 },
    );
  }

  try {
    let pendingRider = getPendingRider(request);

    if (!pendingRider) {
      const { response, data } = await callAuthenticatedApi(
        "/api/v1/riders",
        token,
        payload.rider,
      );

      if (!response.ok) {
        return NextResponse.json(
          { message: getVehicleError(response.status) },
          { status: toPublicStatus(response.status) },
        );
      }

      const riderId = getId(data);
      if (!riderId) {
        return NextResponse.json(
          { message: "Resposta invalida ao cadastrar o piloto." },
          { status: 502 },
        );
      }

      pendingRider = { ...payload.rider, id: riderId };
    }

    const query = new URLSearchParams({ rider_id: pendingRider.id });
    const { response } = await callAuthenticatedApi(
      `/api/v1/motorcycles?${query}`,
      token,
      payload.motorcycle,
    );

    if (!response.ok) {
      const result = NextResponse.json(
        {
          message: getVehicleError(response.status),
          pending: true,
          pendingRider: toPublicPendingRider(pendingRider),
        },
        { status: toPublicStatus(response.status) },
      );
      result.cookies.set({
        name: PENDING_RIDER_COOKIE,
        value: JSON.stringify(pendingRider),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PENDING_RIDER_MAX_AGE,
      });
      return result;
    }

    const result = NextResponse.json({ registered: true });
    result.cookies.delete(PENDING_RIDER_COOKIE);
    return result;
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}

function getPendingRider(request: NextRequest): PendingRider | null {
  const value = request.cookies.get(PENDING_RIDER_COOKIE)?.value;
  if (!value) return null;

  try {
    const pendingRider: unknown = JSON.parse(value);
    if (!pendingRider || typeof pendingRider !== "object") return null;

    const { id, name, date_of_birth, phone } = pendingRider as Record<
      string,
      unknown
    >;
    if (
      (typeof id !== "string" && typeof id !== "number") ||
      typeof name !== "string" ||
      typeof date_of_birth !== "string" ||
      typeof phone !== "string"
    ) {
      return null;
    }

    return { id: String(id), name, date_of_birth, phone };
  } catch {
    return null;
  }
}

function getId(data: Record<string, unknown> | null) {
  const id = data?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

function toPublicPendingRider(pendingRider: PendingRider | null) {
  if (!pendingRider) return null;

  const { name, date_of_birth, phone } = pendingRider;
  return { name, date_of_birth, phone };
}

function getVehicleError(status: number) {
  if (status === 400 || status === 422) return "Confira os dados informados.";
  if (status === 401 || status === 403)
    return "Sua sessao nao permite esta operacao.";
  return "Nao foi possivel concluir o cadastro. Tente novamente.";
}

function toPublicStatus(status: number) {
  return status >= 500 ? 502 : status;
}
