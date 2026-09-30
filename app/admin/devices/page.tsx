"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Bike,
  CheckCircle2,
  Copy,
  Cpu,
  Eye,
  LayoutGrid,
  Link2,
  List,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { DeviceCard } from "@/app/admin/devices/components/device-card";
import { DeviceCreateModal } from "@/app/admin/devices/components/device-create-modal";
import { DeviceLinkModal } from "@/app/admin/devices/components/device-link-modal";
import { DeviceMapModal } from "@/app/admin/devices/components/device-map-modal";
import { J16SpecBanner } from "@/app/admin/devices/components/j16-spec-banner";
import { useAdminDevices } from "@/hooks/use-admin-devices";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Device } from "@/lib/types/device";

export default function AdminDevicesPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const {
    devices,
    filteredDevices,
    stats,
    isLoading,
    isRefetching,
    error,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    autoRefresh,
    setAutoRefresh,
    lastUpdated,
    refetch,
  } = useAdminDevices(30);

  const [selectedDeviceForMap, setSelectedDeviceForMap] =
    useState<Device | null>(null);
  const [selectedDeviceForLink, setSelectedDeviceForLink] =
    useState<Device | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Client-side role protection
  useEffect(() => {
    if (currentUser.status === "loading") return;
    if (
      currentUser.status === "unauthenticated" ||
      (currentUser.status === "authenticated" && currentUser.user.role !== "admin")
    ) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl py-4 space-y-8">
        {/* ========================================================================= */}
        {/* HERO HEADER & STATS SUMMARY                                              */}
        {/* ========================================================================= */}
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-secondary/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Ambient Cyber Grid & Glow Accents */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary border border-primary/20">
                  <ShieldAlert className="size-3.5" />
                  Painel Administrativo Restrito
                </span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary border border-primary/30">
                  Admin
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="size-2.5" />
                  Base J16 4G Homologada
                </span>
              </div>

              <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
                Dispositivos & Telemetria
              </h1>

              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Gerenciamento de hardware, inventário de rastreadores GPS, telemetria em tempo real e modelo base J16 4G LTE.
              </p>
            </div>

            {/* Action Tools: New Device Button + Auto-refresh */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="size-4 stroke-[3]" />
                <span>Novo Dispositivo</span>
              </button>

              <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5 text-xs text-muted-foreground backdrop-blur-md">
                <span
                  className={`size-2 rounded-full ${
                    autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"
                  }`}
                />
                <span className="hidden sm:inline">Auto-refresh</span>
                <button
                  type="button"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="text-[11px] font-bold uppercase text-primary hover:underline cursor-pointer"
                >
                  {autoRefresh ? "Pausar" : "Ativar"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching || isLoading}
                className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground backdrop-blur-md transition-colors hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50 cursor-pointer"
                title="Atualizar lista"
              >
                <RefreshCw
                  className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary bg-primary/10 p-4 text-xs font-medium text-primary shadow-lg animate-in fade-in">
            <AlertCircle className="size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* METRICS SUMMARY CARDS                                                     */}
        {/* ========================================================================= */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Total Dispositivos */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/80 p-4.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total Dispositivos
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cpu className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? "..." : stats.total}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Rastreadores no inventário
            </p>
          </div>

          {/* Com Posição GPS */}
          <div className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-card/80 p-4.5 shadow-sm backdrop-blur-md">
            <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  GPS Ativo
                </span>
              </div>
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Activity className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-400">
              {isLoading ? "..." : stats.activeCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Transmitindo coordenadas
            </p>
          </div>

          {/* Sem Posição / Standby */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/80 p-4.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-neutral-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Sem Posição
                </span>
              </div>
              <div className="flex size-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Radio className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? "..." : stats.inactiveCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Standby ou offline
            </p>
          </div>

          {/* Motos Vinculadas */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/80 p-4.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Motos Vinculadas
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Bike className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? "..." : stats.total - stats.unlinkedCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {stats.unlinkedCount} em estoque
            </p>
          </div>

          {/* Base J16 Standard */}
          <div className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-primary/40 bg-primary/5 p-4.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                Modelos J16 4G
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-primary">
              {isLoading ? "..." : stats.j16Count}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Protocolo GT06 Padrão
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* J16 HARDWARE SPECIFICATION & PINOUT SHOWCASE BANNER                       */}
        {/* ========================================================================= */}
        <J16SpecBanner />

        {/* ========================================================================= */}
        {/* SEARCH & FILTER TOOLBAR                                                   */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-3xl border border-border/80 bg-card/90 p-4.5 shadow-md backdrop-blur-md">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por IMEI, Serial, Placa, Modelo ou Piloto..."
              className="w-full rounded-2xl border border-border/80 bg-secondary/80 py-2.5 pl-10 pr-10 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filter Status Tabs + View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <FilterTabButton
                active={filterStatus === "all"}
                onClick={() => setFilterStatus("all")}
                label="Todos"
                count={stats.total}
              />

              <FilterTabButton
                active={filterStatus === "active"}
                onClick={() => setFilterStatus("active")}
                label="Com Posição"
                count={stats.activeCount}
                dotColor="bg-emerald-500"
              />

              <FilterTabButton
                active={filterStatus === "inactive"}
                onClick={() => setFilterStatus("inactive")}
                label="Sem Posição"
                count={stats.inactiveCount}
                dotColor="bg-neutral-500"
              />

              <FilterTabButton
                active={filterStatus === "unlinked"}
                onClick={() => setFilterStatus("unlinked")}
                label="Estoque"
                count={stats.unlinkedCount}
              />

              <FilterTabButton
                active={filterStatus === "j16"}
                onClick={() => setFilterStatus("j16")}
                label="J16 4G"
                count={stats.j16Count}
                dotColor="bg-primary"
              />
            </div>

            {/* View Mode Toggle (Grid vs Table) */}
            <div className="ml-auto flex items-center gap-1 rounded-xl border border-border/80 bg-secondary/60 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Tabela"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DEVICES LIST SECTION (GRID OR TABLE VIEW)                                */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>
              Exibindo <b>{filteredDevices.length}</b> de <b>{stats.total}</b> dispositivos
            </span>
            {lastUpdated && (
              <span className="text-[11px] font-mono">
                Última checagem: {lastUpdated.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-border/80 bg-card/60 p-16 text-center backdrop-blur-md">
              <RefreshCw className="mx-auto size-10 animate-spin text-primary" />
              <p className="mt-4 text-sm font-black uppercase tracking-wider text-muted-foreground">
                Carregando telemetria e inventário de dispositivos...
              </p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 p-16 text-center backdrop-blur-md space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-secondary/80 text-muted-foreground">
                <Cpu className="size-8 text-primary/60" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-foreground">
                  Nenhum dispositivo encontrado
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  {searchQuery || filterStatus !== "all"
                    ? "Tente ajustar seus termos de busca ou filtros selecionados."
                    : "Comece cadastrando o primeiro rastreador J16 4G da frota."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Plus className="size-4 stroke-[3]" />
                <span>Cadastrar Novo Rastreador</span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
              {filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onOpenMap={(d) => setSelectedDeviceForMap(d)}
                  onOpenLink={(d) => setSelectedDeviceForLink(d)}
                />
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/80 shadow-md backdrop-blur-md animate-in fade-in duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/70 bg-secondary/70 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3.5 pl-6 pr-3">Status / LED</th>
                      <th className="px-3 py-3.5">IMEI / Serial</th>
                      <th className="px-3 py-3.5">Protocolo</th>
                      <th className="px-3 py-3.5">Motocicleta</th>
                      <th className="px-3 py-3.5">Piloto</th>
                      <th className="px-3 py-3.5">Última Posição</th>
                      <th className="py-3.5 pl-3 pr-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredDevices.map((device) => {
                      const hasPos = Boolean(device.last_position);
                      const moto = device.motorcycle;
                      const pos = device.last_position;

                      return (
                        <tr
                          key={device.id}
                          className="hover:bg-secondary/40 transition-colors"
                        >
                          {/* Status */}
                          <td className="py-4 pl-6 pr-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`size-2.5 rounded-full ${
                                  hasPos
                                    ? "bg-emerald-500 animate-pulse"
                                    : "bg-neutral-600"
                                }`}
                              />
                              <span
                                className={`font-bold uppercase text-[11px] ${
                                  hasPos ? "text-emerald-400" : "text-muted-foreground"
                                }`}
                              >
                                {hasPos ? "Online" : "Sem Sinal"}
                              </span>
                            </div>
                          </td>

                          {/* IMEI / Serial */}
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-foreground">
                                {device.serial_number}
                              </span>
                              {device.serial_number !== "—" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(device.serial_number, device.id)
                                  }
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Copiar IMEI"
                                >
                                  {copiedId === device.id ? (
                                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Protocol */}
                          <td className="px-3 py-4">
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary border border-primary/20">
                              {device.protocol || "GT06"}
                            </span>
                          </td>

                          {/* Motorcycle */}
                          <td className="px-3 py-4">
                            {moto ? (
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-neutral-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground border border-blue-500/50">
                                  {moto.license_plate}
                                </span>
                                <span className="font-bold text-foreground truncate max-w-[150px]">
                                  {moto.brand} {moto.model}
                                </span>
                              </div>
                            ) : (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400 border border-amber-500/20">
                                Em Estoque
                              </span>
                            )}
                          </td>

                          {/* Rider */}
                          <td className="px-3 py-4">
                            {moto?.rider?.name ? (
                              <span className="font-semibold text-foreground">
                                {moto.rider.name}
                              </span>
                            ) : (
                              <span className="text-neutral-500">—</span>
                            )}
                          </td>

                          {/* Last Position */}
                          <td className="px-3 py-4">
                            {pos ? (
                              <div className="font-mono text-[11px] text-muted-foreground">
                                <span className="text-foreground font-semibold">
                                  {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}
                                </span>
                                {pos.speed !== undefined && (
                                  <span className="ml-2 text-primary font-bold">
                                    {pos.speed} km/h
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-500 italic">
                                Sem coordenadas
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 pl-3 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDeviceForLink(device)}
                                className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-secondary px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                title="Vincular ou gerenciar motocicleta"
                              >
                                <Link2 className="size-3.5 text-primary" />
                                <span className="hidden lg:inline">
                                  {moto ? "Vínculo" : "Vincular"}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedDeviceForMap(device)}
                                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                                  hasPos
                                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <Eye className="size-3.5" />
                                <span className="hidden lg:inline">Mapa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* MODALS: DEVICE CREATION, MAP TELEMETRY & DEVICE LINKING                   */}
      {/* ========================================================================= */}
      <DeviceCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
      />

      <DeviceLinkModal
        isOpen={Boolean(selectedDeviceForLink)}
        device={selectedDeviceForLink}
        onClose={() => setSelectedDeviceForLink(null)}
        onSuccess={() => {
          void refetch();
        }}
      />

      <DeviceMapModal
        isOpen={Boolean(selectedDeviceForMap)}
        device={
          selectedDeviceForMap
            ? devices.find((d) => d.id === selectedDeviceForMap.id) ||
              selectedDeviceForMap
            : null
        }
        onClose={() => setSelectedDeviceForMap(null)}
      />
    </DashboardShell>
  );
}

function FilterTabButton({
  active,
  onClick,
  label,
  count,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
        active
          ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
          : "border-border/80 bg-secondary/80 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
      }`}
    >
      {dotColor && <span className={`size-2 rounded-full ${dotColor}`} />}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
          active ? "bg-black/30 text-white" : "bg-card text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
