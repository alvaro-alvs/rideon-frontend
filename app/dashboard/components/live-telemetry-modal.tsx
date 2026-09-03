"use client";

import { useEffect, useState, useRef } from "react";
import {
  Activity,
  BatteryCharging,
  Compass,
  MapPin,
  Radio,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

import { GoogleMapView } from "./google-map-view";
import { useMotorcycleLocation } from "@/hooks/use-motorcycle-location";

interface LiveTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId?: string;
  motorcycleInfo?: {
    model: string;
    licensePlate: string;
  };
}

export interface TelemetryPoint {
  event_id?: string;
  device_id?: string;
  motorcycle_id?: string;
  imei?: string;
  timestamp?: string;
  position: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
  };
  motion?: {
    speed?: number;
    heading?: number;
    acceleration?: number;
  };
  device?: {
    battery?: number;
    signal?: number;
  };
}

// Ponto neutro usado enquanto a localização real ainda não foi carregada
const NEUTRAL_POSITION: TelemetryPoint = {
  position: { latitude: 0, longitude: 0 },
};

export function LiveTelemetryModal(props: LiveTelemetryModalProps) {
  if (!props.isOpen) return null;
  return <LiveTelemetryModalContent {...props} />;
}

function LiveTelemetryModalContent({
  onClose,
  motorcycleId,
  motorcycleInfo = { model: "Honda CG 160", licensePlate: "ABC1234" },
}: LiveTelemetryModalProps) {
  const locationState = useMotorcycleLocation(motorcycleId);

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");

  const [telemetry, setTelemetry] = useState<TelemetryPoint>(NEUTRAL_POSITION);
  const [history, setHistory] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const seededRef = useRef(false);

  // Seed com a última localização persistida assim que a API responder
  useEffect(() => {
    if (locationState.status === "ok" && !seededRef.current) {
      seededRef.current = true;
      setTelemetry(locationState.data);
      setHistory([
        {
          latitude: locationState.data.position.latitude,
          longitude: locationState.data.position.longitude,
        },
      ]);
    }
  }, [locationState]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);
  const retryCountRef = useRef(0);

  // Determina URL resiliente do WebSocket (lida com redes locais, IP e HTTPS)
  function resolveWsUrl(token: string): string {
    const envWs = process.env.NEXT_PUBLIC_WS_URL;
    if (typeof window !== "undefined") {
      const isHttps = window.location.protocol === "https:";
      const protocol = isHttps ? "wss:" : "ws:";

      if (envWs) {
        try {
          const parsed = new URL(envWs);
          if (
            window.location.hostname !== "localhost" &&
            window.location.hostname !== "127.0.0.1" &&
            (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
          ) {
            parsed.hostname = window.location.hostname;
          }
          if (isHttps && parsed.protocol === "ws:") {
            parsed.protocol = "wss:";
          }
          parsed.searchParams.set("token", token);
          return parsed.toString();
        } catch {
          // Segue para fallback se envWs não for URL absoluta válida
        }
      }

      const host = window.location.hostname || "localhost";
      return `${protocol}//${host}:8080/ws?token=${encodeURIComponent(token)}`;
    }

    return `${envWs || "ws://localhost:8080/ws"}?token=${encodeURIComponent(token)}`;
  }

  // Maps PascalCase (Go backend struct) ou camelCase/snake_case payload to TelemetryPoint
  function mapToTelemetry(raw: Record<string, unknown>): TelemetryPoint | null {
    const pos = (raw.Position || raw.position) as Record<string, unknown> | undefined;
    if (!pos) return null;

    const motion = (raw.Motion || raw.motion) as Record<string, unknown> | undefined;
    const device = (raw.Device || raw.device) as Record<string, unknown> | undefined;

    const toNum = (val: unknown, fallback = 0): number => {
      const n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    return {
      event_id: (raw.EventID || raw.event_id || raw.eventId) as string | undefined,
      device_id: (raw.DeviceID || raw.device_id || raw.deviceId) as string | undefined,
      motorcycle_id: (raw.MotorcycleID || raw.motorcycle_id || raw.motorcycleId) as string | undefined,
      imei: (raw.IMEI || raw.imei) as string | undefined,
      timestamp: (raw.Timestamp || raw.timestamp) as string | undefined,
      position: {
        latitude: toNum(pos.Latitude ?? pos.latitude),
        longitude: toNum(pos.Longitude ?? pos.longitude),
        altitude: toNum(pos.Altitude ?? pos.altitude),
        accuracy: toNum(pos.Accuracy ?? pos.accuracy),
      },
      motion: motion
        ? {
            speed: toNum(motion.Speed ?? motion.speed),
            heading: toNum(motion.Heading ?? motion.heading),
            acceleration: toNum(motion.Acceleration ?? motion.acceleration),
          }
        : undefined,
      device: device
        ? {
            battery: toNum(device.Battery ?? device.battery),
            signal: toNum(device.Signal ?? device.signal),
          }
        : undefined,
    };
  }

  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    intentionalCloseRef.current = false;

    async function connect() {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      setConnectionStatus("connecting");

      try {
        const res = await fetch("/api/auth/token", { cache: "no-store" });
        if (!res.ok) {
          console.warn(
            "[WS] Falha ao obter token de autenticação (/api/auth/token status:",
            res.status,
            ")",
          );
          if (isMounted) setConnectionStatus("error");
          return;
        }

        const data = await res.json();
        const token = data.token;

        if (!token) {
          console.warn("[WS] Token de autenticação não retornado pela API");
          if (isMounted) setConnectionStatus("error");
          return;
        }

        const wsUrl = resolveWsUrl(token);
        console.log("[WS] Conectando ao WebSocket...");

        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[WS] Conectado com sucesso");
          retryCountRef.current = 0;
          if (isMounted) setConnectionStatus("connected");
        };

        ws.onmessage = (event) => {
          try {
            const rawData = JSON.parse(event.data);
            const mapped = mapToTelemetry(rawData);
            if (!mapped || !isMounted) return;

            // Correlaciona imediatamente a telemetria com a motocicleta ativa
            if (
              motorcycleId &&
              mapped.motorcycle_id &&
              mapped.motorcycle_id !== motorcycleId
            ) {
              return;
            }

            setTelemetry(mapped);
            if (mapped.position.latitude && mapped.position.longitude) {
              setHistory((prev) => [
                ...prev.slice(-49),
                {
                  latitude: mapped.position.latitude,
                  longitude: mapped.position.longitude,
                },
              ]);
            }
          } catch (err) {
            console.error("[WS] Erro ao processar dados de telemetria:", err);
          }
        };

        ws.onerror = (e) => {
          console.error("[WS] Erro no WebSocket:", e);
          if (isMounted) setConnectionStatus("error");
        };

        ws.onclose = (e) => {
          console.log(
            `[WS] Fechado (código: ${e.code}, motivo: "${e.reason || "sem detalhes"}")`,
          );
          if (isMounted) {
            if (intentionalCloseRef.current) {
              setConnectionStatus("disconnected");
            } else {
              setConnectionStatus("error");
              // Tentativa de reconexão automática com backoff exponencial
              if (retryCountRef.current < 5) {
                const delay = Math.min(
                  1500 * Math.pow(1.8, retryCountRef.current),
                  10000,
                );
                retryCountRef.current += 1;
                console.log(
                  `[WS] Tentando reconectar em ${Math.round(delay)}ms (tentativa ${retryCountRef.current}/5)...`,
                );
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (isMounted) {
                    connect();
                  }
                }, delay);
              }
            }
          }
        };
      } catch (err) {
        console.error("[WS] Erro na inicialização:", err);
        if (isMounted) setConnectionStatus("error");
      }
    }

    connect();

    return () => {
      isMounted = false;
      intentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [motorcycleId, reconnectTrigger]);

  const currentSpeed = telemetry.motion?.speed ?? 0;
  const currentBattery = telemetry.device?.battery ?? 0;
  const currentSignal = telemetry.device?.signal ?? 0;
  const currentHeading = telemetry.motion?.heading ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 md:p-6 animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-7xl flex-col overflow-hidden border border-border bg-background shadow-2xl">
        {/* Modal Header */}
        <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded bg-primary/10 text-primary">
              <Radio className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="section-kicker">Monitoramento em Tempo Real</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    connectionStatus === "connected"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                      : connectionStatus === "connecting"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                        : "bg-red-500/10 text-red-500 border border-red-500/30"
                  }`}
                >
                  {connectionStatus === "connected" ? (
                    <>
                      <Wifi className="size-3" /> Conectado
                    </>
                  ) : connectionStatus === "connecting" ? (
                    <>
                      <Zap className="size-3 animate-spin" /> Conectando...
                    </>
                  ) : (
                    <>
                      <WifiOff className="size-3" /> Desconectado
                    </>
                  )}
                </span>
                {(connectionStatus === "error" || connectionStatus === "disconnected") && (
                  <button
                    onClick={() => {
                      retryCountRef.current = 0;
                      intentionalCloseRef.current = false;
                      setReconnectTrigger((n) => n + 1);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <RefreshCw className="size-2.5" /> Reconectar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold uppercase text-foreground md:text-base">
                  {motorcycleInfo.model} • <span className="text-muted-foreground">{motorcycleInfo.licensePlate}</span>
                </h2>
                {telemetry.imei && (
                  <span className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
                    IMEI: {telemetry.imei}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Fechar monitoramento"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Content / Map Area */}
        <div className="relative flex-1 bg-black">
          {/* Overlay enquanto a localização inicial não chegou da API */}
          {(locationState.status === "idle" ||
            locationState.status === "loading") && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
              <span className="relative flex size-10">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="size-5 text-primary" />
                </span>
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Obtendo localização...
              </p>
            </div>
          )}

          <GoogleMapView
            position={telemetry.position}
            heading={currentHeading}
            history={history}
          />

          {/* Floating Live Telemetry Cards */}
          <div className="absolute top-4 left-4 right-4 z-10 grid grid-cols-2 gap-2 sm:grid-cols-4 md:w-auto md:max-w-xl">
            <div className="flex flex-col border border-border bg-card/90 p-3 backdrop-blur-md">
              <div className="flex items-center gap-2 text-primary">
                <Activity className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Velocidade
                </span>
              </div>
              <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                {currentSpeed.toFixed(1)}{" "}
                <span className="text-xs font-normal text-muted-foreground">km/h</span>
              </p>
            </div>

            <div className="flex flex-col border border-border bg-card/90 p-3 backdrop-blur-md">
              <div className="flex items-center gap-2 text-primary">
                <BatteryCharging className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Bateria
                </span>
              </div>
              <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                {currentBattery}{" "}
                <span className="text-xs font-normal text-muted-foreground">%</span>
              </p>
            </div>

            <div className="flex flex-col border border-border bg-card/90 p-3 backdrop-blur-md">
              <div className="flex items-center gap-2 text-primary">
                <Radio className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Sinal GPRS
                </span>
              </div>
              <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                {currentSignal}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ 5</span>
              </p>
            </div>

            <div className="flex flex-col border border-border bg-card/90 p-3 backdrop-blur-md">
              <div className="flex items-center gap-2 text-primary">
                <Compass className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Direção
                </span>
              </div>
              <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                {currentHeading.toFixed(0)}°
              </p>
            </div>
          </div>

          {/* Bottom Floating Coordinates Bar */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 border border-border bg-card/90 p-3 backdrop-blur-md text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span className="font-mono text-muted-foreground">
                Lat: <strong className="text-foreground">{telemetry.position.latitude.toFixed(6)}</strong> | Lng:{" "}
                <strong className="text-foreground">{telemetry.position.longitude.toFixed(6)}</strong>
              </span>
            </div>
            {telemetry.timestamp && (
              <span className="text-[11px] text-muted-foreground">
                Última atualização:{" "}
                <span className="font-semibold text-foreground">
                  {new Date(telemetry.timestamp).toLocaleTimeString()}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
