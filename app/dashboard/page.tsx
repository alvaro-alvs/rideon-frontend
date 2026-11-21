"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BatteryCharging,
  Bike,
  Lock,
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
import { useTenant } from "@/app/components/tenant-provider";
import { isMasterAdmin, isManager } from "@/lib/auth";
import { isValidCoordinate } from "@/lib/geo";
import type { GeofenceEventItem, GeofenceItem } from "@/lib/types/protection";

export default function DashboardPage() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"telemetry" | "geofences" | "commands" | "share">("telemetry");
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<GeofenceEventItem[]>([]);
  const [anchorBusy, setAnchorBusy] = useState(false);
  const [actionToast, setActionToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const router = useRouter();
  const currentUser = useCurrentUser();
  const { tenant } = useTenant();

  const user = currentUser.status === "authenticated" ? currentUser.user : null;
  const isMaster = isMasterAdmin(user?.role);
  const isMgr = isManager(user?.role);
  const isFleetUser = isMaster || isMgr;

  const {
    motorcycle,
    motorcycles,
    selectedVehicleId,
    setSelectedVehicleId,
    isLoading,
    refresh,
  } = useMotorcycle();

  const locationState = useMotorcycleLocation(motorcycle?.id);

  const loadProtectionSummary = useCallback(async () => {
    if (!motorcycle?.id) {
      setGeofences([]);
      setRecentEvents([]);
      return;
    }
    const [gfRes, evRes] = await Promise.all([
      fetch(`/api/geofences?motorcycle_id=${motorcycle.id}`, { cache: "no-store" }),
      fetch(`/api/geofences/events?motorcycle_id=${motorcycle.id}&limit=5`, { cache: "no-store" }),
    ]);
    if (gfRes.ok) {
      const d = (await gfRes.json()) as { data?: GeofenceItem[] };
      setGeofences(Array.isArray(d.data) ? d.data : []);
    }
    if (evRes.ok) {
      const d = (await evRes.json()) as { data?: GeofenceEventItem[] };
      setRecentEvents(Array.isArray(d.data) ? d.data : []);
    }
  }, [motorcycle?.id]);

  useEffect(() => {
    void loadProtectionSummary();
  }, [loadProtectionSummary]);

  const hasVehicle = !isLoading && Boolean(motorcycle);
  const isMultiVehiclePlan = motorcycles.length > 1;
  const activeAnchor = geofences.find((g) => g.kind === "anchor" && g.active);

  const motorcycleModel = motorcycle
    ? `${motorcycle.brand ?? ""} ${motorcycle.model ?? ""}`.trim() ||
      motorcycle.model ||
      "Motocicleta"
    : "";
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

  const hasLiveCoords =
    locationState.status === "ok" &&
    isValidCoordinate(locationState.data.position.latitude, locationState.data.position.longitude);

  const hasStoredCoords = isValidCoordinate(
    motorcycle?.last_position?.latitude,
    motorcycle?.last_position?.longitude,
  );

  const activePosition = hasLiveCoords
    ? locationState.data.position
    : hasStoredCoords
      ? {
          latitude: motorcycle!.last_position!.latitude,
          longitude: motorcycle!.last_position!.longitude,
        }
      : null;

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
      await loadProtectionSummary();
    } finally {
      setAnchorBusy(false);
    }
  };

  const openCockpit = (tab: "telemetry" | "geofences" | "commands" | "share" = "telemetry") => {
    setModalInitialTab(tab);
    setIsMapModalOpen(true);
  };

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
                        ? `Plano Multi-Veículos • ${motorcycles.length} Motos`
                        : "Plano Individual • 1 Moto"}
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
                      ? "Sua moto está monitorada e protegida"
                      : "Nenhum veículo cadastrado"}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  void refresh();
                  void loadProtectionSummary();
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
                  const bikeName =
                    `${bike.brand ?? ""} ${bike.model ?? ""}`.trim() || bike.model || "Motocicleta";
                  return (
                    <button
                      key={bike.id ?? bike.license_plate}
                      onClick={() => bike.id && setSelectedVehicleId(bike.id)}
                      className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/15 text-foreground ring-1 ring-primary/50"
                          : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                      }`}
                    >
                      <Bike className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
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
                {activeAnchor ? "Âncora virtual armada (60m)" : `${geofences.filter((g) => g.active).length} cercas ativas`}
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

                  <button
                    type="button"
                    onClick={() => setIsCommandModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 cursor-pointer"
                  >
                    <ShieldAlert className="size-3.5" />
                    <span>Bloqueio & Comandos</span>
                  </button>

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

          {/* Embedded Map with Live Geofences & Radar Animation */}
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
            <div className="absolute inset-0 pointer-events-none">
              {activePosition ? (
                <GoogleMapView
                  position={activePosition}
                  heading={activeHeading}
                  geofences={geofences}
                  pulseMode={activeAnchor ? "anchor" : "none"}
                  interactive={false}
                  markerType="pin"
                  showCircle={!activeAnchor}
                  zoom={16}
                />
              ) : (
                <div className="mini-map h-full w-full opacity-60" />
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/30" />

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
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      {hasLiveCoords ? "Localização • GPS" : "Última Posição Registrada"}
                    </p>
                  </div>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                    {motorcyclePlate || "PLACA --"}
                  </span>
                </div>
                <p className="mt-1.5 font-display text-base font-bold text-foreground">
                  {motorcycleModel}
                </p>
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
              void loadProtectionSummary();
            }}
            motorcycleId={motorcycle.id}
            isAdmin={isMaster || isMgr}
            initialTab={modalInitialTab}
            motorcycleInfo={{
              model: motorcycleModel,
              licensePlate: motorcyclePlate,
            }}
          />

          <CommandControlModal
            isOpen={isCommandModalOpen}
            onClose={() => setIsCommandModalOpen(false)}
            motorcycleId={motorcycle.id}
            vehicleLabel={`${motorcycleModel} (${motorcyclePlate || "sem placa"})`}
            currentSpeedKmh={rawSpeed}
            isAdmin={isMaster || isMgr}
          />

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
