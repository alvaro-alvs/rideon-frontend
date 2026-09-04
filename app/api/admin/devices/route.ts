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

      // Se o backend retornar 403, a conta de fato não possui privilégios de admin
      if (devListRes.status === 403) {
        return NextResponse.json(
          {
            message:
              "Acesso restrito. Esta conta não possui privilégios de administrador para listar todos os dispositivos.",
            devices: [],
            total: 0,
            active_count: 0,
            inactive_count: 0,
            unlinked_count: 0,
          },
          { status: 403 },
        );
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
