"use client";

import { useEffect, useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Cpu,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Bike,
  ExternalLink,
  SlidersHorizontal,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isMasterAdmin } from "@/lib/auth";
import type { Manager } from "@/lib/types/manager";
import type { TenantItem } from "@/lib/types/tenant";

export default function AdminManagersPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [managers, setManagers] = useState<Manager[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formTenantId, setFormTenantId] = useState("");
  const [formRole, setFormRole] = useState<"manager" | "tenant_admin" | "tenant_owner">("manager");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Protect route - only Master Admin (platform_admin or admin)
  useEffect(() => {
    if (currentUser.status === "loading") return;
    if (currentUser.status === "unauthenticated") {
      router.replace(`/login?expired=1&from=${encodeURIComponent("/admin/managers")}`);
      return;
    }
    if (currentUser.status === "authenticated" && !isMasterAdmin(currentUser.user.role)) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const fetchManagers = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/managers");
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.location.replace("/login?expired=1&from=" + encodeURIComponent("/admin/managers"));
        }
        return;
      }
      if (res.ok) {
        const body = await res.json();
        const list: Manager[] = Array.isArray(body?.data)
          ? body.data.filter((m: Manager) => m.role !== "admin" && m.role !== "platform_admin")
          : [];
        setManagers(list);
      }
    } catch {
      // Ignorar falha transitória
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser.status === "authenticated" && isMasterAdmin(currentUser.user.role)) {
      void fetchManagers();
      fetch("/api/admin/tenants")
        .then((res) => (res.ok ? res.json() : []))
        .then((data: TenantItem[]) => {
          if (Array.isArray(data)) setTenants(data);
        })
        .catch(() => { });
    }
  }, [currentUser]);

  const handleOpenModal = () => {
    setFormError("");
    if (!formTenantId && tenants.length > 0) {
      setFormTenantId(tenants[0].id);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("manager");
  };

  const handleCreateManager = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formEmail.trim()) {
      setFormError("O e-mail do gerente é obrigatório.");
      return;
    }
    if (!formTenantId) {
      setFormError("Selecione a empresa/tenant à qual o gerente pertence.");
      return;
    }
    if (formPassword && formPassword.length < 6) {
      setFormError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, string> = {
        email: formEmail.trim(),
        tenant_id: formTenantId,
        role: formRole,
      };
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      const res = await fetch("/api/admin/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Falha ao cadastrar gerente.");
      }

      setManagers((prev) => [data as Manager, ...prev]);
      setSuccessMessage(`Gerente "${data.email}" cadastrado com sucesso!`);
      setTimeout(() => setSuccessMessage(""), 5000);
      handleCloseModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido ao cadastrar gerente.");
    } finally {
      setCreating(false);
    }
  };

  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        m.email.toLowerCase().includes(q) ||
        (m.tenant_name && m.tenant_name.toLowerCase().includes(q)) ||
        (m.tenant_slug && m.tenant_slug.toLowerCase().includes(q));

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "owner" && m.role === "tenant_owner") ||
        (roleFilter === "manager" && (m.role === "tenant_admin" || m.role === "manager"));

      return matchesSearch && matchesRole;
    });
  }, [managers, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    const totalTenants = new Set(
      managers.map((m) => m.tenant_id).filter(Boolean),
    ).size;
    const totalDevices = managers.reduce((acc, m) => acc + (m.device_count || 0), 0);
    const totalCustomers = managers.reduce(
      (acc, m) => acc + (m.customer_count || 0),
      0,
    );
    return {
      totalManagers: managers.length,
      totalTenants,
      totalDevices,
      totalCustomers,
    };
  }, [managers]);

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
        {successMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
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
                  <ShieldAlert className="size-3.5" />
                  Painel Master Admin
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Gestão de Gerentes & Tenants
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Gerentes da Plataforma
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Visão consolidada de todos os gestores e parceiros White-Label. Cada gerente administra seus equipamentos, clientes e frota no seu respectivo tenant.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => void fetchManagers()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
                Atualizar
              </button>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer"
              >
                <Plus className="size-4" />
                Novo Gerente
              </button>
            </div>
          </header>

          {/* Metrics (Clean, borderless on card surface) */}
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Total de Gerentes
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.totalManagers}
                </span>
                <span className="text-xs font-medium text-primary">ativos</span>
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Tenants Parceiros
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.totalTenants}
                </span>
                <span className="text-xs font-medium text-emerald-400">marcas</span>
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Equipamentos em Gestão
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.totalDevices}
                </span>
                <span className="text-xs font-medium text-cyan-400">rastreadores</span>
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-medium text-muted-foreground">
                Clientes Finais Atendidos
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.totalCustomers}
                </span>
                <span className="text-xs font-medium text-purple-400">condutores</span>
              </div>
            </div>
          </div>

          {/* Search & Role Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por e-mail do gerente, nome da empresa ou slug..."
                className="w-full rounded-xl bg-background/60 py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-background/50 p-1 text-xs">
              <button
                onClick={() => setRoleFilter("all")}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${roleFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setRoleFilter("owner")}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${roleFilter === "owner"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Proprietários
              </button>
              <button
                onClick={() => setRoleFilter("manager")}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${roleFilter === "manager"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Gerentes
              </button>
            </div>
          </div>

          {/* Managers List */}
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <RefreshCw className="size-8 animate-spin text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider">Carregando gerentes...</p>
              </div>
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
              <Building2 className="size-10 text-muted-foreground/60" />
              <h3 className="font-display text-base font-bold text-foreground">Nenhum gerente encontrado</h3>
              <p className="max-w-md text-xs text-muted-foreground">
                Nenhum gestor corresponde aos filtros aplicados. Crie novos parceiros ou ajuste os termos de busca.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredManagers.map((m) => {
                const initials = m.email
                  .split("@")[0]
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-4 rounded-xl px-4 py-3.5 transition-colors hover:bg-background/40 lg:flex-row lg:items-center lg:justify-between"
                  >
                    {/* Identity & Tenant */}
                    <div className="flex flex-wrap items-center gap-4 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-sm font-bold text-foreground">
                            {m.email.split("@")[0]}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.role === "tenant_owner"
                              ? "bg-amber-500/15 text-amber-400"
                              : m.role === "admin" || m.role === "platform_admin"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-blue-500/15 text-blue-400"
                              }`}
                          >
                            {m.role === "tenant_owner"
                              ? "Proprietário"
                              : m.role === "admin" || m.role === "platform_admin"
                                ? "Administrador"
                                : "Gerente"}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Mail className="size-3" />
                            {m.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="size-3 text-primary" />
                            <span className="font-medium text-foreground">
                              {m.tenant_name || "RideOn Default"}
                            </span>
                            {m.tenant_slug && (
                              <span className="font-mono text-[11px] text-primary">
                                ({m.tenant_slug})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Operation Stats & Status */}
                    <div className="flex flex-wrap items-center gap-6 text-xs">
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="size-3.5 text-cyan-400" />
                          <span className="font-display font-bold tabular-nums text-foreground">
                            {m.device_count || 0}
                          </span>
                          <span className="text-muted-foreground">equip.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-purple-400" />
                          <span className="font-display font-bold tabular-nums text-foreground">
                            {m.customer_count || 0}
                          </span>
                          <span className="text-muted-foreground">clientes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bike className="size-3.5 text-emerald-400" />
                          <span className="font-display font-bold tabular-nums text-foreground">
                            {m.motorcycle_count || 0}
                          </span>
                          <span className="text-muted-foreground">motos</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          {m.status || "Ativo"}
                        </span>
                        <span>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString("pt-BR") : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Manager Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Painel Master Admin
                </p>
                <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                  Cadastrar Novo Gerente
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="mt-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Empresa / Tenant *
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <select
                    value={formTenantId}
                    onChange={(e) => setFormTenantId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trade_name || t.legal_name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  E-mail de Acesso *
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="gerente@empresa.com"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Perfil / Função *
                </label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <select
                    value={formRole}
                    onChange={(e) =>
                      setFormRole(e.target.value as "manager" | "tenant_admin" | "tenant_owner")
                    }
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="manager">Gerente (Carteira Própria)</option>
                    <option value="tenant_admin">Administrador do Tenant</option>
                    <option value="tenant_owner">Proprietário do Tenant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Senha Inicial (opcional)
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="password"
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres (deixe vazio para gerar)"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? "Cadastrando..." : "Cadastrar Gerente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
