"use client";

import { useEffect, useState } from "react";
import type { TelemetryPoint } from "@/app/dashboard/components/live-telemetry-modal";

export type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: TelemetryPoint }
  | { status: "error"; message: string };

/**
 * Busca a última localização registrada de uma motocicleta via
 * GET /api/motorcycles/[id]/location (proxy Next.js → backend).
 *
 * Retorna `{ status: "idle" }` se nenhum `motorcycleId` for fornecido.
 */
export function useMotorcycleLocation(motorcycleId: string | undefined) {
  const [state, setState] = useState<LocationState>(
    motorcycleId ? { status: "loading" } : { status: "idle" },
  );
  const [prevId, setPrevId] = useState(motorcycleId);

  if (motorcycleId !== prevId) {
    setPrevId(motorcycleId);
    setState(motorcycleId ? { status: "loading" } : { status: "idle" });
  }

  useEffect(() => {
    if (!motorcycleId) {
      return;
    }

    let active = true;

    async function fetchLocation() {

      try {
        const res = await fetch(`/api/motorcycles/${motorcycleId}/location`, {
          cache: "no-store",
        });

        if (!active) return;

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          setState({
            status: "error",
            message: body?.message ?? "Falha ao carregar localizacao.",
          });
          return;
        }

        // O backend retorna o shape documentado no endpoint 5.8:
        // { motorcycle_id, timestamp, position: { latitude, longitude, altitude, accuracy },
        //   motion: { speed, heading, acceleration }, device: { battery, signal } }
        const raw = (await res.json()) as Record<string, unknown>;

        const pos = raw.position as
          | { latitude: number; longitude: number; altitude?: number; accuracy?: number }
          | undefined;

        if (!pos) {
          setState({ status: "error", message: "Resposta sem dados de posicao." });
          return;
        }

        const motion = raw.motion as
          | { speed?: number; heading?: number; acceleration?: number }
          | undefined;

        const device = raw.device as
          | { battery?: number; signal?: number }
          | undefined;

        const point: TelemetryPoint = {
          motorcycle_id: (raw.motorcycle_id as string) ?? undefined,
          timestamp: (raw.timestamp as string) ?? undefined,
          position: {
            latitude: pos.latitude,
            longitude: pos.longitude,
            altitude: pos.altitude,
            accuracy: pos.accuracy,
          },
          motion: motion
            ? {
                speed: motion.speed,
                heading: motion.heading,
                acceleration: motion.acceleration,
              }
            : undefined,
          device: device
            ? { battery: device.battery, signal: device.signal }
            : undefined,
        };

        if (active) setState({ status: "ok", data: point });
      } catch (err) {
        if (!active) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    void fetchLocation();

    return () => {
      active = false;
    };
  }, [motorcycleId]);

  return state;
}
