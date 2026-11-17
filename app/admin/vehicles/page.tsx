"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  CheckCircle2,
  Cpu,
  Filter,
  Link2,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Unlink,
  User,
  X,
  AlertCircle,
  Activity,
  Radio,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { LiveTelemetryModal } from "@/app/dashboard/components/live-telemetry-modal";
import { OwnerSelect } from "@/app/components/owner-select";
import { VehicleSmartImport } from "@/app/components/vehicle-smart-import";
import type { ParsedVehicleData } from "@/lib/vehicle-parser";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTenant } from "@/app/components/tenant-provider";
import { isPlatformOrTenantAdmin, isMasterAdmin } from "@/lib/auth";
import type { Customer, CustomerMotorcycle } from "@/lib/types/customer";
import type { Device } from "@/lib/types/device";

export default function AdminVehiclesPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { tenant } = useTenant();
  const isMaster =
    currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role);

  const [vehicles, setVehicles] = useState<CustomerMotorcycle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [standbyDevices, setStandbyDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [trackerFilter, setTrackerFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals State
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [isLinkDeviceModalOpen, setIsLinkDeviceModalOpen] = useState(false);
  const [selectedVehicleForLink, setSelectedVehicleForLink] = useState<CustomerMotorcycle | null>(null);
  const [selectedDeviceToLink, setSelectedDeviceToLink] = useState<string>("");
  const [selectedTelemetryVehicle, setSelectedTelemetryVehicle] = useState<CustomerMotorcycle | null>(null);

  // Form State for New Vehicle
  const [formRiderId, setFormRiderId] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formColor, setFormColor] = useState("");
  const [formRenavam, setFormRenavam] = useState("");
  const [formChassis, setFormChassis] = useState("");
  const [formFuelType, setFormFuelType] = useState("");

  const handleSmartImportApply = (data: ParsedVehicleData) => {
    if (data.brand) setFormBrand(data.brand);
    if (data.model) setFormModel(data.model);
    if (data.license_plate) setFormPlate(data.license_plate);
    if (data.year) setFormYear(String(data.year));
    if (data.color) setFormColor(data.color);
    if (data.renavam) setFormRenavam(data.renavam);
    if (data.chassis) setFormChassis(data.chassis);
    if (data.fuel_type) setFormFuelType(data.fuel_type);
  };
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role Protection
  useEffect(() => {
    if (currentUser.status === "loading") return;
    if (currentUser.status === "unauthenticated") {
      router.replace(`/login?expired=1&from=${encodeURIComponent("/admin/vehicles")}`);
      return;
    }
    if (currentUser.status === "authenticated" && !isPlatformOrTenantAdmin(currentUser.user.role)) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [vehRes, custRes, devRes] = await Promise.all([
        fetch("/api/admin/vehicles"),
        fetch("/api/admin/customers"),
        fetch("/api/admin/devices"),
      ]);

      if (vehRes.status === 401 || custRes.status === 401 || devRes.status === 401) {
        if (typeof window !== "undefined") {
          window.location.replace("/login?expired=1&from=" + encodeURIComponent("/admin/vehicles"));
        }
        return;
      }

      if (vehRes.ok) {
        const body = await vehRes.json();
        const list: CustomerMotorcycle[] = Array.isArray(body?.data) ? body.data : [];
        setVehicles(list);
      }

      if (custRes.ok) {
        const custBody = await custRes.json();
        const custList: Customer[] = Array.isArray(custBody?.data) ? custBody.data : [];
        setCustomers(custList);
      }

      if (devRes.ok) {
        const devBody = await devRes.json();
        const devList: Device[] = Array.isArray(devBody?.devices) ? devBody.devices : [];
        // Devices in standby or unlinked
        setStandbyDevices(devList.filter((d) => !d.motorcycle));
      }
    } catch {
      // Falha transitória
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser.status === "authenticated" && isPlatformOrTenantAdmin(currentUser.user.role)) {
      void fetchData();
    }
  }, [currentUser]);

  const handleCreateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rider_id: formRiderId,
          brand: formBrand.trim(),
          model: formModel.trim(),
          license_plate: formPlate.trim().toUpperCase(),
          year: parseInt(formYear, 10),
          color: formColor.trim(),
          ...(formRenavam.trim() ? { renavam: formRenavam.trim() } : {}),
          ...(formChassis.trim() ? { chassis: formChassis.trim().toUpperCase() } : {}),
          ...(formFuelType.trim() ? { fuel_type: formFuelType.trim() } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Erro ao cadastrar veículo.");
      }

      setFeedback({ type: "success", text: `Veículo ${formPlate.toUpperCase()} cadastrado com sucesso!` });
      setIsNewVehicleModalOpen(false);
      setFormRiderId("");
      setFormBrand("");
      setFormModel("");
      setFormPlate("");
      setFormColor("");
      setFormRenavam("");
      setFormChassis("");
      setFormFuelType("");
      void fetchData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Erro desconhecido" });
    } finally {
      setSaving(false);
    }
  };

  const handleLinkDevice = async () => {
    if (!selectedVehicleForLink || !selectedDeviceToLink) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/devices/${selectedDeviceToLink}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motorcycle_id: selectedVehicleForLink.id,
          status: "active",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || "Erro ao vincular rastreador.");
      }

      setFeedback({ type: "success", text: "Rastreador vinculado com sucesso ao veículo!" });
      setIsLinkDeviceModalOpen(false);
      setSelectedVehicleForLink(null);
      setSelectedDeviceToLink("");
      void fetchData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Erro ao vincular." });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkDevice = async (vehicle: CustomerMotorcycle) => {
    if (!vehicle.device?.id) return;
    if (!confirm(`Deseja realmente desvincular o rastreador ${vehicle.device.serial_number}?`)) return;

    try {
      const res = await fetch(`/api/admin/devices/${vehicle.device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unlink: true,
          status: "standby",
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao desvincular rastreador.");
      }

      setFeedback({ type: "success", text: "Rastreador desvinculado e colocado em standby." });
      void fetchData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Erro ao desvincular." });
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        v.license_plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        (v.rider_name && v.rider_name.toLowerCase().includes(q));

      const matchesCustomer =
        selectedCustomerId === "all" || v.rider_id === selectedCustomerId;

      const matchesTracker =
        trackerFilter === "all" ||
        (trackerFilter === "linked" && Boolean(v.device)) ||
        (trackerFilter === "unlinked" && !v.device);

      const matchesStatus =
        statusFilter === "all" || v.status === statusFilter;

      return matchesSearch && matchesCustomer && matchesTracker && matchesStatus;
    });
  }, [vehicles, searchQuery, selectedCustomerId, trackerFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const linked = vehicles.filter((v) => Boolean(v.device)).length;
    const unlinked = total - linked;
    return { total, linked, unlinked };
  }, [vehicles]);

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold animate-in fade-in duration-200 ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-5 shrink-0" />
            ) : (
              <AlertCircle className="size-5 shrink-0" />
            )}
            <p className="flex-1">{feedback.text}</p>
            <button onClick={() => setFeedback(null)} className="opacity-80 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Unified Single Card (Expanded, No Harsh Dividers) */}
        <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6">
          {/* Header */}
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-semibold text-primary">
                  <Bike className="size-3.5" />
                  Controle de Frota
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Filtros & Dispositivos
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {isMaster ? "Veículos da Plataforma (Global)" : `Veículos da Frota • ${tenant.branding?.brand_name || "Sua Empresa"}`}
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {isMaster
                  ? "Painel do Administrador Geral para monitoramento consolidado de todos os veículos de todos os parceiros."
                  : "Painel do Gestor para monitorar todos os veículos da sua empresa, filtrar por condutor, verificar status dos rastreadores (IMEI) e acessar telemetria em tempo real."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => void fetchData()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
                Atualizar
              </button>
              <button
                onClick={() => setIsNewVehicleModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="size-4" />
                Novo Veículo
              </button>
            </div>
          </header>

          {/* Metrics (Clean, borderless on card surface) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Total de Motos
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">{stats.total}</span>
                <span className="text-xs font-medium text-primary">veículos</span>
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Com Rastreador Vinculado
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">{stats.linked}</span>
                <span className="text-xs font-medium text-cyan-400">rastreados</span>
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Aguardando Equipamento
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">{stats.unlinked}</span>
                <span className="text-xs font-medium text-amber-400">sem IMEI</span>
              </div>
            </div>
          </div>

          {/* Advanced Filters Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por placa, modelo, marca ou cliente proprietário..."
                className="w-full rounded-xl bg-background/60 py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Customer Filter Dropdown */}
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="rounded-xl bg-background/60 px-3 py-2 text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="all">Todos os Clientes</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>

              {/* Tracker Status Filter */}
              <div className="flex items-center gap-1 rounded-xl bg-background/50 p-1 text-xs">
                <button
                  onClick={() => setTrackerFilter("all")}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-all cursor-pointer ${
                    trackerFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setTrackerFilter("linked")}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-all cursor-pointer ${
                    trackerFilter === "linked"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Com IMEI
                </button>
                <button
                  onClick={() => setTrackerFilter("unlinked")}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-all cursor-pointer ${
                    trackerFilter === "unlinked"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sem IMEI
                </button>
              </div>
            </div>
          </div>

          {/* Vehicles Clean List */}
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <RefreshCw className="size-8 animate-spin text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider">Carregando veículos...</p>
              </div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
              <Bike className="size-10 text-muted-foreground/60" />
              <h3 className="font-display text-base font-bold text-foreground">Nenhum veículo encontrado</h3>
              <p className="max-w-md text-xs text-muted-foreground">
                Nenhuma motocicleta corresponde aos filtros aplicados. Cadastre novos veículos ou ajuste os termos de busca.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredVehicles.map((v) => {
                const hasDevice = Boolean(v.device);

                return (
                  <div
                    key={v.id}
                    className="flex flex-col gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-background/40 lg:flex-row lg:items-center lg:justify-between"
                  >
                    {/* Plate, Model & Status */}
                    <div className="flex flex-wrap items-center gap-4 min-w-0">
                      <div className="rounded-lg bg-secondary px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        {v.license_plate}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-foreground">
                            {v.brand} {v.model}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              v.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {v.status === "active" ? "Ativo" : v.status}
                          </span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">Ano {v.year} • {v.color}</span>
                          <span className="inline-flex items-center gap-1.5">
                            <User className="size-3 text-primary" />
                            <span className="font-medium text-foreground">
                              {v.rider_name || "Cliente Não Vinculado"}
                            </span>
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Tracker IMEI & Actions */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-3.5 text-cyan-400" />
                        {hasDevice ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-cyan-400">
                              <Radio className="size-3 animate-pulse text-emerald-400" />
                              {v.device?.serial_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleUnlinkDevice(v)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                              title="Desvincular equipamento"
                            >
                              <Unlink className="size-3" />
                              <span>Desvincular</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedVehicleForLink(v);
                              setIsLinkDeviceModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                          >
                            <Link2 className="size-3" />
                            Vincular Rastreador
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedTelemetryVehicle(v)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                      >
                        <Maximize2 className="size-3.5" />
                        Ver no Mapa
                      </button>

                      <span className="font-mono text-[11px] text-muted-foreground">
                        {v.created_at ? new Date(v.created_at).toLocaleDateString("pt-BR") : "--"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Novo Veículo */}
        {isNewVehicleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Bike className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase text-foreground">Cadastrar Veículo</h2>
                    <p className="text-xs text-muted-foreground">Adicione uma moto e vincule a um cliente</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewVehicleModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateVehicle} className="mt-6 space-y-4">
                <VehicleSmartImport compact onApply={handleSmartImportApply} />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cliente Proprietário *
                  </label>
                  <OwnerSelect
                    required
                    options={customers}
                    value={formRiderId}
                    onChange={setFormRiderId}
                    placeholder="Selecione um cliente..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      placeholder="Ex: Honda, Yamaha"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      placeholder="Ex: CB 500F, MT-07"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Placa *
                    </label>
                    <input
                      type="text"
                      required
                      value={formPlate}
                      onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23"
                      maxLength={7}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono uppercase text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Ano *
                    </label>
                    <input
                      type="number"
                      required
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Cor *
                    </label>
                    <input
                      type="text"
                      required
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      placeholder="Preta, Vermelha"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      RENAVAM
                    </label>
                    <input
                      type="text"
                      value={formRenavam}
                      onChange={(e) => setFormRenavam(e.target.value.replace(/\D/g, ""))}
                      placeholder="11 dígitos"
                      maxLength={11}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Chassi / VIN
                    </label>
                    <input
                      type="text"
                      value={formChassis}
                      onChange={(e) => setFormChassis(e.target.value.toUpperCase())}
                      placeholder="17 caracteres"
                      maxLength={17}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono uppercase text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Combustível
                    </label>
                    <input
                      type="text"
                      value={formFuelType}
                      onChange={(e) => setFormFuelType(e.target.value)}
                      placeholder="Gasolina, Flex"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsNewVehicleModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Cadastrar Veículo"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Vincular Rastreador */}
        {isLinkDeviceModalOpen && selectedVehicleForLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Link2 className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase text-foreground">Vincular Rastreador</h2>
                    <p className="text-xs text-muted-foreground">
                      Moto: {selectedVehicleForLink.brand} {selectedVehicleForLink.model} ({selectedVehicleForLink.license_plate})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLinkDeviceModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selecione um Rastreador Disponível *
                  </label>
                  {standbyDevices.length === 0 ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                      Nenhum equipamento em standby disponível no seu tenant. Cadastre novos equipamentos no menu Dispositivos.
                    </div>
                  ) : (
                    <select
                      value={selectedDeviceToLink}
                      onChange={(e) => setSelectedDeviceToLink(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Selecione um equipamento...</option>
                      {standbyDevices.map((d) => (
                        <option key={d.id} value={d.id}>
                          IMEI: {d.serial_number} ({d.protocol ? d.protocol.toUpperCase() : "GPS"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsLinkDeviceModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={saving || !selectedDeviceToLink}
                    onClick={() => void handleLinkDevice()}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {saving ? "Vinculando..." : "Confirmar Vínculo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Telemetry Modal */}
        {selectedTelemetryVehicle && (
          <LiveTelemetryModal
            motorcycleId={selectedTelemetryVehicle.id}
            motorcycleInfo={{
              model: `${selectedTelemetryVehicle.brand} ${selectedTelemetryVehicle.model}`,
              licensePlate: selectedTelemetryVehicle.license_plate,
            }}
            isOpen={Boolean(selectedTelemetryVehicle)}
            onClose={() => setSelectedTelemetryVehicle(null)}
          />
        )}
      </div>
    </DashboardShell>
  );
}
