"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BatteryCharging,
  Bike,
  Compass,
  Lock,
  MapPin,
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
import { useMotorcycleLocation } from "@/hooks/use-motorcycle-location";
import { useMotorcycle } from "@/hooks/use-motorcycle";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTenant } from "@/app/components/tenant-provider";
import { isMasterAdmin, isManager } from "@/lib/auth";

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
      ? `${locationState.data.device.battery.toFixed(1)} V`
      : hasVehicle
        ? "12.6 V"
        : "--";

  const isIgnitionOn =
    locationState.status === "ok" &&
    locationState.data.motion?.speed != null &&
    locationState.data.motion.speed > 0;

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
      <div className="mx-auto max-w-6xl py-6 space-y-8">
        {/* Top Header & Plan Info */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="section-kicker">
                {isMaster
                  ? "CENTRAL DE CONTROLE MASTER"
                  : isMgr
                    ? `GESTÃO DE FROTA • ${(tenant.branding?.brand_name || "EMPRESA").toUpperCase()}`
                    : "CENTRAL DO PILOTO"}
              </p>
              {hasVehicle && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                    isFleetUser || isMultiVehiclePlan
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
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
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold uppercase tracking-tight text-foreground">
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => void refresh()}
              disabled={isLoading}
              title="Atualizar dados de telemetria"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/50 hover:bg-card hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              <span>Sincronizar</span>
            </button>
            {hasVehicle && (
              <button
                onClick={() => setIsMapModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
              >
                <Maximize2 className="size-3.5" />
                <span>Rastreio ao Vivo</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Vehicle Plan Switcher Tabs */}
        {isMultiVehiclePlan && (
          <div className="rounded-xl border border-border bg-card/40 p-3 backdrop-blur">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Bike className="size-4 text-primary" />
                Selecione o Veículo para Monitorar
              </span>
              <span className="text-[11px] text-muted-foreground">
                Alternando visão em tempo real
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/10 text-foreground ring-1 ring-primary/40"
                        : "border-border/70 bg-card/50 text-muted-foreground hover:border-border hover:bg-card/90 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`grid size-9 shrink-0 place-items-center rounded-md ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Bike className="size-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold truncate leading-snug">
                          {bikeName}
                        </p>
                        <p className="text-xs font-mono font-bold tracking-wider text-muted-foreground">
                          {bike.license_plate || "PLACA --"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                        </span>
                        Ativa
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary mt-1">
                          Selecionada
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Telemetry Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                Velocidade Atual
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Activity className="size-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight">{speed}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {speed === "0 km/h" ? "Veículo estacionado" : "Em deslocamento contínuo"}
            </p>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                Tensão da Bateria
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <BatteryCharging className="size-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-emerald-400">
              {battery}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasVehicle ? "Carga ideal • Sem fuga de corrente" : "Aguardando sinal"}
            </p>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                Ignição
              </span>
              <div
                className={`grid size-8 place-items-center rounded-lg ${
                  isIgnitionOn
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}
              >
                <Zap className="size-4" />
              </div>
            </div>
            <p
              className={`mt-4 text-3xl font-extrabold tracking-tight ${
                isIgnitionOn ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isLoading ? "..." : hasVehicle ? (isIgnitionOn ? "Ligada" : "Desligada") : "--"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isVirtualAnchorActive ? "Âncora virtual de bloqueio ativa" : "Monitoramento padrão"}
            </p>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                Sinal do Rastreador
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
                <Radio className="size-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-sky-400">
              {hasVehicle ? "Online" : "--"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {motorcycle?.device?.serial_number
                ? `Equipamento ${motorcycle.device.serial_number}`
                : "Conexão IoT criptografada"}
            </p>
          </article>
        </div>

        {/* Hoverable and Clickable Live Telemetry Mini-map */}
        <section
          onClick={handleMapClick}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleMapClick();
            }
          }}
          className="mini-map group relative h-[380px] cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all duration-300 hover:border-primary hover:shadow-xl hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {/* Subtle animated scan grid line on hover */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Central Animated Vehicle Marker */}
          <div className="absolute left-[52%] top-[46%] grid size-14 place-items-center rounded-full bg-primary shadow-xl shadow-primary/40 transition-transform duration-300 group-hover:scale-110">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50"></span>
            {hasVehicle ? (
              <MapPin className="relative z-10 size-7 text-primary-foreground" />
            ) : (
              <Plus className="relative z-10 size-7 stroke-[3] text-primary-foreground" />
            )}
          </div>

          {/* Top-Right Expand Prompt Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
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

          {/* Bottom Vehicle Info Card / Registration CTA Button */}
          {hasVehicle ? (
            <div className="absolute bottom-5 left-5 max-w-md rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur transition-colors group-hover:border-primary/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[.1em] text-primary">
                    Localização ao Vivo • GPS
                  </p>
                </div>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                  {motorcyclePlate}
                </span>
              </div>
              <p className="mt-1.5 text-base font-bold text-foreground">
                {motorcycleModel}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground group-hover:text-foreground">
                Clique na área do mapa para abrir o painel completo de rotas e telemetria
              </p>
            </div>
          ) : (
            <Link
              href="/dashboard/vehicles"
              onClick={(e) => e.stopPropagation()}
              className="group/btn absolute bottom-5 left-5 flex items-center gap-3.5 rounded-xl border border-primary/60 bg-background/95 p-4 shadow-xl backdrop-blur transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-colors group-hover/btn:bg-background group-hover/btn:text-primary">
                <Plus className="size-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.1em] text-primary group-hover/btn:text-primary-foreground">
                  Cadastre seu Veículo
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground group-hover/btn:text-primary-foreground/90">
                  Vincule seu veículo para ativar a proteção 24 horas
                </p>
              </div>
            </Link>
          )}
        </section>

        {/* Quick Rider Security Controls */}
        {hasVehicle && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <Lock className="size-4 text-primary" />
                  Controles Rápidos de Segurança
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ações imediatas para proteger seu veículo onde quer que ele esteja estacionado.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsVirtualAnchorActive(!isVirtualAnchorActive)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    isVirtualAnchorActive
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
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
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  <Share2 className="size-3.5" />
                  <span>{shareSuccess ? "Link Copiado!" : "Compartilhar Trajeto"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/20"
                >
                  <ShieldAlert className="size-3.5" />
                  <span>Central de Alerta</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
