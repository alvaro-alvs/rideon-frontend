"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Calendar,
  CheckCircle2,
  Cpu,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
  AlertCircle,
  Tag,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin, isMasterAdmin } from "@/lib/auth";
import type { Customer } from "@/lib/types/customer";

export default function AdminCustomersPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<"all" | "has_vehicles" | "no_vehicles">("all");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      void fetchCustomers();
    }
  }, [currentUser]);

  const handleCreateCustomer = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          date_of_birth: formDob,
          password: formPassword || undefined,
        }),
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
      void fetchCustomers();

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCreating(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);

      const matchesVehicle =
        vehicleFilter === "all" ||
        (vehicleFilter === "has_vehicles" && c.motorcycle_count > 0) ||
        (vehicleFilter === "no_vehicles" && c.motorcycle_count === 0);

      return matchesSearch && matchesVehicle;
    });
  }, [customers, searchQuery, vehicleFilter]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalVehicles = customers.reduce((acc, c) => acc + (c.motorcycle_count || 0), 0);
    const customersWithVehicles = customers.filter((c) => c.motorcycle_count > 0).length;
    return { totalCustomers, totalVehicles, customersWithVehicles };
  }, [customers]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl py-4 space-y-8">
        {/* Header Hero */}
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-secondary/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary border border-primary/20">
                  <UserCheck className="size-3.5" />
                  Gestão de Clientes
                </span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary border border-primary/30">
                  Carteira do Tenant
                </span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                Clientes & Condutores
              </h1>
              <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
                Gerencie todos os clientes da sua carteira, consulte seus veículos cadastrados e equipamentos vinculados, ou adicione novos condutores.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchCustomers()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary hover:border-primary/40 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
                Atualizar
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus className="size-4 stroke-[3]" />
                Novo Cliente
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total de Clientes
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {stats.totalCustomers}
                </span>
                <span className="text-[10px] font-semibold text-primary">condutores</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Clientes com Veículos
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {stats.customersWithVehicles}
                </span>
                <span className="text-[10px] font-semibold text-emerald-400">ativos</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Motos Monitoradas
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {stats.totalVehicles}
                </span>
                <span className="text-[10px] font-semibold text-cyan-400">veículos</span>
              </div>
            </div>
          </div>
        </header>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-400 shadow-lg animate-in fade-in duration-200">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
            <p className="flex-1">{successMessage}</p>
            <button onClick={() => setSuccessMessage("")} className="text-emerald-400/80 hover:text-emerald-400">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Controls & Filters Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone do cliente..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1 text-xs">
              <button
                onClick={() => setVehicleFilter("all")}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase tracking-wider transition-all ${
                  vehicleFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setVehicleFilter("has_vehicles")}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase tracking-wider transition-all ${
                  vehicleFilter === "has_vehicles"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Com Veículos
              </button>
              <button
                onClick={() => setVehicleFilter("no_vehicles")}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase tracking-wider transition-all ${
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

        {/* Customer Cards List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider">Carregando clientes...</p>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
            <Users className="size-10 text-muted-foreground/60" />
            <h3 className="text-sm font-bold uppercase text-foreground">Nenhum cliente encontrado</h3>
            <p className="max-w-md text-xs text-muted-foreground">
              Nenhum cliente corresponde aos critérios de pesquisa. Cadastre novos clientes no botão acima.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-5 shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-primary/5"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-sm font-black text-primary shadow-inner">
                          {initials || "CL"}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-foreground">
                            {cust.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                            <Mail className="size-3 text-muted-foreground" />
                            <span className="truncate max-w-[170px]">{cust.email}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                          cust.motorcycle_count > 0
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {cust.motorcycle_count === 1
                          ? "1 Moto"
                          : cust.motorcycle_count > 1
                            ? `${cust.motorcycle_count} Motos`
                            : "Sem Moto"}
                      </span>
                    </div>

                    {/* Contact Info Pill */}
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Phone className="size-3 text-primary" />
                        {cust.phone || "--"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                        <Calendar className="size-3 text-muted-foreground" />
                        {cust.date_of_birth ? new Date(cust.date_of_birth).toLocaleDateString("pt-BR") : "--"}
                      </span>
                    </div>

                    {/* Vehicles Section */}
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Veículos Vinculados</span>
                        <span className="font-mono text-foreground font-bold">{cust.motorcycles?.length || 0}</span>
                      </p>

                      {cust.motorcycles && cust.motorcycles.length > 0 ? (
                        <div className="space-y-1.5">
                          {cust.motorcycles.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Bike className="size-3.5 text-primary" />
                                <div>
                                  <p className="font-bold text-foreground text-[11px] leading-tight">
                                    {m.brand} {m.model}
                                  </p>
                                  <p className="font-mono text-[10px] text-muted-foreground uppercase">
                                    {m.license_plate}
                                  </p>
                                </div>
                              </div>

                              <div>
                                {m.device ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400">
                                    <Cpu className="size-2.5" />
                                    {m.device.serial_number}
                                  </span>
                                ) : (
                                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                                    Sem IMEI
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] italic text-muted-foreground">
                          Nenhum veículo associado a este cliente.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[10px] text-muted-foreground font-mono">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Status: {cust.status || "Ativo"}
                    </span>
                    <span>Criado: {cust.created_at ? new Date(cust.created_at).toLocaleDateString("pt-BR") : "--"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
                  onClick={() => setIsModalOpen(false)}
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
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="(11) 98888-7777"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Data de Nascimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

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

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
      </div>
    </DashboardShell>
  );
}
