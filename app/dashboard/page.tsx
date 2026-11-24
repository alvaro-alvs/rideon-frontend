"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BatteryCharging,
  Bike,
  Lock,
  MapPinOff,
  Maximize2,
  Plus,
  Radar,
  Radio,
  RefreshCw,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { LiveTelemetryModal } from "@/app/dashboard/components/live-telemetry-modal";
import { GoogleMapView } from "@/app/dashboard/components/google-map-view";
import { CommandControlModal } from "@/app/dashboard/components/command-control-modal";
import { ShareLinkModal } from "@/app/dashboard/components/share-link-modal";
import { FirstLoginPasswordModal } from "@/app/dashboard/components/first-login-password-modal";
import { useMotorcycleLocation } from "@/hooks/use-motorcycle-location";
import { useMotorcycle } from "@/hooks/use-motorcycle";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatVehicleDisplayName } from "@/lib/vehicle-display";
import { useTenant } from "@/app/components/tenant-provider";
import { canSendCommands, isMasterAdmin, isManager } from "@/lib/auth";
import { isValidCoordinate } from "@/lib/geo";
import type { GeofenceEventItem, GeofenceItem } from "@/lib/types/protection";

const DEFAULT_FALLBACK_CENTER = {
  latitude: -23.5505,
  longitude: -46.6333,
} as const;

const EMPTY_GEOFENCES: GeofenceItem[] = [];
const EMPTY_EVENTS: GeofenceEventItem[] = [];

interface CachedProtectionSummary {
  geofences: GeofenceItem[];
  recentEvents: GeofenceEventItem[];
}

async function fetchVehicleProtection(
  vehicleId: string,
  signal?: AbortSignal,
): Promise<{
  gfData: GeofenceItem[] | null;
  evData: GeofenceEventItem[] | null;
}> {
  const [gfRes, evRes] = await Promise.all([
    fetch(`/api/geofences?motorcycle_id=${vehicleId}`, {
      cache: "no-store",
      signal,
    }),
    fetch(`/api/geofences/events?motorcycle_id=${vehicleId}&limit=5`, {
      cache: "no-store",
      signal,
    }),
  ]);

  const gfJson = gfRes.ok ? ((await gfRes.json()) as { data?: GeofenceItem[] }) : null;
  const evJson = evRes.ok ? ((await evRes.json()) as { data?: GeofenceEventItem[] }) : null;

  return {
    gfData: gfJson && Array.isArray(gfJson.data) ? gfJson.data : null,
    evData: evJson && Array.isArray(evJson.data) ? evJson.data : null,
  };
}

