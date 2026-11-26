"use client";

import { useEffect, useState, useMemo, useRef, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
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
import { VehicleNicknameModal } from "@/app/components/vehicle-nickname-modal";
import { OwnerSelect } from "@/app/components/owner-select";
import { TrackerSelect } from "@/app/components/tracker-select";
import { VehicleSmartImport } from "@/app/components/vehicle-smart-import";
import type { ParsedVehicleData } from "@/lib/vehicle-parser";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTenant } from "@/app/components/tenant-provider";
import { canSendCommands, isPlatformOrTenantAdmin, isMasterAdmin } from "@/lib/auth";
import {
  formatVehicleDisplayName,
  formatVehicleModel,
} from "@/lib/vehicle-display";
import type { Customer, CustomerMotorcycle } from "@/lib/types/customer";
import type { Device } from "@/lib/types/device";

type VehicleFormField =
  | "rider_id"
  | "brand"
  | "model"
  | "license_plate"
  | "year"
  | "color"
  | "renavam"
  | "chassis";

function getShakeKeyframes(attempt: number): number[] {
  return attempt % 2 === 0 ? [0, -7, 7, -5, 5, -2, 0] : [0, 7, -7, 5, -5, 2, 0];
}

function FieldErrorMessage({ error }: { error?: string }) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.p
          key={error}
          role="alert"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center gap-1.5 overflow-hidden pt-0.5 text-[11px] font-semibold text-red-400"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export default function AdminVehiclesPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { tenant } = useTenant();
  const isMaster =
    currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role);
  const allowCommands =
    currentUser.status === "authenticated" && canSendCommands(currentUser.user.role);

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
  const [renamingVehicle, setRenamingVehicle] = useState<CustomerMotorcycle | null>(null);

  // Form State for New Vehicle
  const [formRiderId, setFormRiderId] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formColor, setFormColor] = useState("");
  const [formRenavam, setFormRenavam] = useState("");
  const [formChassis, setFormChassis] = useState("");
  const [formFuelType, setFormFuelType] = useState("");
  const [formErrors, setFormErrors] = useState<Partial<Record<VehicleFormField, string>>>({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<VehicleFormField, HTMLDivElement | null>>>({});

  const clearFieldError = (field: VehicleFormField) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (modalError) setModalError(null);
  };

  const openNewVehicleModal = () => {
    setFormErrors({});
    setModalError(null);
    setIsNewVehicleModalOpen(true);
  };

  const closeNewVehicleModal = () => {
    setIsNewVehicleModalOpen(false);
    setFormErrors({});
    setModalError(null);
  };

  const handleSmartImportApply = (data: ParsedVehicleData) => {
    if (data.brand) {
      setFormBrand(data.brand);
      clearFieldError("brand");
    }
    if (data.model) {
      setFormModel(data.model);
      clearFieldError("model");
    }
    if (data.license_plate) {
      setFormPlate(data.license_plate);
      clearFieldError("license_plate");
    }
    if (data.year) {
      setFormYear(String(data.year));
      clearFieldError("year");
    }
    if (data.color) {
      setFormColor(data.color);
      clearFieldError("color");
    }
    if (data.renavam) {
      setFormRenavam(data.renavam);
      clearFieldError("renavam");
    }
    if (data.chassis) {
      setFormChassis(data.chassis);
      clearFieldError("chassis");
    }
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

  const validateVehicleForm = (): Partial<Record<VehicleFormField, string>> => {
    const errors: Partial<Record<VehicleFormField, string>> = {};
    const maxYear = new Date().getFullYear() + 1;
    const plate = formPlate.trim().toUpperCase();
    const parsedYear = Number(formYear);
    const renavam = formRenavam.trim();
    const chassis = formChassis.trim();

    if (!formRiderId.trim()) {
      errors.rider_id = "Selecione o cliente proprietário do veículo.";
    }
    if (!formBrand.trim()) {
      errors.brand = "Informe a marca do veículo.";
    }
    if (!formModel.trim()) {
      errors.model = "Informe o modelo do veículo.";
    }
    if (!plate) {
      errors.license_plate = "Informe a placa do veículo.";
    } else if (plate.length < 7) {
      errors.license_plate = "A placa deve ter 7 caracteres (ex: ABC1D23).";
    }
    if (!formYear.trim() || !Number.isInteger(parsedYear) || parsedYear < 1990 || parsedYear > maxYear) {
      errors.year = `Informe um ano válido entre 1990 e ${maxYear}.`;
    }
    if (!formColor.trim()) {
      errors.color = "Informe a cor do veículo.";
    }
    if (renavam && renavam.length !== 11) {
      errors.renavam = "O RENAVAM deve conter 11 dígitos.";
    }
    if (chassis && chassis.length !== 17) {
      errors.chassis = "O Chassi / VIN deve conter 17 caracteres.";
    }

    return errors;
  };

  const handleCreateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    const errors = validateVehicleForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setModalError(null);
      setValidationAttempt((prev) => prev + 1);
      const firstErrorField = (Object.keys(errors) as VehicleFormField[])[0];
      fieldRefs.current[firstErrorField]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    setFeedback(null);
    setModalError(null);

    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rider_id: formRiderId,
          brand: formBrand.trim(),
          model: formModel.trim(),
          ...(formNickname.trim() ? { nickname: formNickname.trim() } : {}),
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
      closeNewVehicleModal();
      setFormRiderId("");
      setFormBrand("");
      setFormModel("");
      setFormNickname("");
      setFormPlate("");
      setFormColor("");
      setFormRenavam("");
      setFormChassis("");
      setFormFuelType("");
      void fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setModalError(message);
      setValidationAttempt((prev) => prev + 1);
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
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        v.license_plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        (v.nickname && v.nickname.toLowerCase().includes(q)) ||
        (v.rider_name && v.rider_name.toLowerCase().includes(q)) ||
        (v.device?.serial_number && v.device.serial_number.toLowerCase().includes(q));

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
                onClick={openNewVehicleModal}
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
                Total de Veículos
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
                placeholder="Filtrar por placa, modelo, marca, cliente ou IMEI..."
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
                Nenhum veículo corresponde aos filtros aplicados. Cadastre novos veículos ou ajuste os termos de busca.
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
                            {formatVehicleDisplayName(v)}
                          </h3>
                          {v.nickname?.trim() && (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              ({formatVehicleModel(v)})
                            </span>
                          )}
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
                              setSelectedDeviceToLink("");
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
                        type="button"
                        onClick={() => setRenamingVehicle(v)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/40 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                        title="Definir ou alterar apelido do veículo"
                      >
                        <Tag className="size-3.5" />
                        <span>{v.nickname?.trim() ? "Apelido" : "Apelidar"}</span>
                      </button>

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
                    <p className="text-xs text-muted-foreground">Adicione um veículo e vincule a um cliente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeNewVehicleModal}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateVehicle} noValidate className="mt-6 space-y-4">
                <VehicleSmartImport compact onApply={handleSmartImportApply} />

                <motion.div
                  ref={(el) => {
                    fieldRefs.current.rider_id = el;
                  }}
                  animate={formErrors.rider_id ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                  transition={{ duration: 0.36, ease: "easeInOut" }}
                  className="space-y-1.5"
                >
                  <label
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                      formErrors.rider_id ? "text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    Cliente Proprietário *
                  </label>
                  <OwnerSelect
                    required
                    hasError={Boolean(formErrors.rider_id)}
                    options={customers}
                    value={formRiderId}
                    onChange={(val) => {
                      setFormRiderId(val);
                      if (val) clearFieldError("rider_id");
                    }}
                    placeholder="Selecione um cliente..."
                  />
                  <FieldErrorMessage error={formErrors.rider_id} />
                </motion.div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <motion.div
                    ref={(el) => {
                      fieldRefs.current.brand = el;
                    }}
                    animate={formErrors.brand ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                    transition={{ duration: 0.36, ease: "easeInOut" }}
                    className="space-y-1.5"
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        formErrors.brand ? "text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      aria-invalid={Boolean(formErrors.brand)}
                      value={formBrand}
                      onChange={(e) => {
                        setFormBrand(e.target.value);
                        clearFieldError("brand");
                      }}
                      placeholder="Ex: Honda, Yamaha"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                        formErrors.brand
                          ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20 focus:border-red-500"
                          : "border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    <FieldErrorMessage error={formErrors.brand} />
                  </motion.div>

                  <motion.div
                    ref={(el) => {
                      fieldRefs.current.model = el;
                    }}
                    animate={formErrors.model ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                    transition={{ duration: 0.36, ease: "easeInOut" }}
                    className="space-y-1.5"
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        formErrors.model ? "text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      aria-invalid={Boolean(formErrors.model)}
                      value={formModel}
                      onChange={(e) => {
                        setFormModel(e.target.value);
                        clearFieldError("model");
                      }}
                      placeholder="Ex: CB 500F, MT-07"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                        formErrors.model
                          ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20 focus:border-red-500"
                          : "border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    <FieldErrorMessage error={formErrors.model} />
                  </motion.div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Apelido Personalizado (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={formNickname}
                    onChange={(e) => setFormNickname(e.target.value)}
                    placeholder="Ex: Frota 01, Veículo Entrega Sul (substitui o modelo na exibição)"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <motion.div
                    ref={(el) => {
                      fieldRefs.current.license_plate = el;
                    }}
                    animate={formErrors.license_plate ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                    transition={{ duration: 0.36, ease: "easeInOut" }}
                    className="space-y-1.5"
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        formErrors.license_plate ? "text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      Placa *
                    </label>
                    <input
                      type="text"
                      required
                      aria-invalid={Boolean(formErrors.license_plate)}
                      value={formPlate}
                      onChange={(e) => {
                        setFormPlate(e.target.value.toUpperCase());
                        clearFieldError("license_plate");
                      }}
                      placeholder="ABC1D23"
                      maxLength={7}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                        formErrors.license_plate
                          ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20 focus:border-red-500"
                          : "border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    <FieldErrorMessage error={formErrors.license_plate} />
                  </motion.div>

                  <motion.div
                    ref={(el) => {
                      fieldRefs.current.year = el;
                    }}
                    animate={formErrors.year ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                    transition={{ duration: 0.36, ease: "easeInOut" }}
                    className="space-y-1.5"
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        formErrors.year ? "text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      Ano *
                    </label>
                    <input
                      type="number"
                      required
                      aria-invalid={Boolean(formErrors.year)}
                      value={formYear}
                      onChange={(e) => {
                        setFormYear(e.target.value);
                        clearFieldError("year");
                      }}
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-foreground focus:outline-none transition-all ${
                        formErrors.year
                          ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20 focus:border-red-500"
                          : "border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    <FieldErrorMessage error={formErrors.year} />
                  </motion.div>

                  <motion.div
                    ref={(el) => {
                      fieldRefs.current.color = el;
                    }}
                    animate={formErrors.color ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                    transition={{ duration: 0.36, ease: "easeInOut" }}
                    className="space-y-1.5"
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        formErrors.color ? "text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      Cor *
                    </label>
                    <input
                      type="text"
                      required
                      aria-invalid={Boolean(formErrors.color)}
                      value={formColor}
                      onChange={(e) => {
                        setFormColor(e.target.value);
                        clearFieldError("color");
                      }}
                      placeholder="Preta, Vermelha"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                        formErrors.color
                          ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20 focus:border-red-500"
                          : "border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    <FieldErrorMessage error={formErrors.color} />
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <motion.div
                    ref={(el) => {
                      fieldRefs.current.renavam = el;
                    }}
                    animate={formErrors.renavam ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                    transition={{ duration: 0.36, ease: "easeInOut" }}
                    className="space-y-1.5"
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        formErrors.renavam ? "text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      RENAVAM
                    </label>
                    <input
                      type="text"
                      aria-invalid={Boolean(formErrors.renavam)}
                      value={formRenavam}
                      onChange={(e) => {
                        setFormRenavam(e.target.value.replace(/\D/g, ""));
                        clearFieldError("renavam");
                      }}
                      placeholder="11 dígitos"
                      maxLength={11}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                        formErrors.renavam
                          ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20 focus:border-red-500"
                          : "border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    <FieldErrorMessage error={formErrors.renavam} />
                  </motion.div>

                  <motion.div
                    ref={(el) => {
                      fieldRefs.current.chassis = el;
                    }}
                    animate={formErrors.chassis ? { x: getShakeKeyframes(validationAttempt) } : { x: 0 }}
                    transition={{ duration: 0.36, ease: "easeInOut" }}
                    className="space-y-1.5"
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        formErrors.chassis ? "text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      Chassi / VIN
                    </label>
                    <input
                      type="text"
                      aria-invalid={Boolean(formErrors.chassis)}
                      value={formChassis}
                      onChange={(e) => {
                        setFormChassis(e.target.value.toUpperCase());
                        clearFieldError("chassis");
                      }}
                      placeholder="17 caracteres"
                      maxLength={17}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                        formErrors.chassis
                          ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20 focus:border-red-500"
                          : "border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    <FieldErrorMessage error={formErrors.chassis} />
                  </motion.div>

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

                <AnimatePresence mode="wait">
                  {(modalError || Object.keys(formErrors).length > 0) && (
                    <motion.div
                      key={modalError ? `api-${validationAttempt}` : `val-${validationAttempt}`}
                      role="alert"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        x: getShakeKeyframes(validationAttempt),
                      }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-red-300">
                          {modalError
                            ? "Não foi possível cadastrar o veículo"
                            : "Verifique os campos destacados"}
                        </p>
                        <p className="text-[11px] text-red-200/90">
                          {modalError ?? Object.values(formErrors)[0]}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                  <button
                    type="button"
                    onClick={closeNewVehicleModal}
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
                      Veículo: {formatVehicleDisplayName(selectedVehicleForLink)} ({selectedVehicleForLink.license_plate})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsLinkDeviceModalOpen(false);
                    setSelectedDeviceToLink("");
                  }}
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
                    <TrackerSelect
                      required
                      options={standbyDevices}
                      value={selectedDeviceToLink}
                      onChange={setSelectedDeviceToLink}
                      placeholder="Pesquisar ou selecionar rastreador por IMEI..."
                    />
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLinkDeviceModalOpen(false);
                      setSelectedDeviceToLink("");
                    }}
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
            isAdmin={isMaster}
            canSendCommands={allowCommands}
            motorcycleInfo={{
              model: formatVehicleDisplayName(selectedTelemetryVehicle),
              licensePlate: selectedTelemetryVehicle.license_plate,
            }}
            isOpen={Boolean(selectedTelemetryVehicle)}
            onClose={() => setSelectedTelemetryVehicle(null)}
          />
        )}

        {/* Rename Nickname Modal */}
        {renamingVehicle && (
          <VehicleNicknameModal
            vehicle={renamingVehicle}
            onClose={() => setRenamingVehicle(null)}
            onSaved={(updatedNickname) => {
              setVehicles((prev) =>
                prev.map((item) =>
                  item.id === renamingVehicle.id
                    ? { ...item, nickname: updatedNickname }
                    : item,
                ),
              );
              setFeedback({
                type: "success",
                text: updatedNickname
                  ? `Apelido "${updatedNickname}" salvo com sucesso!`
                  : "Apelido removido com sucesso.",
              });
            }}
          />
        )}
      </div>
    </DashboardShell>
  );
}
