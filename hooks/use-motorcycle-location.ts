"use client";

import { useEffect, useState } from "react";
import type { TelemetryPoint } from "@/app/dashboard/components/live-telemetry-modal";

export type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: TelemetryPoint; isRevalidating?: boolean }
  | { status: "error"; message: string };

export interface UseMotorcycleLocationOptions {
  /** Intervalo opcional (ms) para atualização automática silenciosa enquanto a aba estiver visível. */
  pollIntervalMs?: number;
  /** Permite pausar requisições quando outro modal/stream já está ativo. */
  enabled?: boolean;
}

const MAX_CACHE_ENTRIES = 64;
const locationCache = new Map<string, TelemetryPoint>();

function setCachedLocation(id: string, point: TelemetryPoint) {
  if (locationCache.size >= MAX_CACHE_ENTRIES && !locationCache.has(id)) {
    const oldestKey = locationCache.keys().next().value;
    if (oldestKey !== undefined) {
      locationCache.delete(oldestKey);
    }
  }
  locationCache.set(id, point);
}

export function getCachedMotorcycleLocation(id: string | undefined): TelemetryPoint | undefined {
  return id ? locationCache.get(id) : undefined;
}

/**
 * Busca a última localização registrada de uma motocicleta via
 * GET /api/motorcycles/[id]/location com cache em memória (stale-while-revalidate)
 * e cancelamento automático via AbortController em trocas rápidas de veículo.
 */
export function useMotorcycleLocation(
  motorcycleId: string | undefined,
  options?: UseMotorcycleLocationOptions,
): LocationState {
  const pollIntervalMs = options?.pollIntervalMs ?? 0;
  const enabled = options?.enabled ?? true;

  const [state, setState] = useState<LocationState>(() => {
    if (!motorcycleId) return { status: "idle" };
    const cached = locationCache.get(motorcycleId);
    if (cached) {
      return { status: "ok", data: cached, isRevalidating: true };
    }
    return { status: "loading" };
  });
  const [prevId, setPrevId] = useState(motorcycleId);

  if (motorcycleId !== prevId) {
    setPrevId(motorcycleId);
    if (!motorcycleId) {
      setState({ status: "idle" });
    } else {
      const cached = locationCache.get(motorcycleId);
      setState(
        cached
          ? { status: "ok", data: cached, isRevalidating: true }
          : { status: "loading" },
      );
    }
  }

  useEffect(() => {
    if (!motorcycleId || !enabled) {
      return;
    }

    let active = true;
    let currentController: AbortController | null = null;

    async function fetchLocation(isBackgroundPoll = false) {
      if (isBackgroundPoll && typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;

      try {
        const res = await fetch(`/api/motorcycles/${motorcycleId}/location`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!active || controller.signal.aborted) return;

        if (!res.ok) {
          // Se já temos posição em cache e falhou um poll silencioso, preserva o estado válido
          const existing = locationCache.get(motorcycleId!);
          if (existing) {
            setState({ status: "ok", data: existing, isRevalidating: false });
            return;
          }
          const body = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          setState({
            status: "error",
            message: body?.message ?? "Falha ao carregar localizacao.",
          });
          return;
        }

        const raw = (await res.json()) as Record<string, unknown>;
        if (!active || controller.signal.aborted) return;

        const pos = raw.position as
          | { latitude: number; longitude: number; altitude?: number; accuracy?: number }
          | undefined;

        if (!pos) {
          const existing = locationCache.get(motorcycleId!);
          if (existing) {
            setState({ status: "ok", data: existing, isRevalidating: false });
            return;
          }
          setState({ status: "error", message: "Resposta sem dados de posicao." });
          return;
        }

        const motion = raw.motion as
          | { speed?: number; heading?: number; acceleration?: number }
          | undefined;

        const device = raw.device as
          | { battery?: number; signal?: number; ignition?: boolean }
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
            ? { battery: device.battery, signal: device.signal, ignition: device.ignition }
            : undefined,
        };

        setCachedLocation(motorcycleId!, point);
        if (active) {
          setState({ status: "ok", data: point, isRevalidating: false });
        }
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;

        const existing = locationCache.get(motorcycleId!);
        if (existing) {
          setState({ status: "ok", data: existing, isRevalidating: false });
          return;
        }
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    void fetchLocation(false);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (pollIntervalMs > 0) {
      intervalId = setInterval(() => {
        void fetchLocation(true);
      }, pollIntervalMs);
    }

    return () => {
      active = false;
      currentController?.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [motorcycleId, pollIntervalMs, enabled]);

  return state;
}