export default function DashboardPage() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"telemetry" | "geofences" | "commands" | "share">("telemetry");
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [protectionByVehicle, setProtectionByVehicle] = useState<
    Record<string, CachedProtectionSummary>
  >({});
  const [anchorBusy, setAnchorBusy] = useState(false);
  const [actionToast, setActionToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [radarScanTrigger, setRadarScanTrigger] = useState(1);
  const [isRadarScanning, setIsRadarScanning] = useState(false);
  const radarScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const protectionAbortRef = useRef<AbortController | null>(null);

  const router = useRouter();
  const currentUser = useCurrentUser();
  const { tenant } = useTenant();

  const user = currentUser.status === "authenticated" ? currentUser.user : null;
  const isMaster = isMasterAdmin(user?.role);
  const isMgr = isManager(user?.role);
  const isFleetUser = isMaster || isMgr;
  const allowCommands = canSendCommands(user?.role);

  const {
    motorcycle,
    motorcycles,
    selectedVehicleId,
    setSelectedVehicleId,
    isLoading,
    refresh,
  } = useMotorcycle();

  const locationState = useMotorcycleLocation(motorcycle?.id, {
    pollIntervalMs: 12_000,
    enabled: !isMapModalOpen,
  });

  const triggerRadarFeedback = useCallback(() => {
    setRadarScanTrigger((n) => n + 1);
    setIsRadarScanning(true);
    if (radarScanTimeoutRef.current) {
      clearTimeout(radarScanTimeoutRef.current);
    }
    radarScanTimeoutRef.current = setTimeout(() => {
      setIsRadarScanning(false);
      radarScanTimeoutRef.current = null;
    }, 1350);
  }, []);

  useEffect(() => {
    return () => {
      if (radarScanTimeoutRef.current) {
        clearTimeout(radarScanTimeoutRef.current);
      }
      protectionAbortRef.current?.abort();
    };
  }, []);

  const loadProtectionSummary = useCallback(async (targetId?: string) => {
    const vehicleId = targetId ?? motorcycle?.id;
    protectionAbortRef.current?.abort();

    if (!vehicleId) return;

    const controller = new AbortController();
    protectionAbortRef.current = controller;

    try {
      const { gfData, evData } = await fetchVehicleProtection(vehicleId, controller.signal);
      if (controller.signal.aborted) return;

      setProtectionByVehicle((prev) => {
        const existing = prev[vehicleId];
        return {
          ...prev,
          [vehicleId]: {
            geofences: gfData ?? existing?.geofences ?? EMPTY_GEOFENCES,
            recentEvents: evData ?? existing?.recentEvents ?? EMPTY_EVENTS,
          },
        };
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }, [motorcycle?.id]);

  const activeMotorcycleId = motorcycle?.id;

  useEffect(() => {
    if (!activeMotorcycleId) return;

    const controller = new AbortController();
    let active = true;

    fetchVehicleProtection(activeMotorcycleId, controller.signal)
      .then(({ gfData, evData }) => {
        if (!active || controller.signal.aborted) return;
        setProtectionByVehicle((prev) => {
          const existing = prev[activeMotorcycleId];
          return {
            ...prev,
            [activeMotorcycleId]: {
              geofences: gfData ?? existing?.geofences ?? EMPTY_GEOFENCES,
              recentEvents: evData ?? existing?.recentEvents ?? EMPTY_EVENTS,
            },
          };
        });
      })
      .catch(() => {
        // AbortError ou falha transitória silenciosa
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeMotorcycleId]);

  const currentProtection = motorcycle?.id ? protectionByVehicle[motorcycle.id] : undefined;
  const geofences = currentProtection?.geofences ?? EMPTY_GEOFENCES;
  const recentEvents = currentProtection?.recentEvents ?? EMPTY_EVENTS;

  const handleSelectVehicle = useCallback(
    (bikeId: string) => {
      if (bikeId !== selectedVehicleId) {
        setSelectedVehicleId(bikeId);
      }
      triggerRadarFeedback();
    },
    [selectedVehicleId, setSelectedVehicleId, triggerRadarFeedback],
  );

  const hasVehicle = Boolean(motorcycle);
  const isMultiVehiclePlan = motorcycles.length > 1;
  const activeAnchor = useMemo(
    () => geofences.find((g) => g.kind === "anchor" && g.active),
    [geofences],
  );
  const activeFenceCount = useMemo(
    () => geofences.filter((g) => g.active).length,
    [geofences],
  );

  const motorcycleModel = motorcycle ? formatVehicleDisplayName(motorcycle) : "";
  const motorcyclePlate = motorcycle?.license_plate || "";

  const rawSpeed =
    locationState.status === "ok" && locationState.data.motion?.speed != null
      ? locationState.data.motion.speed
      : 0;

  const speed =
    locationState.status === "ok" && locationState.data.motion?.speed != null
      ? `${Math.round(locationState.data.motion.speed)} km/h`
      : hasVehicle
        ? "0 km/h"
        : "--";

  const battery =
    locationState.status === "ok" && locationState.data.device?.battery != null
      ? `${Math.round(locationState.data.device.battery)}%`
      : hasVehicle
        ? "100%"
        : "--";

  const isIgnitionOn =
    locationState.status === "ok" &&
    (locationState.data.device?.ignition != null
      ? locationState.data.device.ignition
      : locationState.data.motion?.speed != null && locationState.data.motion.speed > 0);

  const liveLat = locationState.status === "ok" ? locationState.data.position.latitude : undefined;
  const liveLng = locationState.status === "ok" ? locationState.data.position.longitude : undefined;
  const hasLiveCoords = isValidCoordinate(liveLat, liveLng);

  const storedLat = motorcycle?.last_position?.latitude;
  const storedLng = motorcycle?.last_position?.longitude;
  const hasStoredCoords = isValidCoordinate(storedLat, storedLng);

  const activePosition = useMemo(() => {
    if (hasLiveCoords && liveLat !== undefined && liveLng !== undefined) {
      return { latitude: liveLat, longitude: liveLng };
    }
    if (hasStoredCoords && storedLat !== undefined && storedLng !== undefined) {
      return { latitude: storedLat, longitude: storedLng };
    }
    return null;
  }, [hasLiveCoords, liveLat, liveLng, hasStoredCoords, storedLat, storedLng]);

  // Mantém a última coordenada válida da sessão durante o render (sem cascading effects)
  const [persistedMapCenter, setPersistedMapCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  if (
    activePosition &&
    (!persistedMapCenter ||
      persistedMapCenter.latitude !== activePosition.latitude ||
      persistedMapCenter.longitude !== activePosition.longitude)
  ) {
    setPersistedMapCenter(activePosition);
  }

  const fleetInitialCenter = useMemo(() => {
    const fleetWithPos = motorcycles.find((m) =>
      isValidCoordinate(m.last_position?.latitude, m.last_position?.longitude),
    );
    if (fleetWithPos?.last_position) {
      return {
        latitude: fleetWithPos.last_position.latitude,
        longitude: fleetWithPos.last_position.longitude,
      };
    }
    return DEFAULT_FALLBACK_CENTER;
  }, [motorcycles]);

  const effectiveMapPosition = activePosition ?? persistedMapCenter ?? fleetInitialCenter;

  const activeHeading =
    locationState.status === "ok" && locationState.data.motion?.heading != null
      ? locationState.data.motion.heading
      : undefined;

  const handleToggleAnchor = async () => {
    if (!motorcycle?.id) return;
    setAnchorBusy(true);
    setActionToast(null);
    try {
      const res = await fetch(`/api/motorcycles/${motorcycle.id}/anchor`, {
        method: activeAnchor ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: activeAnchor ? undefined : JSON.stringify({ active: true, radius_meters: 60 }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setActionToast({
          kind: "error",
          text: data.message || "Não foi possível alterar a Âncora Virtual.",
        });
        return;
      }
      setActionToast({
        kind: "ok",
        text: activeAnchor
          ? "Âncora Virtual desarmada com sucesso."
          : "Âncora Virtual armada (60m) na posição atual!",
      });
      await loadProtectionSummary(motorcycle.id);
    } finally {
      setAnchorBusy(false);
    }
  };

  const openCockpit = (tab: "telemetry" | "geofences" | "commands" | "share" = "telemetry") => {
    setModalInitialTab(tab);
    setIsMapModalOpen(true);
  };

  const vehicleTransitionKey = selectedVehicleId ?? motorcycle?.id ?? "default";
  const isFetchingInitialCoords = !activePosition && locationState.status === "loading";

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
        <Suspense fallback={null}>
          <FirstLoginPasswordModal />
        </Suspense>

        <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="section-kicker">
                  {isMaster
                    ? "CENTRAL DE CONTROLE MASTER"
                    : isMgr
                      ? `GESTÃO DE FROTA • ${(tenant.branding?.brand_name || "EMPRESA").toUpperCase()}`
                      : "CENTRAL DO PILOTO"}
                </p>
                {hasVehicle && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                      isFleetUser || isMultiVehiclePlan
                        ? "bg-primary/15 text-primary"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    <ShieldCheck className="size-3.5" />
                    {isFleetUser
                      ? `Frota Ativa • ${motorcycles.length} Veículo${motorcycles.length === 1 ? "" : "s"}`
                      : isMultiVehiclePlan
                        ? `Plano Multi-Veículos • ${motorcycles.length} Veículos`
                        : "Plano Individual • 1 Veículo"}
                  </span>
                )}
                {hasVehicle && activeAnchor && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                    <Radar className="size-3 animate-pulse" /> Âncora Armada
                  </span>
                )}
              </div>
              <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {isLoading
                  ? "Carregando telemetria..."
                  : isFleetUser
                    ? hasVehicle
                      ? `Frota Conectada • ${motorcycleModel}`
                      : "Nenhum veículo cadastrado na frota"
                    : hasVehicle
                      ? "Seu veículo está monitorado e protegido"
                      : "Nenhum veículo cadastrado"}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  triggerRadarFeedback();
                  void refresh();
                  void loadProtectionSummary(motorcycle?.id);
                }}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
                <span>Sincronizar</span>
              </button>
              {hasVehicle && (
                <button
                  onClick={() => openCockpit("telemetry")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary/90 cursor-pointer"
                >
                  <Maximize2 className="size-3.5" />
                  <span>Cockpit Ao Vivo</span>
                </button>
              )}
            </div>
          </div>

          {/* Multi-Vehicle Plan Switcher */}
          {isMultiVehiclePlan && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Bike className="size-4 text-primary" />
                Selecione o veículo para monitorar
              </span>
              <div className="flex flex-wrap gap-2">
                {motorcycles.map((bike) => {
                  const isSelected = (bike.id ?? "") === (selectedVehicleId ?? "");
                  const bikeName = formatVehicleDisplayName(bike);
                  return (
                    <button
                      key={bike.id ?? bike.license_plate}
                      type="button"
                      onClick={() => bike.id && handleSelectVehicle(bike.id)}
                      className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-primary/15 text-foreground ring-1 ring-primary/60 shadow-sm shadow-primary/10"
                          : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                      }`}
                    >
                      <Bike className={`size-4 shrink-0 transition-transform duration-200 ${isSelected ? "text-primary scale-105" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold truncate">{bikeName}</span>
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {bike.license_plate || "--"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Telemetry KPI Strip */}
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <div className="py-1">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Velocidade Atual</span>
              </div>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-foreground">
                {speed}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {speed === "0 km/h" ? "Veículo estacionado" : "Em deslocamento"}
              </p>
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2">
                <BatteryCharging className="size-4 text-emerald-400" />
                <span className="text-xs font-medium text-muted-foreground">Bateria</span>
              </div>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-emerald-400">
                {battery}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hasVehicle ? "Telemetria de alimentação" : "Aguardando sinal"}
              </p>
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2">
                <Zap className={`size-4 ${isIgnitionOn ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="text-xs font-medium text-muted-foreground">Ignição</span>
              </div>
              <p
                className={`mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight ${
                  isIgnitionOn ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {isLoading ? "..." : hasVehicle ? (isIgnitionOn ? "Ligada" : "Desligada") : "--"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeAnchor ? "Âncora virtual armada (60m)" : `${activeFenceCount} cercas ativas`}
              </p>
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-sky-400" />
                <span className="text-xs font-medium text-muted-foreground">Rastreador</span>
              </div>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-sky-400">
                {hasVehicle ? (motorcycle?.device?.status === "active" ? "Online" : "Vinculado") : "--"}
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                {motorcycle?.device?.serial_number
                  ? `IMEI ${motorcycle.device.serial_number}`
                  : "Conexão IoT criptografada"}
              </p>
            </div>
          </div>

          {/* Protection Action Bar (Directly integrated above the map) */}
          {hasVehicle && motorcycle?.id && (
            <div className="rounded-xl border border-border/70 bg-background/50 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Proteção Ativa & Ações Rápidas
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={anchorBusy}
                    onClick={() => void handleToggleAnchor()}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                      activeAnchor
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Radar className={`size-3.5 ${activeAnchor ? "animate-pulse text-amber-400" : ""}`} />
                    <span>{activeAnchor ? "Âncora: Armada" : "Armar Âncora"}</span>
                  </button>

                  {allowCommands && (
                    <button
                      type="button"
                      onClick={() => setIsCommandModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 cursor-pointer"
                    >
                      <ShieldAlert className="size-3.5" />
                      <span>Bloqueio & Comandos</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 cursor-pointer"
                  >
                    <Share2 className="size-3.5 text-primary" />
                    <span>Compartilhar Ao Vivo</span>
                  </button>

                  <Link
                    href="/dashboard/geofences"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    <ShieldCheck className="size-3.5 text-emerald-400" />
                    <span>Cercas ({geofences.length})</span>
                  </Link>
                </div>
              </div>

              {actionToast && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    actionToast.kind === "ok"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {actionToast.text}
                </div>
              )}
            </div>
          )}

          {/* Embedded Persistent Map with 3D Pin, Smooth Regional Flight & Momentary Radar */}
          <section
            onClick={() => {
              if (hasVehicle) openCockpit("telemetry");
              else router.push("/dashboard/vehicles");
            }}
            tabIndex={0}
            role="button"
            aria-label="Abrir cockpit de telemetria em tempo real"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (hasVehicle) openCockpit("telemetry");
                else router.push("/dashboard/vehicles");
              }
            }}
            className="group relative h-[380px] sm:h-[430px] cursor-pointer overflow-hidden rounded-xl bg-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {/* Instância persistente: nunca desmonta na troca de veículos */}
            <div className="absolute inset-0 pointer-events-none">
              <GoogleMapView
                position={effectiveMapPosition}
                heading={activeHeading}
                geofences={geofences}
                pulseMode={activeAnchor ? "anchor" : "none"}
                interactive={false}
                markerType="modern-pin"
                markerTitle={motorcycleModel || "Veículo monitorado"}
                pinVisible={Boolean(activePosition)}
                transitionKey={vehicleTransitionKey}
                radarScanTrigger={radarScanTrigger}
                showCircle={false}
                zoom={16}
              />
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/30" />

            {/* Indicador momentâneo de varredura de radar durante troca de veículo */}
            {hasVehicle && isRadarScanning && activePosition && (
              <div className="pointer-events-none absolute top-4 left-4 z-10 inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-background/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-md shadow-lg animate-in fade-in duration-150">
                <Radar className="size-3.5 animate-spin" />
                <span>Varredura Radar • Foco Ativo</span>
              </div>
            )}

            <div className="pointer-events-auto absolute top-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-md shadow-lg transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
              {hasVehicle ? (
                <>
                  <Maximize2 className="size-4" />
                  <span>Expandir Cockpit em Tempo Real</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Cadastrar Veículo</span>
                </>
              )}
            </div>

            {hasVehicle ? (
              <div className="pointer-events-auto absolute bottom-5 left-5 z-10 max-w-md rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {activePosition ? (
                      <span className="relative flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                      </span>
                    ) : isFetchingInitialCoords ? (
                      <RefreshCw className="size-3.5 animate-spin text-primary" />
                    ) : (
                      <MapPinOff className="size-3.5 text-amber-400" />
                    )}
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      {activePosition
                        ? hasLiveCoords
                          ? "Localização • GPS"
                          : "Última Posição Registrada"
                        : isFetchingInitialCoords
                          ? "Sincronizando Posição..."
                          : "Aguardando Sinal GPS"}
                    </p>
                  </div>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                    {motorcyclePlate || "PLACA --"}
                  </span>
                </div>
                <p className="mt-1.5 font-display text-base font-bold text-foreground">
                  {motorcycleModel}
                </p>
                {activePosition ? (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {activePosition.latitude.toFixed(5)}, {activePosition.longitude.toFixed(5)}
                  </p>
                ) : (
                  !isFetchingInitialCoords && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Sem coordenadas enviadas ainda — clique para abrir comandos e cercas
                    </p>
                  )
                )}
                {recentEvents[0] && (
                  <p className="mt-1 text-[11px] text-amber-400">
                    Último evento de cerca:{" "}
                    {recentEvents[0].event_type === "enter" ? "Entrada em" : "Saída de"}{" "}
                    <strong>{recentEvents[0].geofence_name}</strong> (
                    {new Date(recentEvents[0].occurred_at).toLocaleTimeString("pt-BR")})
                  </p>
                )}
              </div>
            ) : (
              <Link
                href="/dashboard/vehicles"
                onClick={(e) => e.stopPropagation()}
                className="group/btn pointer-events-auto absolute bottom-5 left-5 z-10 flex items-center gap-3.5 rounded-xl border border-primary/60 bg-background/95 p-4 shadow-xl backdrop-blur-md transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Plus className="size-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary group-hover/btn:text-primary-foreground">
                    Cadastre seu Veículo
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground group-hover/btn:text-primary-foreground/90">
                    Vincule seu veículo para ativar cercas, bloqueio e rastreio
                  </p>
                </div>
              </Link>
            )}
          </section>
        </div>
      </div>

      {hasVehicle && motorcycle?.id && (
        <>
          <LiveTelemetryModal
            isOpen={isMapModalOpen}
            onClose={() => {
              setIsMapModalOpen(false);
              void loadProtectionSummary(motorcycle.id);
            }}
            motorcycleId={motorcycle.id}
            isAdmin={isMaster}
            canSendCommands={allowCommands}
            initialTab={modalInitialTab}
            motorcycleInfo={{
              model: motorcycleModel,
              licensePlate: motorcyclePlate,
            }}
          />

          {allowCommands && (
            <CommandControlModal
              isOpen={isCommandModalOpen}
              onClose={() => setIsCommandModalOpen(false)}
              motorcycleId={motorcycle.id}
              vehicleLabel={`${motorcycleModel} (${motorcyclePlate || "sem placa"})`}
              currentSpeedKmh={rawSpeed}
              isAdmin={isMaster}
            />
          )}

          <ShareLinkModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            motorcycleId={motorcycle.id}
            vehicleLabel={`${motorcycleModel} (${motorcyclePlate || "sem placa"})`}
          />
        </>
      )}
    </DashboardShell>
  );
}
