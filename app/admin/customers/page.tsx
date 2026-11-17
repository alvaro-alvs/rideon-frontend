"use client";

import { useEffect, useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  X,
  Bike,
  Cpu,
  UserPlus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Clock,
  Check,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { CalendarPicker } from "@/app/components/ui/calendar-picker";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin, isMasterAdmin } from "@/lib/auth";
import { formatPhone, validatePhone } from "@/lib/phone";
import type { Customer } from "@/lib/types/customer";
import type { TenantItem } from "@/lib/types/tenant";
import type { Manager } from "@/lib/types/manager";

export default function AdminCustomersPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<"all" | "pending" | "has_vehicles" | "no_vehicles">("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [reviewingCustomerId, setReviewingCustomerId] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formTenantId, setFormTenantId] = useState("");
  const [formManagerId, setFormManagerId] = useState("");
  const [formVehicleLimit, setFormVehicleLimit] = useState(1);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Assign Manager Modal State (Master Admin)
  const [assigningCustomer, setAssigningCustomer] = useState<Customer | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Adjust Vehicle Limit Modal State (Manager & Master Admin)
  const [adjustingCustomer, setAdjustingCustomer] = useState<Customer | null>(null);
  const [adjustedVehicleLimit, setAdjustedVehicleLimit] = useState(1);
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitError, setLimitError] = useState("");

  const phoneValidation = useMemo(() => validatePhone(formPhone), [formPhone]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormPhone(formatted);
    if (!phoneTouched) setPhoneTouched(true);
    if (formError) setFormError("");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError("");
    setPhoneTouched(false);
    setFormTenantId("");
    setFormManagerId("");
    setFormVehicleLimit(1);
  };

  const handleOpenAssignModal = (cust: Customer) => {
    setAssigningCustomer(cust);
    setSelectedManagerId(cust.manager_id || "");
    setAssignError("");
  };

  const handleCloseAssignModal = () => {
    setAssigningCustomer(null);
    setSelectedManagerId("");
    setAssignError("");
  };

  const handleSaveAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!assigningCustomer) return;
    if (!selectedManagerId) {
      setAssignError("É obrigatório selecionar um gerente responsável para o cliente.");
      return;
    }
    setSavingAssign(true);
    setAssignError("");

    try {
      const res = await fetch(`/api/admin/customers/${assigningCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manager_id: selectedManagerId || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Falha ao vincular gestor.");
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === assigningCustomer.id
            ? {
                ...c,
                manager_id: data.manager_id || null,
                manager_name: data.manager_name || "",
                manager_email: data.manager_email || "",
              }
            : c,
        ),
      );

      setSuccessMessage(
        selectedManagerId
          ? `Gestor vinculado ao cliente "${assigningCustomer.name}" com sucesso!`
          : `Gestor desvinculado do cliente "${assigningCustomer.name}".`,
      );
      setTimeout(() => setSuccessMessage(""), 5000);
      handleCloseAssignModal();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Erro desconhecido ao salvar vinculação.");
    } finally {
      setSavingAssign(false);
    }
  };

  const handleOpenLimitModal = (cust: Customer) => {
    setAdjustingCustomer(cust);
    setAdjustedVehicleLimit(cust.vehicle_limit || 1);
    setLimitError("");
  };

  const handleCloseLimitModal = () => {
    setAdjustingCustomer(null);
    setAdjustedVehicleLimit(1);
    setLimitError("");
  };

  const handleSaveLimit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustingCustomer) return;

    setSavingLimit(true);
    setLimitError("");

    try {
      const res = await fetch(`/api/admin/customers/${adjustingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_limit: Number(adjustedVehicleLimit),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Falha ao ajustar limite de veículos.");
      }

      const updatedLimit = data.vehicle_limit || Number(adjustedVehicleLimit);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === adjustingCustomer.id
            ? {
                ...c,
                vehicle_limit: updatedLimit,
              }
            : c,
        ),
      );

      setSuccessMessage(
        `Limite de veículos do cliente "${adjustingCustomer.name}" atualizado para ${updatedLimit} com sucesso!`,
      );
      setTimeout(() => setSuccessMessage(""), 5000);
      handleCloseLimitModal();
    } catch (err) {
      setLimitError(err instanceof Error ? err.message : "Erro ao salvar limite de veículos.");
    } finally {
      setSavingLimit(false);
    }
  };

  // Role Protection: Gerentes or Master Admin
  useEffect(() => {
    if (currentUser.status === "loading") return;
    if (currentUser.status === "unauthenticated") {
      router.replace(`/login?expired=1&from=${encodeURIComponent("/admin/customers")}`);
      return;
    }
    if (currentUser.status === "authenticated" && !isPlatformOrTenantAdmin(currentUser.user.role)) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  // Load Tenants & Managers for Master Admin selection
  useEffect(() => {
    if (currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role)) {
      fetch("/api/admin/tenants")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: TenantItem[]) => {
          if (Array.isArray(data)) setTenants(data);
        })
        .catch(() => {});

      fetch("/api/admin/managers")
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (Array.isArray(body?.data)) setManagers(body.data);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const fetchCustomers = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/customers");
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.location.replace("/login?expired=1&from=" + encodeURIComponent("/admin/customers"));
        }
        return;
      }
      if (res.ok) {
        const body = await res.json();
        const list: Customer[] = Array.isArray(body?.data) ? body.data : [];
        setCustomers(list);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchCustomers();
    }
  }, [currentUser]);

  const handleCreateCustomer = async (e: FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);
    setFormError("");

    if (!phoneValidation.isValid) {
      setFormError(phoneValidation.message || "Por favor, informe um telefone válido.");
      return;
    }

    if (!formDob) {
      setFormError("Por favor, selecione a data de nascimento.");
      return;
    }

    if (currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role)) {
      if (!formTenantId) {
        setFormError("Como Master Admin, é obrigatório selecionar a Empresa/Tenant do cliente.");
        return;
      }
    }

    setCreating(true);

    try {
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        date_of_birth: formDob,
        password: formPassword || undefined,
        vehicle_limit: Number(formVehicleLimit) || 1,
      };

      if (currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role) && formTenantId) {
        payload.tenant_id = formTenantId;
        if (formManagerId) {
          payload.manager_id = formManagerId;
        }
      }

      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Erro ao cadastrar cliente.");
      }

      setSuccessMessage(`Cliente "${formName}" cadastrado com sucesso!`);
      setIsModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormDob("");
      setFormPassword("");
      setFormTenantId("");
      setFormManagerId("");
      setPhoneTouched(false);
      void fetchCustomers();

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCreating(false);
    }
  };

  const isCustomerPending = (c: Customer) => c.status === "pending" || c.user_status === "pending";
  const isCustomerInactive = (c: Customer) => c.status === "inactive" || c.user_status === "inactive";

  const handleReviewCustomer = async (cust: Customer, action: "approve" | "reject") => {
    setReviewingCustomerId(cust.id);
    try {
      const res = await fetch(`/api/admin/customers/${cust.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "approve" ? JSON.stringify({}) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Falha ao atualizar status da conta.");
      }

      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? { ...c, ...data } : c)));
      setSuccessMessage(
        action === "approve"
          ? `Conta de "${cust.name}" aprovada com sucesso!`
          : `Solicitação de "${cust.name}" recusada.`,
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao revisar solicitação.");
    } finally {
      setReviewingCustomerId(null);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.tenant_name && c.tenant_name.toLowerCase().includes(q)) ||
        (c.manager_name && c.manager_name.toLowerCase().includes(q));

      const matchesVehicle =
        vehicleFilter === "all" ||
        (vehicleFilter === "pending" && isCustomerPending(c)) ||
        (vehicleFilter === "has_vehicles" && c.motorcycle_count > 0) ||
        (vehicleFilter === "no_vehicles" && c.motorcycle_count === 0);

      const matchesTenant =
        tenantFilter === "all" ||
        c.tenant_id === tenantFilter;

      return matchesSearch && matchesVehicle && matchesTenant;
    });
  }, [customers, searchQuery, vehicleFilter, tenantFilter]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalVehicles = customers.reduce((acc, c) => acc + (c.motorcycle_count || 0), 0);
    const customersWithVehicles = customers.filter((c) => c.motorcycle_count > 0).length;
    const pendingCustomers = customers.filter((c) => isCustomerPending(c)).length;
    return { totalCustomers, totalVehicles, customersWithVehicles, pendingCustomers };
  }, [customers]);

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
        {/* Success Banner */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Unified Single Card (Expanded, No Harsh Dividers) */}
        <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6">
          {/* Header */}
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-semibold text-primary">
                  <UserCheck className="size-3.5" />
                  Gestão de Clientes
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Carteira do Tenant
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Clientes & Condutores
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Gerencie todos os clientes da sua carteira, consulte seus veículos cadastrados e equipamentos vinculados, ou adicione novos condutores.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => void fetchCustomers()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
                Atualizar
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="size-4" />
                Novo Cliente
              </button>
            </div>
          </header>

          {/* Metrics (Clean, borderless on card surface) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Total de Clientes
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.totalCustomers}
                </span>
                <span className="text-xs font-medium text-primary">condutores</span>
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Clientes com Veículos
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.customersWithVehicles}
                </span>
                <span className="text-xs font-medium text-emerald-400">ativos</span>
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Motos Monitoradas
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.totalVehicles}
                </span>
                <span className="text-xs font-medium text-cyan-400">veículos</span>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail, telefone ou empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-background/60 py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role) && tenants.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <select
                    value={tenantFilter}
                    onChange={(e) => setTenantFilter(e.target.value)}
                    className="rounded-xl bg-background/60 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary focus:outline-none"
                  >
                    <option value="all">Todas as Empresas</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trade_name || t.legal_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1 rounded-xl bg-background/50 p-1">
                <button
                  onClick={() => setVehicleFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    vehicleFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setVehicleFilter("pending")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    vehicleFilter === "pending"
                      ? "bg-amber-500 text-zinc-950 shadow-sm"
                      : stats.pendingCustomers > 0
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pendentes ({stats.pendingCustomers})
                </button>
                <button
                  onClick={() => setVehicleFilter("has_vehicles")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    vehicleFilter === "has_vehicles"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Com Veículos
                </button>
                <button
                  onClick={() => setVehicleFilter("no_vehicles")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    vehicleFilter === "no_vehicles"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sem Veículos
                </button>
              </div>
            </div>
          </div>

          {/* Customers Clean List */}
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <RefreshCw className="size-8 animate-spin text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider">Carregando clientes...</p>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
              <Users className="size-10 text-muted-foreground/60" />
              <h3 className="font-display text-base font-bold text-foreground">Nenhum cliente encontrado</h3>
              <p className="max-w-md text-xs text-muted-foreground">
                Nenhum cliente corresponde aos critérios de pesquisa. Cadastre novos clientes no botão acima.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCustomers.map((cust) => {
                const initials = cust.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={cust.id}
                    className="flex flex-col gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-background/40"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      {/* Identity */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
                          {initials || "CL"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-sm font-bold text-foreground">
                              {cust.name}
                            </p>
                            {isCustomerPending(cust) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                <Clock className="size-3" />
                                Aguardando Aprovação
                              </span>
                            )}
                            {isCustomerInactive(cust) && (
                              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                                Inativo / Recusado
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                cust.motorcycle_count > 0
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {cust.motorcycle_count} / {cust.vehicle_limit || 1} {(cust.vehicle_limit || 1) === 1 ? "Moto" : "Motos"}
                            </span>
                            {cust.motorcycle_count >= (cust.vehicle_limit || 1) && (
                              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                Limite Atingido
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Mail className="size-3" />
                              {cust.email}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3 text-primary" />
                              {cust.phone || "--"}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <Calendar className="size-3" />
                              {cust.date_of_birth ? new Date(cust.date_of_birth).toLocaleDateString("pt-BR") : "--"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tenant, Manager & Quick Actions */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-secondary/70 px-2.5 py-1 text-[11px] font-medium text-foreground">
                          <Building2 className="size-3 text-primary shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {cust.tenant_name || cust.tenant_slug || "Empresa Parceira"}
                          </span>
                        </span>

                        {cust.manager_email ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                            <ShieldCheck className="size-3 shrink-0" />
                            <span className="truncate max-w-[150px]" title={cust.manager_email}>
                              {cust.manager_name || cust.manager_email}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 px-2.5 py-1 text-[11px] text-muted-foreground">
                            Sem Gestor
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenLimitModal(cust)}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                          title="Determinar limite de veículos deste cliente"
                        >
                          <Bike className="size-3 text-primary shrink-0" />
                          <span>Limite: {cust.vehicle_limit || 1}</span>
                        </button>

                        {currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role) && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(cust)}
                            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                            title="Vincular ou alterar gestor deste cliente"
                          >
                            <UserPlus className="size-3 text-primary shrink-0" />
                            <span>{cust.manager_id ? "Trocar Gestor" : "Vincular Gestor"}</span>
                          </button>
                        )}

                        {(isCustomerPending(cust) || isCustomerInactive(cust)) && (
                          <button
                            type="button"
                            disabled={reviewingCustomerId === cust.id}
                            onClick={() => void handleReviewCustomer(cust, "approve")}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Check className="size-3 shrink-0" />
                            <span>{isCustomerPending(cust) ? "Aprovar" : "Reativar"}</span>
                          </button>
                        )}

                        {isCustomerPending(cust) && (
                          <button
                            type="button"
                            disabled={reviewingCustomerId === cust.id}
                            onClick={() => void handleReviewCustomer(cust, "reject")}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <X className="size-3 shrink-0" />
                            <span>Recusar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Linked Vehicles Inline Strip */}
                    {cust.motorcycles && cust.motorcycles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-13.5 text-xs">
                        <span className="text-[11px] font-medium text-muted-foreground">Veículos:</span>
                        {cust.motorcycles.map((m) => (
                          <div
                            key={m.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-secondary/40 px-2.5 py-1 text-xs"
                          >
                            <Bike className="size-3 text-primary" />
                            <span className="font-semibold text-foreground">
                              {m.brand} {m.model}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground uppercase">
                              {m.license_plate}
                            </span>
                            {m.device ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-cyan-400">
                                <Cpu className="size-3" />
                                {m.device.serial_number}
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-400">Sem IMEI</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Novo Cliente */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <UserPlus className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase text-foreground">Novo Cliente</h2>
                    <p className="text-xs text-muted-foreground">Cadastre um novo condutor na sua carteira</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCustomer} className="mt-6 space-y-4">
                {/* Master Admin: Explicit Tenant and Manager Affiliation */}
                {currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role) ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-primary" />
                        Empresa / Tenant *
                      </label>
                      <select
                        required
                        value={formTenantId}
                        onChange={(e) => {
                          setFormTenantId(e.target.value);
                          setFormManagerId("");
                        }}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione o Tenant</option>
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.trade_name || t.legal_name} ({t.slug})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-primary" />
                        Gerente Responsável
                      </label>
                      <select
                        value={formManagerId}
                        onChange={(e) => setFormManagerId(e.target.value)}
                        disabled={!formTenantId}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="">Sem gerente vinculado</option>
                        {currentUser.user.id && (
                          <option value={currentUser.user.id}>
                            Admin Raiz ({currentUser.user.email}) — Assinante Direto
                          </option>
                        )}
                        {managers
                          .filter((m) => m.tenant_id === formTenantId)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.email} ({m.role})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-xs">Filiação à sua Carteira</p>
                      <p className="text-[11px]">
                        Este cliente será associado estritamente à sua organização e sob sua gestão de frota.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo da Silva"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="carlos@email.com"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Telefone / Celular *
                      </label>
                      {formPhone && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            phoneValidation.isValid
                              ? "text-emerald-500"
                              : phoneValidation.type === "incomplete"
                                ? "text-amber-500"
                                : "text-rose-500"
                          }`}
                        >
                          {phoneValidation.isValid ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              <span>{phoneValidation.type === "mobile" ? "Celular (9 dígitos)" : "Fixo"}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3" />
                              <span>
                                {phoneValidation.type === "incomplete" ? "Incompleto" : "Inválido"}
                              </span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <input
                      type="tel"
                      required
                      value={formPhone}
                      onChange={handlePhoneChange}
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="(11) 98888-7777"
                      maxLength={15}
                      className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
                        phoneTouched && !phoneValidation.isValid
                          ? "border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : phoneValidation.isValid
                            ? "border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            : "border-border focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    {phoneTouched && !phoneValidation.isValid && (
                      <p className="text-[11px] text-rose-500">
                        {phoneValidation.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CalendarPicker
                    label="Data de Nascimento"
                    name="date_of_birth"
                    value={formDob}
                    onChange={(val) => setFormDob(val)}
                    placeholder="Selecione a data de nascimento"
                    required
                    mode="birthdate"
                    maxDate={new Date().toISOString().split("T")[0]}
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Senha Provisória
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Opcional (gerada auto)"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Bike className="size-3.5 text-primary" />
                    Limite de Veículos Permitidos (Cota do Cliente) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formVehicleLimit}
                    onChange={(e) => setFormVehicleLimit(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Define quantos veículos o cliente pode cadastrar simultaneamente nesta organização (1 por padrão).
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      "Salvar Cliente"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Vincular Gestor ao Cliente (Master Admin) */}
        {assigningCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                      Vincular Gestor
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Atribua o cliente a um gerente de carteira.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAssignModal}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAssign} className="space-y-4">
                {assignError && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{assignError}</p>
                  </div>
                )}

                <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-bold text-foreground">{assigningCustomer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-mono text-foreground">{assigningCustomer.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organização:</span>
                    <span className="font-semibold text-primary">{assigningCustomer.tenant_name || "Sem organização"}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selecione o Gestor Responsável
                  </label>
                  <select
                    required
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">Selecione o Gestor Responsável</option>
                    {managers
                      .filter((m) => !assigningCustomer.tenant_id || m.tenant_id === assigningCustomer.tenant_id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.email} {m.tenant_name ? `(${m.tenant_name})` : ""}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    O gestor terá acesso à carteira deste cliente e seus veículos.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={handleCloseAssignModal}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingAssign}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingAssign ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Gravando...</span>
                      </>
                    ) : (
                      <span>Confirmar Vinculação</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Ajustar Limite de Veículos do Cliente (Managers & Admin Master) */}
        {adjustingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Bike className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                      Ajustar Limite de Veículos
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Cliente: <b className="text-foreground">{adjustingCustomer.name}</b>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseLimitModal}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {limitError && (
                <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
                  <AlertCircle className="size-4 shrink-0" />
                  <p>{limitError}</p>
                </div>
              )}

              <form onSubmit={handleSaveLimit} className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Veículos Cadastrados:</span>
                    <span className="font-bold text-foreground font-mono">{adjustingCustomer.motorcycle_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Limite Atual:</span>
                    <span className="font-bold text-primary font-mono">{adjustingCustomer.vehicle_limit || 1} veículo(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organização:</span>
                    <span className="font-semibold text-foreground">{adjustingCustomer.tenant_name || "Sem organização"}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Novo Limite de Veículos *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={adjustedVehicleLimit}
                    onChange={(e) => setAdjustedVehicleLimit(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ao atingir este limite, o cliente será impedido de cadastrar novos veículos na plataforma até que a cota seja reajustada.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={handleCloseLimitModal}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/60 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingLimit}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {savingLimit ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Salvar Limite</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
