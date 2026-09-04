"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  Bike,
  CheckCircle2,
  Copy,
  Cpu,
  Eye,
  Filter,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { DeviceMapModal } from "@/app/admin/devices/components/device-map-modal";
import { useAdminDevices, type FilterStatus } from "@/hooks/use-admin-devices";
import type { Device } from "@/lib/types/device";

export default function AdminDevicesPage() {
  const {
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

  const [selectedDeviceForMap, setSelectedDeviceForMap] = useState<Device | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl py-4 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="section-kicker flex items-center gap-1.5">
                <ShieldAlert className="size-3.5" />
                Painel Administrativo Restrito
              </span>
              <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                Admin
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
              Dispositivos & Motocicletas
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Visualização unificada de rastreadores, telemetria em tempo real e veículos vinculados por linha.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <span
                className={`size-2 rounded-full ${
                  autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"
                }`}
              />
              <span>Auto-refresh (30s)</span>
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="ml-1 text-[11px] font-bold uppercase text-primary hover:underline"
              >
                {autoRefresh ? "Pausar" : "Ativar"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching || isLoading}
              className="flex items-center gap-2 border border-border bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 border border-primary bg-primary/10 p-4 text-sm text-primary">
            <AlertCircle className="size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Top Summary Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Dispositivos
              </span>
              <Cpu className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-extrabold">{stats.total}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Rastreadores cadastrados no sistema
            </p>
          </div>

          <div className="border border-emerald-500/30 bg-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Com Posição (Verde)
                </span>
              </div>
              <Activity className="size-5 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-foreground">{stats.activeCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Com coordenadas GPS transmitidas
            </p>
          </div>

          <div className="border border-neutral-700 bg-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-1 w-full bg-neutral-600" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-neutral-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sem Posição (Cinza)
                </span>
              </div>
              <Radio className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-foreground">{stats.inactiveCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sem dados de localização recentes
            </p>
          </div>

          <div className="border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Motos Vinculadas
              </span>
              <Bike className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-extrabold">
              {stats.total - stats.unlinkedCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {stats.unlinkedCount} dispositivo(s) sem moto
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-border bg-card p-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Serial, IMEI, Placa, Modelo ou Piloto..."
              className="w-full border border-border bg-secondary py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filter Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 flex items-center gap-1 text-[11px] font-bold uppercase text-muted-foreground">
              <Filter className="size-3" />
              Status:
            </span>

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
              label="Sem Moto"
              count={stats.unlinkedCount}
            />
          </div>
        </div>

        {/* Devices & Motorcycles Row Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Exibindo <b>{filteredDevices.length}</b> de <b>{stats.total}</b> dispositivos
            </span>
            {lastUpdated && (
              <span className="text-[11px]">
                Última checagem: {lastUpdated.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="border border-border bg-card p-12 text-center">
              <RefreshCw className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Carregando inventário de dispositivos...
              </p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="border border-border bg-card p-12 text-center">
              <Cpu className="mx-auto size-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-base font-bold uppercase text-foreground">
                Nenhum dispositivo encontrado
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchQuery || filterStatus !== "all"
                  ? "Tente ajustar seus termos de busca ou filtros."
                  : "Não há dispositivos cadastrados no momento."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDevices.map((device) => {
                const hasLastPosition = Boolean(device.last_position);
                const moto = device.motorcycle;
                const position = device.last_position;

                return (
                  <article
                    key={device.id}
                    className={`group relative flex flex-col gap-4 border p-4 sm:p-5 transition-all duration-200 lg:flex-row lg:items-center lg:justify-between ${
                      hasLastPosition
                        ? "border-border bg-card hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-950/10"
                        : "border-border/80 bg-card/60 opacity-85 hover:border-neutral-500 hover:opacity-100"
                    }`}
                  >
                    {/* Status vertical accent strip */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        hasLastPosition ? "bg-emerald-500" : "bg-neutral-600"
                      }`}
                    />

                    {/* Column 1: Status Indicator (Verde / Cinza) */}
                    <div className="flex items-center gap-3.5 pl-2 lg:w-48 shrink-0">
                      {hasLastPosition ? (
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex size-3.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex size-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                          </span>
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                              Posição Ativa
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {position?.timestamp
                                ? formatRelativeTime(position.timestamp)
                                : "Online"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span className="size-3.5 rounded-full bg-neutral-600 shrink-0 border border-neutral-500" />
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Sem Posição
                            </span>
                            <span className="block text-[10px] text-neutral-500">
                              Offline / Sem sinal
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Device Information */}
                    <div className="flex-1 min-w-[200px] border-t border-border/50 pt-3 lg:border-t-0 lg:pt-0">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-4 text-primary shrink-0" />
                        <span className="text-sm font-extrabold uppercase text-foreground">
                          Rastreador
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="rounded bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          {device.serial_number}
                        </span>
                        {device.protocol && (
                          <>
                            <span className="text-muted-foreground/60">•</span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-primary">
                              {device.protocol}
                            </span>
                          </>
                        )}
                        {device.serial_number !== "—" && (
                          <button
                            type="button"
                            onClick={() => handleCopy(device.serial_number, device.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copiar Serial"
                          >
                            {copiedId === device.id ? (
                              <CheckCircle2 className="size-3 text-emerald-400" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Device meta: firmware + last seen */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        {device.firmware_version && (
                          <span className="font-mono text-neutral-500">
                            {device.firmware_version}
                          </span>
                        )}
                        {device.last_seen_at && (
                          <span>
                            Visto: <b className="text-foreground">{formatRelativeTime(device.last_seen_at)}</b>
                          </span>
                        )}
                        {(device.status === "active" || device.status === "inactive") && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              device.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-neutral-700 text-neutral-400"
                            }`}
                          >
                            {device.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Associated Motorcycle */}
                    <div className="flex-1 min-w-[220px] border-t border-border/50 pt-3 lg:border-t-0 lg:pt-0">
                      <div className="flex items-center gap-2">
                        <Bike className="size-4 text-primary shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Motocicleta Associada
                        </span>
                      </div>

                      {moto ? (
                        <div className="mt-1.5 flex items-center gap-3">
                          {/* Mercosul License Plate Badge */}
                          <div className="inline-flex shrink-0 items-center overflow-hidden rounded border border-blue-500/60 bg-neutral-950 text-xs font-extrabold shadow">
                            <span className="bg-blue-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase">
                              BR
                            </span>
                            <span className="px-2 py-0.5 tracking-wider text-foreground font-mono">
                              {moto.license_plate}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {moto.brand} {moto.model}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {moto.year} • {moto.color}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
                          <XCircle className="size-3 text-neutral-500" />
                          <span className="text-[11px]">Nenhuma moto vinculada</span>
                        </div>
                      )}

                      {/* Rider snippet */}
                      {moto?.rider && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <User className="size-3 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate">
                            {moto.rider.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Column 4: Last Position Coordinates / Speed */}
                    <div className="flex-1 min-w-[200px] border-t border-border/50 pt-3 lg:border-t-0 lg:pt-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <MapPin className="size-3.5 text-primary shrink-0" />
                        <span>Última Posição</span>
                      </div>

                      {position ? (
                        <div className="mt-1.5 space-y-1">
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>
                              Vel: <b className="text-foreground">{position.speed ?? 0} km/h</b>
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[160px]" title={position.address}>
                              {position.address || "Coordenadas ativas"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-xs text-neutral-500 italic">
                          Sem telemetria registrada
                        </div>
                      )}
                    </div>

                    {/* Column 5: Actions (Ver no mapa) */}
                    <div className="flex items-center gap-2 border-t border-border/50 pt-3 lg:border-t-0 lg:pt-0 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedDeviceForMap(device)}
                        className={`flex items-center gap-2 rounded border px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                          hasLastPosition
                            ? "border-primary/50 bg-primary/10 text-primary hover:border-primary hover:bg-primary hover:text-white"
                            : "border-border bg-secondary text-muted-foreground hover:border-primary hover:text-foreground"
                        }`}
                      >
                        <Eye className="size-3.5" />
                        <span>Ver no Mapa</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Device Map & Telemetry Modal */}
      <DeviceMapModal
        isOpen={Boolean(selectedDeviceForMap)}
        device={selectedDeviceForMap}
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
      className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-secondary text-muted-foreground hover:border-border hover:bg-secondary/80 hover:text-foreground"
      }`}
    >
      {dotColor && <span className={`size-2 rounded-full ${dotColor}`} />}
      <span>{label}</span>
      <span
        className={`rounded px-1.5 py-0.2 text-[10px] ${
          active ? "bg-black/30 text-white" : "bg-card text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffSeconds = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSeconds < 60) return `Há ${Math.max(1, diffSeconds)}s`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `Há ${diffMinutes} min`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return new Date(isoString).toLocaleDateString("pt-BR");
  } catch {
    return "Recente";
  }
}
