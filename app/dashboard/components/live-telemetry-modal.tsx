"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  BatteryCharging,
  Compass,
  Info,
  MapPin,
  MapPinOff,
  PanelRightClose,
  PanelRightOpen,
  Radar,
  Radio,
  RefreshCw,
  Share2,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

import { GoogleMapView } from "./google-map-view";
import { CommandControlPanel } from "./command-control-modal";
import { ShareLinkPanel } from "./share-link-modal";
import { GeofenceQuickPanel } from "./geofence-panel";
import { useMotorcycleLocation } from "@/hooks/use-motorcycle-location";
import { isValidCoordinate } from "@/lib/geo";
import type { GeofenceEventItem, GeofenceItem } from "@/lib/types/protection";

interface LiveTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId?: string;
  isAdmin?: boolean;
  initialTab?: "telemetry" | "geofences" | "commands" | "share";
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
    ignition?: boolean;
  };
}

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
  isAdmin = false,
  initialTab = "telemetry",
  motorcycleInfo = { model: "Honda CG 160", licensePlate: "ABC1234" },
}: LiveTelemetryModalProps) {
  const locationState = useMotorcycleLocation(motorcycleId);

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");

  const [telemetry, setTelemetry] = useState<TelemetryPoint>(NEUTRAL_POSITION);
  const [history, setHistory] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);
  const [events, setEvents] = useState<GeofenceEventItem[]>([]);
  const [breachBanner, setBreachBanner] = useState<string | null>(null);
  const [anchorBusy, setAnchorBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"telemetry" | "geofences" | "commands" | "share">(initialTab);
  const [panelOpen, setPanelOpen] = useState(true);
  const seededRef = useRef(false);

  useEffect(() => {
    if (locationState.status === "ok" && !seededRef.current) {
      seededRef.current = true;
      setTelemetry(locationState.data);
      if (isValidCoordinate(locationState.data.position.latitude, locationState.data.position.longitude)) {
        setHistory([
          {
            latitude: locationState.data.position.latitude,
            longitude: locationState.data.position.longitude,
          },
        ]);
      }
    }
  }, [locationState]);

  const loadGeofenceData = useCallback(async () => {
    if (!motorcycleId) return;
    const [gfRes, evRes] = await Promise.all([
      fetch(`/api/geofences?motorcycle_id=${motorcycleId}`, { cache: "no-store" }),
      fetch(`/api/geofences/events?motorcycle_id=${motorcycleId}&limit=15`, { cache: "no-store" }),
    ]);
    if (gfRes.ok) {
      const data = (await gfRes.json()) as { data?: GeofenceItem[] };
      setGeofences(Array.isArray(data.data) ? data.data : []);
    }
    if (evRes.ok) {
      const data = (await evRes.json()) as { data?: GeofenceEventItem[] };
      setEvents(Array.isArray(data.data) ? data.data : []);
    }
  }, [motorcycleId]);

  useEffect(() => {
    void loadGeofenceData();
  }, [loadGeofenceData]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);
  const retryCountRef = useRef(0);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  function resolveWsUrl(token: string): string {
    const envWs = process.env.NEXT_PUBLIC_WS_URL;
    if (typeof window !== "undefined") {
      const isHttps = window.location.protocol === "https:";
      const protocol = isHttps ? "wss:" : "ws:";

      if (envWs) {
        try {
          const parsed = new URL(envWs, window.location.origin);
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
            ignition:
              typeof (device.Ignition ?? device.ignition) === "boolean"
                ? ((device.Ignition ?? device.ignition) as boolean)
                : undefined,
          }
        : undefined,
    };
  }

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
        if (!isMounted) return;
        if (!res.ok) {
          setConnectionStatus("error");
          return;
        }
        const data = await res.json();
        if (!isMounted || !data.token) {
          setConnectionStatus("error");
          return;
        }

        const wsUrl = resolveWsUrl(data.token);
        if (wsRef.current) {
          const oldWs = wsRef.current;
          wsRef.current = null;
          oldWs.onopen = null;
          oldWs.onmessage = null;
          oldWs.onerror = null;
          oldWs.onclose = null;
          oldWs.close();
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          retryCountRef.current = 0;
          setConnectionStatus("connected");
        };

        ws.onmessage = (event) => {
          try {
            const rawData = JSON.parse(event.data) as Record<string, unknown>;
            if (rawData.event_type === "geofence_event") {
              const evMoto = String(rawData.motorcycle_id || "").toLowerCase();
              if (!motorcycleId || evMoto === motorcycleId.toLowerCase()) {
                const ev = rawData.event as GeofenceEventItem | undefined;
                if (ev) {
                  setEvents((prev) => [ev, ...prev].slice(0, 20));
                  if (ev.event_type === "exit") {
                    setBreachBanner(`Alerta de Cerca: saiu de "${ev.geofence_name}"`);
                    setTimeout(() => setBreachBanner(null), 12000);
                  }
                }
              }
              return;
            }

            const mapped = mapToTelemetry(rawData);
            if (!mapped || !isMounted) return;

            const activeId = (motorcycleId || "").toLowerCase();
            const eventMotoId = (mapped.motorcycle_id || "").toLowerCase();
            if (activeId && eventMotoId && eventMotoId !== activeId) {
              return;
            }

            setTelemetry(mapped);
            if (isValidCoordinate(mapped.position.latitude, mapped.position.longitude)) {
              setHistory((prev) => [
                ...prev.slice(-49),
                {
                  latitude: mapped.position.latitude,
                  longitude: mapped.position.longitude,
                },
              ]);
            }
          } catch {
            // ignore parse noise
          }
        };

        ws.onerror = () => {
          if (!isMounted || intentionalCloseRef.current) return;
          setConnectionStatus("error");
        };

        ws.onclose = () => {
          if (!isMounted) return;
          if (intentionalCloseRef.current) {
            setConnectionStatus("disconnected");
            return;
          }
          setConnectionStatus("error");
          if (retryCountRef.current < 5) {
            const delay = Math.min(1500 * Math.pow(1.8, retryCountRef.current), 10000);
            retryCountRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted && !intentionalCloseRef.current) {
                void connect();
              }
            }, delay);
          }
        };
      } catch {
        if (!isMounted || intentionalCloseRef.current) return;
        setConnectionStatus("error");
      }
    }

    void connect();
    return () => {
      isMounted = false;
      intentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, [motorcycleId, reconnectTrigger]);

  useEffect(() => {
    if (!motorcycleId) return;
    let active = true;

    const pollLocation = async () => {
      try {
        const res = await fetch(`/api/motorcycles/${motorcycleId}/location`, {
          cache: "no-store",
        });
        if (!active || !res.ok) return;
        const data = (await res.json()) as Record<string, unknown>;
        const mapped = mapToTelemetry(data);
        if (!active || !mapped) return;

        if (isValidCoordinate(mapped.position.latitude, mapped.position.longitude)) {
          setTelemetry((prev) => {
            const prevTime = prev.timestamp ? new Date(prev.timestamp).getTime() : 0;
            const nextTime = mapped.timestamp ? new Date(mapped.timestamp).getTime() : Date.now();
            return nextTime >= prevTime ? mapped : prev;
          });
          setHistory((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.latitude !== mapped.position.latitude || last.longitude !== mapped.position.longitude) {
              return [
                ...prev.slice(-49),
                { latitude: mapped.position.latitude, longitude: mapped.position.longitude },
              ];
            }
            return prev;
          });
        }
      } catch {
        // silent
      }
    };

    void pollLocation();
    const interval = setInterval(() => void pollLocation(), 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [motorcycleId]);

  const handleToggleAnchor = async () => {
    if (!motorcycleId) return;
    setAnchorBusy(true);
    const activeAnchor = geofences.find((g) => g.kind === "anchor" && g.active);
    try {
      const res = await fetch(`/api/motorcycles/${motorcycleId}/anchor`, {
        method: activeAnchor ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: activeAnchor ? undefined : JSON.stringify({ active: true, radius_meters: 60 }),
      });
      if (res.ok) {
        await loadGeofenceData();
      }
    } finally {
      setAnchorBusy(false);
    }
  };

  const handleToggleFenceActive = async (fence: GeofenceItem) => {
    const res = await fetch(`/api/geofences/${fence.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !fence.active }),
    });
    if (res.ok) {
      await loadGeofenceData();
    }
  };

  const hasValidLocation = Boolean(
    telemetry && isValidCoordinate(telemetry.position?.latitude, telemetry.position?.longitude),
  );
  const isLoadingLocation =
    (locationState.status === "loading" || locationState.status === "idle") &&
    !seededRef.current &&
    !hasValidLocation;

  const currentSpeed = telemetry.motion?.speed ?? 0;
  const currentBattery = telemetry.device?.battery ?? 0;
  const currentSignal = telemetry.device?.signal ?? 0;
  const currentHeading = telemetry.motion?.heading ?? 0;
  const hasActiveAnchor = geofences.some((g) => g.kind === "anchor" && g.active);
  const pulseMode = breachBanner ? "breach" : hasActiveAnchor ? "anchor" : "none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 md:p-5 animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Modal Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Radio className="size-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="section-kicker">Cockpit em Tempo Real</span>
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
                      <Wifi className="size-3" /> Ao Vivo
                    </>
                  ) : connectionStatus === "connecting" ? (
                    <>
                      <Zap className="size-3 animate-spin" /> Conectando
                    </>
                  ) : (
                    <>
                      <WifiOff className="size-3" /> Offline
                    </>
                  )}
                </span>
                {hasActiveAnchor && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                    <Radar className="size-3 animate-pulse" /> Âncora Armada
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
                    className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-500/20 cursor-pointer"
                  >
                    <RefreshCw className="size-2.5" /> Reconectar
                  </button>
                )}
              </div>
              <h2 className="truncate text-sm font-bold uppercase text-foreground md:text-base">
                {motorcycleInfo.model} •{" "}
                <span className="text-muted-foreground">{motorcycleInfo.licensePlate}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              title={panelOpen ? "Recolher painel tático" : "Abrir painel tático"}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              {panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
              <span>{panelOpen ? "Ocultar Painel" : "Controles"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              aria-label="Fechar monitoramento"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Split Content: Map + Tactical Side Panel */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Map Area */}
          <div className="relative flex-1 bg-black overflow-hidden min-h-[300px]">
            {breachBanner && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-red-500 bg-red-600/95 px-4 py-2 text-xs font-bold text-white shadow-2xl animate-bounce">
                <ShieldAlert className="size-4" />
                <span>{breachBanner}</span>
              </div>
            )}

            {isLoadingLocation ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
                <span className="relative flex size-10">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                  <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="size-5 text-primary" />
                  </span>
                </span>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Consultando última localização...
                </p>
              </div>
            ) : !hasValidLocation ? (
              <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center bg-card/40 overflow-y-auto">
                <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                  <MapPinOff className="size-8" />
                </div>
                <h3 className="text-lg font-bold uppercase text-foreground">
                  Rastreador aguardando sinal GPS
                </h3>
                <p className="mt-2 max-w-md text-xs text-muted-foreground">
                  Assim que o equipamento enviar coordenadas ao ar livre, o mapa e as cercas aparecerão aqui em tempo real.
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] text-muted-foreground">
                  <Info className="size-4 text-primary shrink-0" />
                  <span>Os comandos e compartilhamento seguem disponíveis no painel ao lado.</span>
                </div>
              </div>
            ) : (
              <>
                <GoogleMapView
                  position={telemetry.position}
                  heading={currentHeading}
                  history={history}
                  geofences={geofences}
                  pulseMode={pulseMode}
                />

                {/* Bottom Coordinates Pill */}
                <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/90 px-3 py-2 backdrop-blur-md text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {telemetry.position.latitude.toFixed(6)}, {telemetry.position.longitude.toFixed(6)}
                    </span>
                  </div>
                  {telemetry.timestamp && (
                    <span className="text-[11px] text-muted-foreground">
                      Atualizado:{" "}
                      <strong className="text-foreground">
                        {new Date(telemetry.timestamp).toLocaleTimeString("pt-BR")}
                      </strong>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Tactical Side Panel */}
          {panelOpen && (
            <aside className="w-full lg:w-[390px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col max-h-[48vh] lg:max-h-none">
              {/* Tabs */}
              <div className="grid grid-cols-4 border-b border-border bg-background/40 p-1.5 gap-1">
                {(
                  [
                    { id: "telemetry", label: "Ao Vivo", icon: Activity },
                    { id: "geofences", label: "Cercas", icon: Radar },
                    { id: "commands", label: "Comandos", icon: ShieldAlert },
                    { id: "share", label: "Enviar", icon: Share2 },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition cursor-pointer ${
                      activeTab === id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "telemetry" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-border bg-background/50 p-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                          <Activity className="size-3.5 text-primary" /> Velocidade
                        </span>
                        <p className="mt-1 text-xl font-bold text-foreground">
                          {currentSpeed.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">km/h</span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                          <BatteryCharging className="size-3.5 text-emerald-400" /> Bateria
                        </span>
                        <p className="mt-1 text-xl font-bold text-emerald-400">
                          {currentBattery}%
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                          <Radio className="size-3.5 text-sky-400" /> Sinal GPRS
                        </span>
                        <p className="mt-1 text-xl font-bold text-foreground">
                          {currentSignal} <span className="text-xs font-normal text-muted-foreground">/ 5</span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                          <Compass className="size-3.5 text-amber-400" /> Direção
                        </span>
                        <p className="mt-1 text-xl font-bold text-foreground">
                          {currentHeading.toFixed(0)}°
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/50 p-3 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ignição (ACC)</span>
                        <strong className={telemetry.device?.ignition ? "text-emerald-400" : "text-amber-400"}>
                          {telemetry.device?.ignition == null ? "--" : telemetry.device.ignition ? "Ligada" : "Desligada"}
                        </strong>
                      </div>
                      {telemetry.imei && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IMEI</span>
                          <span className="font-mono text-foreground">{telemetry.imei}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cercas ativas</span>
                        <strong className="text-foreground">
                          {geofences.filter((g) => g.active).length}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "geofences" && (
                  <GeofenceQuickPanel
                    geofences={geofences}
                    events={events}
                    anchorBusy={anchorBusy}
                    onToggleAnchor={handleToggleAnchor}
                    onToggleFenceActive={handleToggleFenceActive}
                  />
                )}

                {activeTab === "commands" && motorcycleId && (
                  <CommandControlPanel
                    motorcycleId={motorcycleId}
                    currentSpeedKmh={currentSpeed}
                    isAdmin={isAdmin}
                    compact
                  />
                )}

                {activeTab === "share" && motorcycleId && (
                  <ShareLinkPanel motorcycleId={motorcycleId} compact />
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
