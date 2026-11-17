"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  Bike,
  Building2,
  CheckCircle2,
  Copy,
  Cpu,
  Eye,
  History,
  LayoutGrid,
  Link2,
  List,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlink,
  User,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useTenant } from "@/app/components/tenant-provider";
import { DeviceCard } from "@/app/admin/devices/components/device-card";
import {
  canManageDeviceTransfers,
  isMasterAdmin,
  isPlatformOrTenantAdmin,
} from "@/lib/auth";
import { DeviceAuditModal } from "@/app/admin/devices/components/device-audit-modal";
import { DeviceCreateModal } from "@/app/admin/devices/components/device-create-modal";
import { DeviceLinkModal } from "@/app/admin/devices/components/device-link-modal";
import { DeviceMapModal } from "@/app/admin/devices/components/device-map-modal";
import { DeviceTransferModal } from "@/app/admin/devices/components/device-transfer-modal";
import { useAdminDevices } from "@/hooks/use-admin-devices";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Device } from "@/lib/types/device";

export default function AdminDevicesPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { tenant } = useTenant();

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
  const [selectedDeviceForTransfer, setSelectedDeviceForTransfer] =
    useState<Device | null>(null);
  const [auditModalState, setAuditModalState] = useState<{
    open: boolean;
    device: Device | null;
  }>({ open: false, device: null });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isMaster =
    currentUser.status === "authenticated" &&
    isMasterAdmin(currentUser.user.role);
  const canTransfer =
    currentUser.status === "authenticated" &&
    canManageDeviceTransfers(currentUser.user.role);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Client-side role protection
  useEffect(() => {
    if (currentUser.status === "loading") return;
    if (currentUser.status === "unauthenticated") {
      router.replace(`/login?expired=1&from=${encodeURIComponent("/admin/devices")}`);
      return;
    }
    if (currentUser.status === "authenticated" && !isPlatformOrTenantAdmin(currentUser.user.role)) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUnlink = async (device: Device) => {
    const label = device.motorcycle?.license_plate
      ? `da moto ${device.motorcycle.license_plate}`
      : "do veículo";
    if (
      !confirm(
        `Deseja realmente desvincular o equipamento ${device.serial_number} ${label}?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlink: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Erro ao desvincular dispositivo.");
      }
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao desvincular.");
    }
  };

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-xs font-medium text-primary">
            <AlertCircle className="size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Unified Single Card (Expanded, No Harsh Dividers) */}
        <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6">
          {/* Header */}
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="size-3.5" />
                  Controle Geral
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {isMaster
                    ? "Admin Global"
                    : `Gerente · ${tenant.branding?.brand_name || "Frota"}`}
                </span>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Equipamentos & Telemetria
              </h1>

              <p className="max-w-2xl text-sm text-muted-foreground">
                {isMaster
                  ? "Visão unificada dos rastreadores da plataforma, vínculos com motocicletas, telemetria e repasses."
                  : "Visão unificada dos equipamentos da sua frota, vínculos com motocicletas e telemetria em tempo real."}
              </p>
            </div>

            {/* Action Tools */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {canTransfer && (
                <button
                  type="button"
                  onClick={() => setAuditModalState({ open: true, device: null })}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 cursor-pointer"
                >
                  <History className="size-3.5" />
                  <span>Auditoria</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
                title={autoRefresh ? "Pausar atualização automática" : "Ativar atualização automática"}
              >
                <span
                  className={`size-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"
                    }`}
                />
                <span>{autoRefresh ? "Ao vivo" : "Pausado"}</span>
              </button>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching || isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50 cursor-pointer"
                title="Atualizar lista"
              >
                <RefreshCw
                  className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Novo Equipamento</span>
              </button>
            </div>
          </header>

          {/* Unified Compact Metrics (Clean, borderless on card surface) */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${filterStatus === "all" ? "bg-secondary/50" : "hover:bg-secondary/30"
                }`}
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                  {isLoading ? "…" : stats.total}
                </p>
                <p className="text-xs text-muted-foreground">no inventário</p>
              </div>
              <Cpu className="size-5 text-primary" />
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${filterStatus === "active" ? "bg-emerald-500/10" : "hover:bg-secondary/30"
                }`}
            >
              <div>
                <p className="text-xs font-medium text-emerald-400">Com Posição</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-400">
                  {isLoading ? "…" : stats.activeCount}
                </p>
                <p className="text-xs text-muted-foreground">transmitindo GPS</p>
              </div>
              <Activity className="size-5 text-emerald-400" />
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("inactive")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${filterStatus === "inactive" ? "bg-secondary/50" : "hover:bg-secondary/30"
                }`}
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">Vinculados</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                  {isLoading ? "…" : stats.linkedCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.inactiveCount} sem sinal
                </p>
              </div>
              <Bike className="size-5 text-blue-400" />
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("unlinked")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${filterStatus === "unlinked" ? "bg-amber-500/10" : "hover:bg-secondary/30"
                }`}
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">Em Estoque</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                  {isLoading ? "…" : stats.unlinkedCount}
                </p>
                <p className="text-xs text-muted-foreground">sem veículo</p>
              </div>
              <Radio className="size-5 text-amber-400" />
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Box */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isMaster
                    ? "Buscar por IMEI, placa, modelo, piloto ou gerente..."
                    : "Buscar por IMEI, placa, modelo ou piloto..."
                }
                className="w-full rounded-xl bg-background/60 py-2.5 pl-10 pr-12 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
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

                {(stats.brokerCount > 0 || filterStatus === "broker") && (
                  <FilterTabButton
                    active={filterStatus === "broker"}
                    onClick={() => setFilterStatus("broker")}
                    label="Via Broker"
                    count={stats.brokerCount}
                    dotColor="bg-sky-400"
                  />
                )}

                {canTransfer && (
                  <FilterTabButton
                    active={filterStatus === "pending_transfer"}
                    onClick={() => setFilterStatus("pending_transfer")}
                    label="Exclusivo Admin"
                    count={stats.pendingTransferCount}
                    dotColor="bg-violet-400"
                  />
                )}
              </div>

              {/* View Mode Toggle (Grid vs Table) */}
              <div className="ml-auto flex items-center gap-1 rounded-xl bg-background/50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${viewMode === "grid"
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
                  className={`flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${viewMode === "table"
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

          {/* Count & Last Updated Subbar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Exibindo <b className="text-foreground">{filteredDevices.length}</b> de{" "}
              <b className="text-foreground">{stats.total}</b> equipamentos
            </span>
            {lastUpdated && (
              <span className="font-mono text-[11px]">
                Última checagem: {lastUpdated.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>

          {/* Devices Content */}
          {isLoading ? (
            <div className="p-14 text-center">
              <RefreshCw className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Carregando equipamentos e telemetria...
              </p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Cpu className="size-6 text-primary/70" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Nenhum equipamento encontrado
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  {searchQuery || filterStatus !== "all"
                    ? "Tente ajustar seus termos de busca ou filtros selecionados."
                    : "Comece cadastrando o primeiro rastreador da frota."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Cadastrar Equipamento</span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onOpenMap={(d) => setSelectedDeviceForMap(d)}
                  onOpenLink={(d) => setSelectedDeviceForLink(d)}
                  onUnlink={(d) => void handleUnlink(d)}
                  onOpenTransfer={(d) => setSelectedDeviceForTransfer(d)}
                  onOpenAudit={(d) => setAuditModalState({ open: true, device: d })}
                  canManageTransfers={canTransfer}
                  showManager={isMaster}
                />
              ))}
            </div>
          ) : (
            /* UNIFIED TABLE VIEW */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-5 pr-3">Status</th>
                    <th className="px-3 py-3">IMEI / Serial</th>
                    <th className="px-3 py-3">Veículo & Piloto</th>
                    {isMaster && <th className="px-3 py-3">Gerente</th>}
                    <th className="px-3 py-3">Telemetria</th>
                    <th className="py-3 pl-3 pr-5 text-right">Ações</th>
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
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2 rounded-full ${hasPos
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-neutral-600"
                                }`}
                            />
                            <span
                              className={`font-bold uppercase text-[11px] ${hasPos ? "text-emerald-400" : "text-muted-foreground"
                                }`}
                            >
                              {hasPos ? "Online" : "Sem Sinal"}
                            </span>
                          </div>
                        </td>

                        {/* IMEI / Serial */}
                        <td className="px-3 py-3.5">
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

                        {/* Unified Vehicle & Rider */}
                        <td className="px-3 py-3.5">
                          {moto ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-neutral-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground border border-blue-500/50">
                                  {moto.license_plate}
                                </span>
                                <span className="font-bold text-foreground truncate max-w-[160px]">
                                  {moto.brand} {moto.model}
                                </span>
                              </div>
                              {moto.rider?.name && (
                                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <User className="size-3 text-emerald-400" />
                                  <span>{moto.rider.name}</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400 border border-amber-500/20">
                              Em Estoque
                            </span>
                          )}
                        </td>

                        {/* Manager (Admin Global only) */}
                        {isMaster && (
                          <td className="px-3 py-3.5">
                            {device.manager_email ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/90">
                                <Building2 className="size-3 text-violet-400 shrink-0" />
                                <span className="truncate max-w-[160px]">
                                  {device.manager_email}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Admin Global
                              </span>
                            )}
                          </td>
                        )}

                        {/* Telemetry */}
                        <td className="px-3 py-3.5">
                          {pos ? (
                            <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
                              <div>
                                <span className="text-foreground font-semibold">
                                  {pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}
                                </span>
                                {pos.speed !== undefined && (
                                  <span className="ml-2 text-primary font-bold">
                                    {pos.speed} km/h
                                  </span>
                                )}
                              </div>
                              {pos.timestamp && (
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(pos.timestamp).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-500 italic">
                              Sem coordenadas
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {moto && (
                              <button
                                type="button"
                                onClick={() => void handleUnlink(device)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                                title="Desvincular equipamento"
                              >
                                <Unlink className="size-3" />
                                <span className="hidden xl:inline">Desvincular</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedDeviceForLink(device)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                              title="Vincular ou gerenciar motocicleta"
                            >
                              <Link2 className="size-3 text-primary" />
                              <span className="hidden lg:inline">
                                {moto ? "Vínculo" : "Vincular"}
                              </span>
                            </button>

                            {canTransfer && (
                              <button
                                type="button"
                                onClick={() => setSelectedDeviceForTransfer(device)}
                                className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-300 hover:bg-violet-500/20 transition-colors cursor-pointer"
                                title="Transferir para Gerente"
                              >
                                <ArrowRightLeft className="size-3" />
                                <span className="hidden lg:inline">Transferir</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setAuditModalState({ open: true, device })}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
                              title="Auditoria do equipamento"
                            >
                              <History className="size-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedDeviceForMap(device)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${hasPos
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
          )}
        </div>
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

      <DeviceTransferModal
        device={selectedDeviceForTransfer}
        onClose={() => setSelectedDeviceForTransfer(null)}
        onTransferred={() => {
          void refetch();
        }}
      />

      <DeviceAuditModal
        isOpen={auditModalState.open}
        device={auditModalState.device}
        onClose={() => setAuditModalState({ open: false, device: null })}
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
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${active
        ? "border-primary bg-primary text-white shadow-sm shadow-primary/25"
        : "border-border/80 bg-secondary/80 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
        }`}
    >
      {dotColor && <span className={`size-2 rounded-full ${dotColor}`} />}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${active ? "bg-black/30 text-white" : "bg-card text-muted-foreground"
          }`}
      >
        {count}
      </span>
    </button>
  );
}
