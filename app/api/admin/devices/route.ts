import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getApiUrl, SESSION_COOKIE } from "@/lib/auth";
import type {
  AssociatedMotorcycle,
  Device,
  DeviceLastPosition,
  RawDevice,
} from "@/lib/types/device";

/**
 * GET /api/admin/devices
 *
 * Estratégia (conforme README_ADMIN.md):
 *
 * 1. GET /api/v1/devices (sem filtro) → lista todos os dispositivos como admin
 *    - Se retornar 400 (motorcycle_id obrigatório para riders), o usuário não
 *      tem papel admin e é retornado 403.
 * 2. Para cada device, em paralelo:
 *    a. GET /api/v1/motorcycles/{motorcycle_id} → dados da moto vinculada
 *    b. GET /api/v1/motorcycles/{motorcycle_id}/location → última posição GPS
 *
 * Requer cookie de sessão com papel `admin`.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada." },
      { status: 401 },
    );
  }

  const apiUrl = getApiUrl();

  try {
    // ── 1. Listar todos os dispositivos (endpoint admin sem filtro) ───────────
    const devListRes = await fetch(`${apiUrl}/api/v1/devices`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const devListBody: unknown = await devListRes.json().catch(() => null);

    if (!devListRes.ok) {
      // Fallback para usuários do tipo rider: busca os dispositivos vinculados às suas motos
      if (devListRes.status === 400 || devListRes.status === 403) {
        try {
          const meRes = await fetch(`${apiUrl}/api/v1/riders/me`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });

          if (meRes.ok) {
            const meData = (await meRes.json().catch(() => null)) as { id?: string } | null;
            if (meData?.id) {
              const motosRes = await fetch(
                `${apiUrl}/api/v1/motorcycles?rider_id=${meData.id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  cache: "no-store",
                },
              );

              if (motosRes.ok) {
                const motosData = (await motosRes.json().catch(() => null)) as
                  | Array<Record<string, unknown>>
                  | { data?: Array<Record<string, unknown>> }
                  | null;
                const riderMotos = Array.isArray(motosData)
                  ? motosData
                  : motosData && typeof motosData === "object" && Array.isArray(motosData.data)
                  ? motosData.data
                  : [];

                const riderDevices: Device[] = [];
                for (const m of riderMotos) {
                  const motoId = String(m.id || "");
                  if (!motoId) continue;

                  let lastPos: DeviceLastPosition | null = null;
                  const locRes = await fetch(
                    `${apiUrl}/api/v1/motorcycles/${motoId}/location`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                      cache: "no-store",
                    },
                  );
                  if (locRes.ok) {
                    const locRaw = (await locRes.json().catch(() => null)) as Record<string, unknown> | null;
                    if (locRaw) lastPos = extractLastPosition(locRaw);
                  }

                  const dRes = await fetch(
                    `${apiUrl}/api/v1/devices?motorcycle_id=${motoId}`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                      cache: "no-store",
                    },
                  );

                  if (dRes.ok) {
                    const dData: unknown = await dRes.json().catch(() => null);
                    let rawDevList: RawDevice[] = [];
                    if (Array.isArray(dData)) {
                      rawDevList = dData as RawDevice[];
                    } else if (dData && typeof dData === "object") {
                      const dObj = dData as Record<string, unknown>;
                      if (Array.isArray(dObj.data)) rawDevList = dObj.data as RawDevice[];
                      else if (Array.isArray(dObj.devices)) rawDevList = dObj.devices as RawDevice[];
                      else if ("serial_number" in dObj) rawDevList = [dObj as unknown as RawDevice];
                    }

                    for (const rawD of rawDevList) {
                      riderDevices.push({
                        id: rawD.id || `dev-${motoId}`,
                        serial_number: rawD.serial_number || "—",
                        protocol: rawD.protocol || "GT06",
                        firmware_version: rawD.firmware_version,
                        status: rawD.status === "active" ? "active" : "inactive",
                        last_seen_at: rawD.last_seen_at ?? null,
                        last_position: lastPos,
                        motorcycle: normalizeMoto(m),
                        created_at: rawD.created_at || new Date().toISOString(),
                      });
                    }
                  }
                }

                const activeCount = riderDevices.filter((d) => Boolean(d.last_position)).length;
                const inactiveCount = riderDevices.filter((d) => !d.last_position && Boolean(d.motorcycle)).length;
                const unlinkedCount = riderDevices.filter((d) => !d.motorcycle).length;

                return NextResponse.json({
                  devices: riderDevices,
                  total: riderDevices.length,
                  active_count: activeCount,
                  inactive_count: inactiveCount,
                  unlinked_count: unlinkedCount,
                });
              }
            }
          }
        } catch {
          // Ignora e continua para o tratamento padrão
        }
      }

      let bodyMsg: string | undefined;
      if (devListBody && typeof devListBody === "object") {
        const bodyObj = devListBody as Record<string, unknown>;
        if (
          bodyObj.error &&
          typeof bodyObj.error === "object" &&
          "message" in (bodyObj.error as object)
        ) {
          bodyMsg = String((bodyObj.error as Record<string, unknown>).message);
        } else if ("message" in bodyObj) {
          bodyMsg = String(bodyObj.message);
        }
      }

      return NextResponse.json(
        {
          message: bodyMsg ?? "Falha ao carregar dispositivos do servidor.",
          devices: [],
          total: 0,
          active_count: 0,
          inactive_count: 0,
          unlinked_count: 0,
        },
        { status: devListRes.status >= 500 ? 502 : devListRes.status },
      );
    }

    // Extrai lista bruta de devices
    let rawDevices: RawDevice[] = [];
    if (devListBody) {
      if (Array.isArray(devListBody)) {
        rawDevices = devListBody as RawDevice[];
      } else if (typeof devListBody === "object") {
        const body = devListBody as Record<string, unknown>;
        if (Array.isArray(body.data)) rawDevices = body.data as RawDevice[];
        else if (Array.isArray(body.devices)) rawDevices = body.devices as RawDevice[];
        else if (Array.isArray(body.items)) rawDevices = body.items as RawDevice[];
      }
    }

    if (rawDevices.length === 0) {
      return NextResponse.json({
        devices: [],
        total: 0,
        active_count: 0,
        inactive_count: 0,
        unlinked_count: 0,
      });
    }

    // ── 2. Para cada device: buscar moto + last position em paralelo ──────────
    const results = await Promise.allSettled(
      rawDevices.map(async (rawDev): Promise<Device> => {
        const motorcycleId = rawDev.motorcycle_id;

        // 2a. Busca dados da motocicleta pelo ID
        let motorcycle: AssociatedMotorcycle | null = null;
        if (motorcycleId) {
          const motoRes = await fetch(
            `${apiUrl}/api/v1/motorcycles/${motorcycleId}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            },
          );

          if (motoRes.ok) {
            const motoRaw: unknown = await motoRes.json().catch(() => null);
            if (motoRaw && typeof motoRaw === "object") {
              motorcycle = normalizeMoto(motoRaw as Record<string, unknown>);
            }
          }
        }

        // 2b. Busca última posição da moto
        let last_position: DeviceLastPosition | null = null;
        if (motorcycleId) {
          const locRes = await fetch(
            `${apiUrl}/api/v1/motorcycles/${motorcycleId}/location`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            },
          );

          if (locRes.ok) {
            const locRaw: unknown = await locRes.json().catch(() => null);
            if (locRaw && typeof locRaw === "object") {
              last_position = extractLastPosition(locRaw as Record<string, unknown>);
            }
          }
        }

        return {
          id: rawDev.id,
          serial_number: rawDev.serial_number,
          protocol: rawDev.protocol,
          firmware_version: rawDev.firmware_version,
          status: rawDev.status === "active" ? "active" : "inactive",
          last_seen_at: rawDev.last_seen_at ?? null,
          last_position,
          motorcycle,
          created_at: rawDev.created_at,
        };
      }),
    );

    // Agrega resultados, ignorando falhas individuais
    const devices: Device[] = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : [],
    );

    const activeCount = devices.filter((d) => Boolean(d.last_position)).length;
    const inactiveCount = devices.filter(
      (d) => !d.last_position && Boolean(d.motorcycle),
    ).length;
    const unlinkedCount = devices.filter((d) => !d.motorcycle).length;

    return NextResponse.json({
      devices,
      total: devices.length,
      active_count: activeCount,
      inactive_count: inactiveCount,
      unlinked_count: unlinkedCount,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Não foi possível conectar ao servidor de telemetria.",
        devices: [],
        total: 0,
        active_count: 0,
        inactive_count: 0,
        unlinked_count: 0,
      },
      { status: 502 },
    );
  }
}

/**
 * POST /api/admin/devices
 *
 * Cadastra um novo dispositivo/rastreador no backend.
 * Permite associar imediatamente a uma motocicleta ou deixar em estoque.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sua sessão expirou ou não está autenticada." },
      { status: 401 },
    );
  }

  const apiUrl = getApiUrl();

  try {
    const body = (await request.json().catch(() => null)) as {
      serial_number?: string;
      motorcycle_id?: string | null;
      protocol?: string;
      firmware_version?: string;
      status?: string;
    } | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    const rawSerial = String(body.serial_number || "").trim();
    if (!rawSerial) {
      return NextResponse.json(
        { message: "O número serial / IMEI é obrigatório." },
        { status: 400 },
      );
    }

    // Limpa caracteres especiais não alfanuméricos comuns colados por engano
    const cleanSerial = rawSerial.replace(/[\s\-_]/g, "");

    const payload: Record<string, unknown> = {
      serial_number: cleanSerial,
      status: body.status === "inactive" ? "inactive" : "active",
    };

    if (body.motorcycle_id && typeof body.motorcycle_id === "string" && body.motorcycle_id.trim() !== "") {
      payload.motorcycle_id = body.motorcycle_id.trim();
    }

    if (body.protocol && typeof body.protocol === "string" && body.protocol.trim() !== "") {
      payload.protocol = body.protocol.trim();
    }

    if (body.firmware_version && typeof body.firmware_version === "string" && body.firmware_version.trim() !== "") {
      payload.firmware_version = body.firmware_version.trim();
    }

    const response = await fetch(`${apiUrl}/api/v1/devices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMsg = "Não foi possível cadastrar o dispositivo.";
      if (resBody && typeof resBody === "object") {
        const errObj = resBody as Record<string, unknown>;
        if (errObj.error && typeof errObj.error === "object") {
          const innerErr = errObj.error as Record<string, unknown>;
          if (innerErr.message) errorMsg = String(innerErr.message);
          else if (innerErr.code) errorMsg = `Erro do servidor: ${innerErr.code}`;
        } else if (errObj.message) {
          errorMsg = String(errObj.message);
        }
      }

      if (response.status === 409 || errorMsg.toLowerCase().includes("already exists")) {
        errorMsg = `O IMEI / Serial "${cleanSerial}" já está cadastrado no sistema.`;
      }

      return NextResponse.json(
        { message: errorMsg },
        { status: response.status },
      );
    }

    return NextResponse.json(
      {
        message: "Dispositivo cadastrado com sucesso!",
        device: resBody,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        message:
          err instanceof Error
            ? err.message
            : "Erro de conexão com o servidor ao cadastrar dispositivo.",
      },
      { status: 502 },
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeMoto(raw: Record<string, unknown>): AssociatedMotorcycle {
  const rawRider =
    typeof raw.rider === "object" && raw.rider !== null
      ? (raw.rider as Record<string, unknown>)
      : undefined;

  return {
    id: String(raw.id || ""),
    brand: String(raw.brand || ""),
    model: String(raw.model || ""),
    year: Number(raw.year || 0),
    color: String(raw.color || ""),
    license_plate: String(
      raw.license_plate || raw.licensePlate || raw.plate || "",
    ),
    chassis: raw.chassis ? String(raw.chassis) : undefined,
    rider: rawRider
      ? {
          id: rawRider.id ? String(rawRider.id) : undefined,
          name: String(rawRider.name || ""),
          phone: String(rawRider.phone || ""),
          email: rawRider.email ? String(rawRider.email) : undefined,
        }
      : undefined,
  };
}

/**
 * Extrai last_position do shape retornado por /api/v1/motorcycles/:id/location
 * (mesmo shape que use-motorcycle-location.ts espera):
 * { motorcycle_id, timestamp, position: { latitude, longitude, ... }, motion: { speed, heading } }
 */
function extractLastPosition(
  raw: Record<string, unknown>,
): DeviceLastPosition | null {
  const pos = raw.position as
    | {
        latitude?: number;
        longitude?: number;
        altitude?: number;
        accuracy?: number;
      }
    | undefined;

  if (
    !pos ||
    typeof pos.latitude !== "number" ||
    typeof pos.longitude !== "number"
  ) {
    return null;
  }

  const motion = raw.motion as
    | { speed?: number; heading?: number }
    | undefined;

  return {
    latitude: pos.latitude,
    longitude: pos.longitude,
    altitude: pos.altitude,
    accuracy: pos.accuracy,
    speed: motion?.speed,
    heading: motion?.heading,
    timestamp: String(raw.timestamp || new Date().toISOString()),
  };
}
