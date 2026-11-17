"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BatteryCharging,
  Bike,
  Lock,
  Maximize2,
  Plus,
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
import { FirstLoginPasswordModal } from "@/app/dashboard/components/first-login-password-modal";
import { useMotorcycleLocation } from "@/hooks/use-motorcycle-location";
import { useMotorcycle } from "@/hooks/use-motorcycle";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTenant } from "@/app/components/tenant-provider";
import { isMasterAdmin, isManager } from "@/lib/auth";
import { isValidCoordinate } from "@/lib/geo";

export default function DashboardPage() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isVirtualAnchorActive, setIsVirtualAnchorActive] = useState(true);
  const [shareSuccess, setShareSuccess] = useState(false);
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

  const hasVehicle = !isLoading && Boolean(motorcycle);
  const isMultiVehiclePlan = motorcycles.length > 1;

  const motorcycleModel = motorcycle
    ? `${motorcycle.brand ?? ""} ${motorcycle.model ?? ""}`.trim() ||
    motorcycle.model ||
    "Motocicleta"
    : "";

  const motorcyclePlate = motorcycle?.license_plate || "";

  // Telemetria dinâmica baseada no estado da localização
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

  // Posição válida para renderizar no mapa em miniatura
  const hasLiveCoords =
    locationState.status === "ok" &&
    isValidCoordinate(
      locationState.data.position.latitude,
      locationState.data.position.longitude,
    );

  const hasStoredCoords =
    isValidCoordinate(
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

  const handleMapClick = () => {
    if (hasVehicle) {
      setIsMapModalOpen(true);
    } else {
      router.push("/dashboard/vehicles");
    }
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(
        window.location.origin + `/tracking/live?ref=${motorcycle?.id || "demo"}`,
      );
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
        {/* Suggestion modal / banner on first login */}
        <Suspense fallback={null}>
          <FirstLoginPasswordModal />
        </Suspense>

        {/* Unified Single Card (Expanded, No Harsh Dividers) */}
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
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${isFleetUser || isMultiVehiclePlan
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
              </div>
              <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {isLoading
                  ? "Carregando telemetria..."
                  : isFleetUser
                    ? hasVehicle
                      ? `Frota da Empresa Conectada • ${motorcycles.length} Veículo${motorcycles.length === 1 ? "" : "s"}`
                      : "Nenhum veículo cadastrado na frota"
                    : hasVehicle
                      ? "Sua moto está monitorada e protegida"
                      : "Nenhum veículo cadastrado"}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => void refresh()}
                disabled={isLoading}
                title="Atualizar dados de telemetria"
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
                <span>Sincronizar</span>
              </button>
              {hasVehicle && (
                <button
                  onClick={() => setIsMapModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary/90 cursor-pointer"
                >
                  <Maximize2 className="size-3.5" />
                  <span>Rastreio</span>
                </button>
              )}
            </div>
          </div>

          {/* Multi-Vehicle Plan Switcher Strip */}
          {isMultiVehiclePlan && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Bike className="size-4 text-primary" />
                  Selecione o veículo para monitorar
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Visão em tempo real
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {motorcycles.map((bike) => {
                  const isSelected = (bike.id ?? "") === (selectedVehicleId ?? "");
                  const bikeName =
                    `${bike.brand ?? ""} ${bike.model ?? ""}`.trim() ||
                    bike.model ||
                    "Motocicleta";

                  return (
                    <button
                      key={bike.id ?? bike.license_plate}
                      onClick={() => bike.id && setSelectedVehicleId(bike.id)}
                      className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-all cursor-pointer ${isSelected
                          ? "bg-primary/15 text-foreground ring-1 ring-primary/50"
                          : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                        }`}
                    >
                      <Bike className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold truncate">{bikeName}</span>
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {bike.license_plate || "--"}
                      </span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unified Telemetry Summary (Clean, borderless on card surface) */}
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <div className="py-1">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  Velocidade Atual
                </span>
              </div>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-foreground">
                {speed}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {speed === "0 km/h" ? "Veículo estacionado" : "Em deslocamento contínuo"}
              </p>
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2">
                <BatteryCharging className="size-4 text-emerald-400" />
                <span className="text-xs font-medium text-muted-foreground">
                  Bateria
                </span>
              </div>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-emerald-400">
                {battery}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hasVehicle ? "Carga ideal • Sem fuga de corrente" : "Aguardando sinal"}
              </p>
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2">
                <Zap className={`size-4 ${isIgnitionOn ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  Ignição
                </span>
              </div>
              <p
                className={`mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight ${isIgnitionOn ? "text-emerald-400" : "text-amber-400"
                  }`}
              >
                {isLoading ? "..." : hasVehicle ? (isIgnitionOn ? "Ligada" : "Desligada") : "--"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isVirtualAnchorActive ? "Âncora virtual ativa" : "Monitoramento padrão"}
              </p>
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-sky-400" />
                <span className="text-xs font-medium text-muted-foreground">
                  Sinal do Rastreador
                </span>
              </div>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-sky-400">
                {hasVehicle ? "Online" : "--"}
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                {motorcycle?.device?.serial_number
                  ? `ID ${motorcycle.device.serial_number}`
                  : "Conexão IoT criptografada"}
              </p>
            </div>
          </div>

          {/* Embedded Live Telemetry Map */}
          <section
            onClick={handleMapClick}
            tabIndex={0}
            role="button"
            aria-label="Abrir mapa de telemetria em tempo real"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleMapClick();
              }
            }}
            className="group relative h-[380px] sm:h-[420px] cursor-pointer overflow-hidden rounded-xl bg-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {/* Background Map View / Fallback Grid */}
            <div className="absolute inset-0 pointer-events-none">
              {activePosition ? (
                <GoogleMapView
                  position={activePosition}
                  heading={activeHeading}
                  interactive={false}
                  markerType="pin"
                  showCircle={true}
                  zoom={16}
                />
              ) : (
                <div className="mini-map h-full w-full opacity-60" />
              )}
            </div>

            {/* Vignette & Contrast Overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/30" />

            {/* Top-Right Floating Expand Prompt Badge */}
            <div className="pointer-events-auto absolute top-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-md shadow-lg transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
              {hasVehicle ? (
                <>
                  <Maximize2 className="size-4" />
                  <span>Expandir Telemetria em Tempo Real</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Cadastrar Veículo</span>
                </>
              )}
            </div>

            {/* Bottom Floating Vehicle Info / Registration CTA */}
            {hasVehicle ? (
              <div className="pointer-events-auto absolute bottom-5 left-5 z-10 max-w-md rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur-md transition-colors group-hover:border-primary/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
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
                <p className="mt-0.5 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                  Clique no mapa para abrir o painel completo de rotas e telemetria
                </p>
              </div>
            ) : (
              <Link
                href="/dashboard/vehicles"
                onClick={(e) => e.stopPropagation()}
                className="group/btn pointer-events-auto absolute bottom-5 left-5 z-10 flex items-center gap-3.5 rounded-xl border border-primary/60 bg-background/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-colors group-hover/btn:bg-background group-hover/btn:text-primary">
                  <Plus className="size-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary group-hover/btn:text-primary-foreground">
                    Cadastre seu Veículo
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground group-hover/btn:text-primary-foreground/90">
                    Vincule seu veículo para ativar a proteção 24 horas
                  </p>
                </div>
              </Link>
            )}

            {/* Central Placeholder */}
            {!hasVehicle && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid size-14 place-items-center rounded-full bg-primary shadow-xl shadow-primary/40 transition-transform duration-300 group-hover:scale-110">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50"></span>
                <Plus className="relative z-10 size-7 stroke-[3] text-primary-foreground" />
              </div>
            )}
            {hasVehicle && !activePosition && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-4 py-3 shadow-xl backdrop-blur-md">
                <div className="relative flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex size-3 rounded-full bg-amber-500"></span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Aguardando sinal GPS
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Ligue a ignição ao ar livre para sincronizar
                </p>
              </div>
            )}
          </section>

          {/* Quick Rider Security Controls Footer */}
          {hasVehicle && (
            <div className="rounded-xl bg-background/40 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                    <Lock className="size-4 text-primary" />
                    Controles Rápidos de Segurança
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ações imediatas para proteger seu veículo onde quer que esteja estacionado.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsVirtualAnchorActive(!isVirtualAnchorActive)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${isVirtualAnchorActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                  >
                    <Lock className="size-3.5" />
                    <span>
                      {isVirtualAnchorActive ? "Âncora Virtual: Ativa" : "Ativar Âncora Virtual"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3.5 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground cursor-pointer"
                  >
                    <Share2 className="size-3.5" />
                    <span>{shareSuccess ? "Link Copiado!" : "Compartilhar Trajeto"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 cursor-pointer"
                  >
                    <ShieldAlert className="size-3.5" />
                    <span>Central de Alerta</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Telemetry Modal */}
      {hasVehicle && (
        <LiveTelemetryModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          motorcycleId={motorcycle?.id}
          motorcycleInfo={{
            model: motorcycleModel,
            licensePlate: motorcyclePlate,
          }}
        />
      )}
    </DashboardShell>
  );
}
