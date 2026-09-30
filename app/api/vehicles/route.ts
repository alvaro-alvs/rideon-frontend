import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  callAuthenticatedApi,
  callApiMe,
  getApiUrl,
  getUserRole,
  isValidVehicleRegistration,
  PENDING_RIDER_COOKIE,
  PENDING_RIDER_MAX_AGE,
  ROLE_COOKIE,
  SESSION_COOKIE,
  type RiderPayload,
  type UserRole,
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

  const role = await resolveUserRole(request, token);
  const pendingRider = getPendingRider(request);

  try {
    if (role === "admin") {
      // 1. Motocicletas do próprio perfil de piloto do admin (se houver)
      const ownMotorcycles: Array<Record<string, unknown>> = [];
      let riderId = pendingRider?.id;
      let existingRiderData: Record<string, unknown> | null = null;
      if (!riderId) {
        const { response: riderRes, data: riderData } = await callAuthenticatedApi(
          "/api/v1/riders/me",
          token,
          undefined,
          "GET",
        );
        if (riderRes.ok && riderData) {
          riderId = getId(riderData) ?? undefined;
          existingRiderData = riderData;
        }
      }

      if (riderId) {
        const query = new URLSearchParams({ rider_id: riderId });
        const { response: motoRes, data: motoData } = await callAuthenticatedApi(
          `/api/v1/motorcycles?${query}`,
          token,
          undefined,
          "GET",
        );
        if (motoRes.ok && motoData) {
          ownMotorcycles.push(...extractMotorcyclesList(motoData));
        }
      }

      // 2. Motocicletas de toda a frota através de /api/v1/devices
      const apiUrl = getApiUrl();
      const devRes = await fetch(`${apiUrl}/api/v1/devices`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const allFleetMotos: Array<Record<string, unknown>> = [];
      if (devRes.ok) {
        const devBody: unknown = await devRes.json().catch(() => null);
        let rawDevices: Array<Record<string, unknown>> = [];
        if (Array.isArray(devBody)) {
          rawDevices = devBody as Array<Record<string, unknown>>;
        } else if (devBody && typeof devBody === "object") {
          const body = devBody as Record<string, unknown>;
          if (Array.isArray(body.data)) rawDevices = body.data as Array<Record<string, unknown>>;
          else if (Array.isArray(body.devices)) rawDevices = body.devices as Array<Record<string, unknown>>;
        }

        const motoIds = Array.from(
          new Set(
            rawDevices
              .map((d) => String(d.motorcycle_id || ""))
              .filter((id) => Boolean(id) && id !== "undefined"),
          ),
        );

        const motoResults = await Promise.allSettled(
          motoIds.map(async (id) => {
            const mRes = await fetch(`${apiUrl}/api/v1/motorcycles/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (mRes.ok) {
              const mData = await mRes.json().catch(() => null);
              if (mData && typeof mData === "object") {
                return mData as Record<string, unknown>;
              }
            }
            return null;
          }),
        );

        for (const res of motoResults) {
          if (res.status === "fulfilled" && res.value) {
            allFleetMotos.push(res.value);
          }
        }
      }

      // Combina e deduplica motocicletas
      const motoMap = new Map<string, Record<string, unknown>>();
      for (const m of [...ownMotorcycles, ...allFleetMotos]) {
        const id = String(m.id || m.license_plate || Math.random());
        if (!motoMap.has(id)) {
          motoMap.set(id, m);
        }
      }
      const combinedMotorcycles = Array.from(motoMap.values());

      return NextResponse.json({
        pendingRider: toPublicPendingRider(pendingRider),
        riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
        motorcycles: combinedMotorcycles,
        total: combinedMotorcycles.length,
        role: "admin",
      });
    }

    // Fluxo padrão para usuário com perfil comum (rider)
    let riderId = pendingRider?.id;
    let existingRiderData: Record<string, unknown> | null = null;

    if (!riderId) {
      const { response: riderRes, data: riderData } = await callAuthenticatedApi(
        "/api/v1/riders/me",
        token,
        undefined,
        "GET",
      );

      // Se o perfil ainda não existe (404), trata como normal com lista vazia
      if (!riderRes.ok) {
        if (riderRes.status === 404) {
          return NextResponse.json({
            pendingRider: toPublicPendingRider(pendingRider),
            riderProfile: null,
            motorcycles: [],
            total: 0,
            role: "rider",
          });
        }

        return NextResponse.json(
          {
            message: getVehicleError(riderRes.status),
            pendingRider: toPublicPendingRider(pendingRider),
            riderProfile: null,
            motorcycles: [],
            total: 0,
            role: "rider",
          },
          { status: toPublicStatus(riderRes.status) },
        );
      }

      if (riderData) {
        riderId = getId(riderData) ?? undefined;
        existingRiderData = riderData;
      }
    }

    if (!riderId) {
      return NextResponse.json({
        pendingRider: toPublicPendingRider(pendingRider),
        riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
        motorcycles: [],
        total: 0,
        role: "rider",
      });
    }

    const query = new URLSearchParams({ rider_id: riderId });
    const { response: motoRes, data } = await callAuthenticatedApi(
      `/api/v1/motorcycles?${query}`,
      token,
      undefined,
      "GET",
    );

    if (!motoRes.ok) {
      return NextResponse.json(
        {
          message: getVehicleError(motoRes.status),
          pendingRider: toPublicPendingRider(pendingRider),
          riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
          motorcycles: [],
          total: 0,
          role: "rider",
        },
        { status: toPublicStatus(motoRes.status) },
      );
    }

    const motorcycles = extractMotorcyclesList(data);

    return NextResponse.json({
      pendingRider: toPublicPendingRider(pendingRider),
      riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
      motorcycles,
      total: motorcycles.length,
      role: "rider",
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

  const role = await resolveUserRole(request, token);

  // Regra de Negócio: Usuário padrão (rider) NÃO pode criar mais de 1 veículo
  if (role !== "admin") {
    try {
      const { response: riderRes, data: riderData } = await callAuthenticatedApi(
        "/api/v1/riders/me",
        token,
        undefined,
        "GET",
      );

      if (riderRes.ok && riderData) {
        const existingRiderId = getId(riderData);
        if (existingRiderId) {
          const query = new URLSearchParams({ rider_id: existingRiderId });
          const { response: motoRes, data: motoData } = await callAuthenticatedApi(
            `/api/v1/motorcycles?${query}`,
            token,
            undefined,
            "GET",
          );

          if (motoRes.ok && motoData) {
            const existingMotos = extractMotorcyclesList(motoData);
            if (existingMotos.length >= 1) {
              return NextResponse.json(
                {
                  message:
                    "Limite de veículos atingido. O perfil padrão de piloto permite o cadastro de no máximo 1 veículo.",
                },
                { status: 403 },
              );
            }
          }
        }
      }
    } catch {
      // Se falhar a verificação prévia, prossegue com o fluxo padrão
    }
  }

  try {
    let pendingRider = getPendingRider(request);

    if (!pendingRider) {
      // Verifica se o usuário já possui um perfil de piloto no backend antes de tentar criar um novo
      let riderId: string | null = null;
      try {
        const { response: meRes, data: meData } = await callAuthenticatedApi(
          "/api/v1/riders/me",
          token,
          undefined,
          "GET",
        );
        if (meRes.ok && meData) {
          riderId = getId(meData);
        }
      } catch {
        // segue para POST se não existir
      }

      if (!riderId) {
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

        riderId = getId(data);
        if (!riderId) {
          return NextResponse.json(
            { message: "Resposta invalida ao cadastrar o piloto." },
            { status: 502 },
          );
        }
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

async function resolveUserRole(request: NextRequest, token: string): Promise<UserRole> {
  const cookieRole = request.cookies.get(ROLE_COOKIE)?.value;
  if (cookieRole === "admin") return "admin";
  if (cookieRole === "rider") return "rider";

  try {
    const { response, data } = await callApiMe(token);
    if (response.ok && data) {
      return getUserRole(data);
    }
  } catch {
    // fallback
  }

  return "rider";
}

function extractMotorcyclesList(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Array<Record<string, unknown>>;
    if (Array.isArray(obj.motorcycles)) return obj.motorcycles as Array<Record<string, unknown>>;
    if (Array.isArray(obj.items)) return obj.items as Array<Record<string, unknown>>;
  }
  return [];
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
