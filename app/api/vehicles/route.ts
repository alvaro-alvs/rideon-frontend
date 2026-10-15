import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  callAuthenticatedApi,
  callApiMe,
  clearAuthCookies,
  getApiUrl,
  getSessionOrRefresh,
  getUserRole,
  isMasterAdmin,
  isManager,
  isPlatformOrTenantAdmin,
  isValidVehicleRegistration,
  PENDING_RIDER_COOKIE,
  PENDING_RIDER_MAX_AGE,
  ROLE_COOKIE,
  type RiderPayload,
  type UserRole,
} from "@/lib/auth";

type PendingRider = RiderPayload & {
  id: string;
};

export async function GET(request: NextRequest) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const token = session.token;
  const role = await resolveUserRole(request, token);
  const pendingRider = getPendingRider(request);

  const finalize = (res: NextResponse) => {
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(res, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
        role,
      });
    }
    return res;
  };

  try {
    if (isPlatformOrTenantAdmin(role)) {
      const apiUrl = getApiUrl();
      const motoRes = await fetch(`${apiUrl}/api/v1/motorcycles`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      let fleetMotorcycles: Array<Record<string, unknown>> = [];
      if (motoRes.ok) {
        const motoData = await motoRes.json().catch(() => null);
        fleetMotorcycles = extractMotorcyclesList(motoData);
      }

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

      const clientRole = isMasterAdmin(role) ? "admin" : isManager(role) ? "manager" : "rider";

      return finalize(
        NextResponse.json({
          pendingRider: toPublicPendingRider(pendingRider),
          riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
          motorcycles: fleetMotorcycles,
          total: fleetMotorcycles.length,
          role: clientRole,
        }),
      );
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
          return finalize(
            NextResponse.json({
              pendingRider: toPublicPendingRider(pendingRider),
              riderProfile: null,
              motorcycles: [],
              total: 0,
              role: "rider",
            }),
          );
        }

        return finalize(
          NextResponse.json(
            {
              message: getVehicleError(riderRes.status),
              pendingRider: toPublicPendingRider(pendingRider),
              riderProfile: null,
              motorcycles: [],
              total: 0,
              role: "rider",
            },
            { status: toPublicStatus(riderRes.status) },
          ),
        );
      }

      if (riderData) {
        riderId = getId(riderData) ?? undefined;
        existingRiderData = riderData;
      }
    }

    if (!riderId) {
      return finalize(
        NextResponse.json({
          pendingRider: toPublicPendingRider(pendingRider),
          riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
          motorcycles: [],
          total: 0,
          role: "rider",
        }),
      );
    }

    const query = new URLSearchParams({ rider_id: riderId });
    const { response: motoRes, data } = await callAuthenticatedApi(
      `/api/v1/motorcycles?${query}`,
      token,
      undefined,
      "GET",
    );

    if (!motoRes.ok) {
      return finalize(
        NextResponse.json(
          {
            message: getVehicleError(motoRes.status),
            pendingRider: toPublicPendingRider(pendingRider),
            riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
            motorcycles: [],
            total: 0,
            role: "rider",
          },
          { status: toPublicStatus(motoRes.status) },
        ),
      );
    }

    const motorcycles = extractMotorcyclesList(data);

    return finalize(
      NextResponse.json({
        pendingRider: toPublicPendingRider(pendingRider),
        riderProfile: existingRiderData ? toPublicPendingRider(existingRiderData as unknown as PendingRider) : null,
        motorcycles,
        total: motorcycles.length,
        role: "rider",
      }),
    );
  } catch {
    return finalize(
      NextResponse.json(
        { message: "Nao foi possivel conectar ao servidor." },
        { status: 502 },
      ),
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

  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  const token = session.token;
  const role = await resolveUserRole(request, token);

  const finalize = (res: NextResponse) => {
    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(res, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
        role,
      });
    }
    return res;
  };

  // Regra de Negócio: Usuário padrão (rider) sem plano multi-veículo NÃO pode criar mais de 1 veículo
  if (!isPlatformOrTenantAdmin(role)) {
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
              return finalize(
                NextResponse.json(
                  {
                    message:
                      "Limite de veículos atingido. O perfil padrão de piloto permite o cadastro de no máximo 1 veículo.",
                  },
                  { status: 403 },
                ),
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
          return finalize(
            NextResponse.json(
              { message: getVehicleError(response.status) },
              { status: toPublicStatus(response.status) },
            ),
          );
        }

        riderId = getId(data);
        if (!riderId) {
          return finalize(
            NextResponse.json(
              { message: "Resposta invalida ao cadastrar o piloto." },
              { status: 502 },
            ),
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
      return finalize(result);
    }

    const result = NextResponse.json({ registered: true });
    result.cookies.delete(PENDING_RIDER_COOKIE);
    return finalize(result);
  } catch {
    return finalize(
      NextResponse.json(
        { message: "Nao foi possivel conectar ao servidor." },
        { status: 502 },
      ),
    );
  }
}

async function resolveUserRole(request: NextRequest, token: string): Promise<UserRole> {
  const cookieRole = request.cookies.get(ROLE_COOKIE)?.value;
  if (
    cookieRole &&
    [
      "admin",
      "platform_admin",
      "tenant_owner",
      "tenant_admin",
      "tenant_operator",
      "manager",
      "rider",
    ].includes(cookieRole)
  ) {
    return cookieRole as UserRole;
  }

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
