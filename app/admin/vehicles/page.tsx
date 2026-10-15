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
      <div className="mx-auto max-w-7xl py-4 space-y-8">
        {/* Header Hero */}
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-secondary/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary border border-primary/20">
                  <Bike className="size-3.5" />
                  Controle de Frota
                </span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary border border-primary/30">
                  Filtros & Dispositivos
                </span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                {isMaster ? "Veículos da Plataforma (Global)" : `Veículos da Frota • ${tenant.branding?.brand_name || "Sua Empresa"}`}
              </h1>
              <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
                {isMaster
                  ? "Painel do Administrador Geral para monitoramento consolidado de todos os veículos de todos os parceiros."
                  : "Painel do Gestor para monitorar todos os veículos da sua empresa, filtrar por condutor, verificar status dos rastreadores (IMEI) e acessar telemetria em tempo real."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchData()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary hover:border-primary/40 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
                Atualizar
              </button>
              <button
                onClick={() => setIsNewVehicleModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus className="size-4 stroke-[3]" />
                Novo Veículo
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total de Motos
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{stats.total}</span>
                <span className="text-[10px] font-semibold text-primary">veículos</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Com Rastreador Vinculado
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{stats.linked}</span>
                <span className="text-[10px] font-semibold text-cyan-400">rastreados</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Aguardando Equipamento
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{stats.unlinked}</span>
                <span className="text-[10px] font-semibold text-amber-400">sem IMEI</span>
              </div>
            </div>
          </div>
        </header>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold shadow-lg animate-in fade-in duration-200 ${
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

        {/* Advanced Filters Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por placa, modelo, marca ou cliente proprietário..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Customer Filter Dropdown */}
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todos os Clientes</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>

            {/* Tracker Status Filter */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1 text-xs">
              <button
                onClick={() => setTrackerFilter("all")}
                className={`rounded-lg px-2.5 py-1.5 font-bold uppercase tracking-wider transition-all ${
                  trackerFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTrackerFilter("linked")}
                className={`rounded-lg px-2.5 py-1.5 font-bold uppercase tracking-wider transition-all ${
                  trackerFilter === "linked"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Com IMEI
              </button>
              <button
                onClick={() => setTrackerFilter("unlinked")}
                className={`rounded-lg px-2.5 py-1.5 font-bold uppercase tracking-wider transition-all ${
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

        {/* Vehicles Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider">Carregando veículos...</p>
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
            <Bike className="size-10 text-muted-foreground/60" />
            <h3 className="text-sm font-bold uppercase text-foreground">Nenhum veículo encontrado</h3>
            <p className="max-w-md text-xs text-muted-foreground">
              Nenhuma motocicleta corresponde aos filtros aplicados. Cadastre novos veículos ou ajuste os termos de busca.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((v) => {
              const hasDevice = Boolean(v.device);

              return (
                <div
                  key={v.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-5 shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-primary/5"
                >
                  <div className="space-y-4">
                    {/* Top Row: Plate & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-block rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-mono font-black uppercase tracking-wider text-foreground border border-border">
                          {v.license_plate}
                        </div>
                        <h3 className="mt-1.5 text-base font-black text-foreground">
                          {v.brand} {v.model}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          Ano: {v.year} • Cor: {v.color}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                          v.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {v.status === "active" ? "Ativo" : v.status}
                      </span>
                    </div>

                    {/* Owner Client Pill */}
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-2.5">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Cliente Proprietário
                          </p>
                          <p className="text-xs font-black text-foreground truncate">
                            {v.rider_name || "Cliente Não Vinculado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tracker Device Status */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Cpu className="size-3 text-cyan-400" />
                          Rastreador (IMEI)
                        </span>

                        {hasDevice ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400">
                            <Radio className="size-2.5 animate-pulse text-emerald-400" />
                            {v.device?.serial_number}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-amber-400">
                            Pendente
                          </span>
                        )}
                      </div>

                      {hasDevice ? (
                        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground font-mono">
                          <span>Protocolo: {v.device?.protocol?.toUpperCase()}</span>
                          <button
                            onClick={() => void handleUnlinkDevice(v)}
                            className="text-red-400 hover:text-red-300 font-bold transition-colors"
                          >
                            Desvincular
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 border-t border-border/40 pt-2">
                          <button
                            onClick={() => {
                              setSelectedVehicleForLink(v);
                              setIsLinkDeviceModalOpen(true);
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 py-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <Link2 className="size-3" />
                            Vincular Rastreador
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                    <button
                      onClick={() => setSelectedTelemetryVehicle(v)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                    >
                      <Maximize2 className="size-3.5" />
                      Ver no Mapa
                    </button>

                    <span className="text-[10px] text-muted-foreground font-mono">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString("pt-BR") : "--"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Novo Veículo */}
        {isNewVehicleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cliente Proprietário *
                  </label>
                  <select
                    required
                    value={formRiderId}
                    onChange={(e) => setFormRiderId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione um cliente...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.email}
                      </option>
                    ))}
                  </select>
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
