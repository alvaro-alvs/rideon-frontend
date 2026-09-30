"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity,
  Bike,
  Compass,
  Cpu,
  MapPin,
  Radio,
  RefreshCw,
  User,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

import { GoogleMapView } from "@/app/dashboard/components/google-map-view";
import type { Device, DeviceLastPosition } from "@/lib/types/device";

interface DeviceMapModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TelemetryPayload {
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

export function DeviceMapModal({ device, isOpen, onClose }: DeviceMapModalProps) {
  if (!isOpen || !device) return null;

  return <DeviceMapModalContent device={device} isOpen={isOpen} onClose={onClose} />;
}

function DeviceMapModalContent({
  device,
  isOpen,
  onClose,
}: {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState<DeviceLastPosition | null>(
    device.last_position || null,
  );
  const [history, setHistory] = useState<
    Array<{ latitude: number; longitude: number }>
  >(
    device.last_position
      ? [
          {
            latitude: device.last_position.latitude,
            longitude: device.last_position.longitude,
          },
        ]
      : [],
  );

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [isPulsing, setIsPulsing] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);
  const retryCountRef = useRef(0);
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Esc key and scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Sync state if device prop updates from parent
  useEffect(() => {
    if (device.last_position) {
      setPosition((prev) => {
        if (!prev) return device.last_position || null;
        const prevTime = new Date(prev.timestamp).getTime();
        const nextTime = new Date(device.last_position!.timestamp).getTime();
        if (nextTime >= prevTime) {
          return device.last_position || prev;
        }
        return prev;
      });
    }
  }, [device]);

  // Trigger visual highlight when metrics update
  const triggerPulse = useCallback(() => {
    setIsPulsing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setIsPulsing(false);
    }, 1200);
  }, []);

  // Resolves WebSocket URL
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
          // fallback
        }
      }

      const host = window.location.hostname || "localhost";
      return `${protocol}//${host}:8080/ws?token=${encodeURIComponent(token)}`;
    }

    return `${envWs || "ws://localhost:8080/ws"}?token=${encodeURIComponent(token)}`;
  }

  // Maps Go/REST payload to TelemetryPayload
  function mapToTelemetry(raw: Record<string, unknown>): TelemetryPayload | null {
    const pos = (raw.Position || raw.position) as Record<string, unknown> | undefined;
    if (!pos) return null;

    const motion = (raw.Motion || raw.motion) as Record<string, unknown> | undefined;
    const dev = (raw.Device || raw.device) as Record<string, unknown> | undefined;

    const toNum = (val: unknown, fallback = 0): number => {
      const n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    return {
      event_id: (raw.EventID || raw.event_id || raw.eventId) as string | undefined,
      device_id: (raw.DeviceID || raw.device_id || raw.deviceId) as string | undefined,
      motorcycle_id: (raw.MotorcycleID || raw.motorcycle_id || raw.motorcycleId) as
        | string
        | undefined,
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
      device: dev
        ? {
            battery: toNum(dev.Battery ?? dev.battery),
            signal: toNum(dev.Signal ?? dev.signal),
          }
        : undefined,
    };
  }

  // 1. WebSocket Live Telemetry Connection
  useEffect(() => {
    let isMounted = true;
    intentionalCloseRef.current = false;

    async function connectWs() {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      setConnectionStatus("connecting");

      try {
        const res = await fetch("/api/auth/token", { cache: "no-store" });
        if (!res.ok) {
          if (isMounted) setConnectionStatus("error");
          return;
        }

        const data = await res.json();
        const token = data.token;
        if (!token) {
          if (isMounted) setConnectionStatus("error");
          return;
        }

        const wsUrl = resolveWsUrl(token);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          retryCountRef.current = 0;
          if (isMounted) setConnectionStatus("connected");
        };

        ws.onmessage = (event) => {
          try {
            const rawData = JSON.parse(event.data);
            const mapped = mapToTelemetry(rawData);
            if (!mapped || !isMounted) return;

            // Check if this telemetry matches current device / IMEI / motorcycle
            const matchesDeviceId = mapped.device_id && mapped.device_id === device.id;
            const matchesImei =
              mapped.imei &&
              device.serial_number &&
              mapped.imei.toLowerCase() === device.serial_number.toLowerCase();
            const matchesMotorcycle =
              device.motorcycle?.id &&
              mapped.motorcycle_id &&
              mapped.motorcycle_id === device.motorcycle.id;

            if (matchesDeviceId || matchesImei || matchesMotorcycle) {
              const updatedPosition: DeviceLastPosition = {
                latitude: mapped.position.latitude,
                longitude: mapped.position.longitude,
                altitude: mapped.position.altitude,
                accuracy: mapped.position.accuracy,
                speed: mapped.motion?.speed,
                heading: mapped.motion?.heading,
                timestamp: mapped.timestamp || new Date().toISOString(),
              };

              setPosition(updatedPosition);
              setHistory((prev) => [
                ...prev.slice(-99),
                {
                  latitude: mapped.position.latitude,
                  longitude: mapped.position.longitude,
                },
              ]);
              triggerPulse();
            }
          } catch (err) {
            console.error("[WS] Erro ao processar telemetria em tempo real:", err);
          }
        };

        ws.onerror = () => {
          if (isMounted) setConnectionStatus("error");
        };

        ws.onclose = (e) => {
          if (isMounted) {
            if (intentionalCloseRef.current) {
              setConnectionStatus("disconnected");
            } else {
              setConnectionStatus("error");
              if (retryCountRef.current < 5) {
                const delay = Math.min(
                  1500 * Math.pow(1.8, retryCountRef.current),
                  10000,
                );
                retryCountRef.current += 1;
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (isMounted) connectWs();
                }, delay);
              }
            }
          }
        };
      } catch {
        if (isMounted) setConnectionStatus("error");
      }
    }

    void connectWs();

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
  }, [device.id, device.serial_number, device.motorcycle?.id, reconnectTrigger, triggerPulse]);

  // 2. High-frequency REST polling fallback / complement (every 3.5s while open)
  useEffect(() => {
    if (!device.motorcycle?.id) return;

    const motoId = device.motorcycle.id;
    let active = true;

    const pollLocation = async () => {
      try {
        const res = await fetch(`/api/motorcycles/${motoId}/location`, {
          cache: "no-store",
        });
        if (!res.ok || !active) return;

        const raw = (await res.json()) as Record<string, unknown>;
        const pos = raw.position as
          | {
              latitude?: number;
              longitude?: number;
              altitude?: number;
              accuracy?: number;
            }
          | undefined;

        if (
          pos &&
          typeof pos.latitude === "number" &&
          typeof pos.longitude === "number"
        ) {
          const motion = raw.motion as
            | { speed?: number; heading?: number }
            | undefined;
          const timestamp = String(raw.timestamp || new Date().toISOString());

          setPosition((prev) => {
            // Check if newer or changed
            const isDifferent =
              !prev ||
              prev.latitude !== pos.latitude ||
              prev.longitude !== pos.longitude ||
              prev.speed !== motion?.speed ||
              prev.heading !== motion?.heading ||
              prev.timestamp !== timestamp;

            if (isDifferent) {
              triggerPulse();
              setHistory((h) => [
                ...h.slice(-99),
                { latitude: pos.latitude!, longitude: pos.longitude! },
              ]);
              return {
                latitude: pos.latitude!,
                longitude: pos.longitude!,
                altitude: pos.altitude,
                accuracy: pos.accuracy,
                speed: motion?.speed,
                heading: motion?.heading,
                timestamp,
              };
            }
            return prev;
          });
        }
      } catch {
        // silent fallback
      }
    };

    const interval = setInterval(() => {
      void pollLocation();
    }, 3500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [device.motorcycle?.id, triggerPulse]);

  const moto = device.motorcycle;

  const copyCoordinates = () => {
    if (!position) return;
    const text = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardinalText = getHeadingDirection(position?.heading);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 flex h-[90vh] max-h-[850px] w-full max-w-5xl flex-col overflow-hidden border border-border bg-card shadow-2xl shadow-black/80">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-secondary/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Cpu className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[.14em] text-primary">
                  Telemetria em Tempo Real
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {device.serial_number}
                </span>
              </div>
              <h2 className="text-lg font-bold uppercase text-foreground">
                {device.serial_number !== "—" ? device.serial_number : "Sem Rastreador"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Connection Badge */}
            {connectionStatus === "connected" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <Wifi className="size-3 text-emerald-400" />
                Posição Ativa (Ao Vivo)
              </span>
            ) : connectionStatus === "connecting" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                <Zap className="size-3 animate-spin" />
                Conectando...
              </span>
            ) : position ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Posição Ativa
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                <span className="size-2 rounded-full bg-muted-foreground/60" />
                Sem Posição Recente
              </span>
            )}

            {(connectionStatus === "error" || connectionStatus === "disconnected") && (
              <button
                type="button"
                onClick={() => {
                  retryCountRef.current = 0;
                  intentionalCloseRef.current = false;
                  setReconnectTrigger((n) => n + 1);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-colors"
                title="Tentar reconectar stream"
              >
                <RefreshCw className="size-3" />
                <span className="hidden sm:inline">Reconectar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-foreground focus:outline-none cursor-pointer"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Content Body: Map + Info Sidebar */}
        <div className="grid flex-1 overflow-hidden lg:grid-cols-3">
          {/* Map Area */}
          <div className="relative h-[320px] bg-background lg:col-span-2 lg:h-full">
            {position ? (
              <>
                <GoogleMapView
                  position={{
                    latitude: position.latitude,
                    longitude: position.longitude,
                  }}
                  heading={position.heading ?? 0}
                  history={history}
                />
                {/* Floating Coordinates Tag */}
                <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border/90 bg-background/90 p-2.5 backdrop-blur shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-primary" />
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  </span>
                  <button
                    type="button"
                    onClick={copyCoordinates}
                    className="ml-2 rounded-lg border border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="grid size-16 place-items-center rounded-full border border-dashed border-border bg-secondary text-muted-foreground">
                  <Radio className="size-8 opacity-50" />
                </div>
                <h3 className="mt-4 text-base font-bold uppercase text-foreground">
                  Sem Localização Transmitida
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Este dispositivo ainda não reportou coordenadas GPS ou está sem sinal de rede no momento.
                </p>
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="flex flex-col overflow-y-auto border-t border-border bg-card p-5 lg:border-t-0 lg:border-l">
            {/* Associated Motorcycle Box */}
            <div className="rounded-2xl border border-border bg-secondary/50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-primary">
                <Bike className="size-4" />
                <span>Motocicleta Vinculada</span>
              </div>
              {moto ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {moto.brand} {moto.model}
                    </span>
                    {/* Mercosul plate badge */}
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-blue-500/60 bg-neutral-900 text-[11px] font-bold shadow">
                      <span className="bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        BR
                      </span>
                      <span className="px-2 py-0.5 tracking-wider text-foreground font-mono">
                        {moto.license_plate}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Ano: <b className="text-foreground">{moto.year}</b>
                    </span>
                    <span>
                      Cor: <b className="text-foreground">{moto.color}</b>
                    </span>
                  </div>

                  {moto.rider && (
                    <div className="mt-3 border-t border-border/80 pt-3">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <User className="size-3 text-primary" />
                        <span>Piloto</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-foreground">
                        {moto.rider.name}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {moto.rider.phone}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Nenhuma motocicleta associada a este dispositivo.
                </p>
              )}
            </div>

            {/* Live Metrics Grid (Velocidade & Direção) */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Velocidade Card */}
              <div
                className={`rounded-2xl border p-3.5 transition-all duration-300 ${
                  isPulsing
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(239,37,27,0.15)]"
                    : "border-border bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Activity className="size-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Velocidade
                    </span>
                  </div>
                  {isPulsing && (
                    <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  )}
                </div>
                <p className="mt-1.5 text-2xl font-black text-foreground tracking-tight">
                  {position?.speed !== undefined
                    ? `${Math.round(position.speed)} km/h`
                    : "—"}
                </p>
              </div>

              {/* Direção Card */}
              <div
                className={`rounded-2xl border p-3.5 transition-all duration-300 ${
                  isPulsing
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(239,37,27,0.15)]"
                    : "border-border bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Compass
                      className="size-4 text-primary transition-transform duration-500 ease-out"
                      style={{
                        transform: `rotate(${position?.heading ?? 0}deg)`,
                      }}
                    />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Direção
                    </span>
                  </div>
                  {isPulsing && (
                    <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
                  <span className="text-2xl font-black text-foreground tracking-tight">
                    {position?.heading !== undefined
                      ? `${Math.round(position.heading)}°`
                      : "—"}
                  </span>
                  {cardinalText && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {cardinalText}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Address & Timestamp Info */}
            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-secondary/30 p-4 text-xs">
              {position?.address && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Endereço aproximado
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {position.address}
                  </p>
                </div>
              )}

              {/* Horário / Última Atualização */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Última Atualização
                  </span>
                  {position?.timestamp && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ao Vivo
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 font-mono text-xs font-semibold text-foreground transition-colors duration-300 ${
                    isPulsing ? "text-emerald-400" : ""
                  }`}
                >
                  {position?.timestamp
                    ? new Date(position.timestamp).toLocaleString("pt-BR")
                    : "Nenhum registro"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Serial / IMEI
                  </span>
                  <p className="font-mono text-[11px] text-foreground truncate font-semibold">
                    {device.serial_number}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Firmware
                  </span>
                  <p className="font-mono text-[11px] text-foreground">
                    {device.firmware_version || "—"}
                  </p>
                </div>
                {device.protocol && (
                  <div className="col-span-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Protocolo
                    </span>
                    <p className="mt-0.5 text-xs font-extrabold uppercase text-primary font-mono">
                      {device.protocol}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getHeadingDirection(heading: number | undefined): string {
  if (heading === undefined || heading === null) return "";
  const normalized = ((heading % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "Norte (N)";
  if (normalized >= 22.5 && normalized < 67.5) return "Nordeste (NE)";
  if (normalized >= 67.5 && normalized < 112.5) return "Leste (L)";
  if (normalized >= 112.5 && normalized < 157.5) return "Sudeste (SE)";
  if (normalized >= 157.5 && normalized < 202.5) return "Sul (S)";
  if (normalized >= 202.5 && normalized < 247.5) return "Sudoeste (SO)";
  if (normalized >= 247.5 && normalized < 292.5) return "Oeste (O)";
  return "Noroeste (NO)";
}
