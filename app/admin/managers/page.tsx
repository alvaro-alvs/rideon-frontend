"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isMasterAdmin } from "@/lib/auth";
import type { Manager } from "@/lib/types/manager";

export default function AdminManagersPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

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
    }
  }, [currentUser]);

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
      <div className="mx-auto max-w-7xl py-4 space-y-8">
        {/* Header Hero */}
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-secondary/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary border border-primary/20">
                  <ShieldAlert className="size-3.5" />
                  Painel Master Admin
                </span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary border border-primary/30">
                  Gestão de Gerentes & Tenants
                </span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                Gerentes da Plataforma
              </h1>
              <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
                Visão consolidada de todos os gestores e parceiros White-Label. Cada gerente administra seus equipamentos, clientes e frota no seu respectivo tenant.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchManagers()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary hover:border-primary/40 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total de Gerentes
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {stats.totalManagers}
                </span>
                <span className="text-[10px] font-semibold text-primary">ativos</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tenants Parceiros
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {stats.totalTenants}
                </span>
                <span className="text-[10px] font-semibold text-emerald-500">marcas</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Equipamentos em Gestão
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {stats.totalDevices}
                </span>
                <span className="text-[10px] font-semibold text-cyan-400">rastreadores</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Clientes Finais Atendidos
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {stats.totalCustomers}
                </span>
                <span className="text-[10px] font-semibold text-purple-400">condutores</span>
              </div>
            </div>
          </div>
        </header>

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por e-mail do gerente, nome da empresa ou slug..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1 text-xs">
              <button
                onClick={() => setRoleFilter("all")}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase tracking-wider transition-all ${
                  roleFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setRoleFilter("owner")}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase tracking-wider transition-all ${
                  roleFilter === "owner"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Proprietários
              </button>
              <button
                onClick={() => setRoleFilter("manager")}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase tracking-wider transition-all ${
                  roleFilter === "manager"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gerentes
              </button>
            </div>
          </div>
        </div>

        {/* Managers Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider">Carregando gerentes...</p>
            </div>
          </div>
        ) : filteredManagers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
            <Building2 className="size-10 text-muted-foreground/60" />
            <h3 className="text-sm font-bold uppercase text-foreground">Nenhum gerente encontrado</h3>
            <p className="max-w-md text-xs text-muted-foreground">
              Nenhum gestor corresponde aos filtros aplicados. Crie novos parceiros ou ajuste os termos de busca.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredManagers.map((m) => {
              const initials = m.email
                .split("@")[0]
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={m.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-5 shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-primary/5"
                >
                  <div className="space-y-4">
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-sm font-black text-primary shadow-inner">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-foreground">
                            {m.email.split("@")[0]}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                            <Mail className="size-3 text-muted-foreground" />
                            <span className="truncate max-w-[160px]">{m.email}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                          m.role === "tenant_owner"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : m.role === "admin" || m.role === "platform_admin"
                              ? "bg-red-500/10 text-red-400 border border-red-500/30"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {m.role === "tenant_owner"
                          ? "Proprietário"
                          : m.role === "admin" || m.role === "platform_admin"
                            ? "Administrador"
                            : "Gerente"}
                      </span>
                    </div>

                    {/* Tenant Badge Pill */}
                    <div className="rounded-xl border border-border/60 bg-secondary/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="size-3 text-primary" />
                          Tenant White-Label
                        </span>
                        <span className="text-[10px] font-mono text-primary font-bold">
                          {m.tenant_slug || "sem slug"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-black text-foreground truncate">
                        {m.tenant_name || "RideOn Default"}
                      </p>
                    </div>

                    {/* Operation Stats */}
                    <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
                      <div className="rounded-lg bg-background/50 p-2 border border-border/40">
                        <Cpu className="mx-auto size-3.5 text-cyan-400 mb-1" />
                        <p className="text-sm font-black text-foreground">{m.device_count || 0}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Equipamentos</p>
                      </div>

                      <div className="rounded-lg bg-background/50 p-2 border border-border/40">
                        <Users className="mx-auto size-3.5 text-purple-400 mb-1" />
                        <p className="text-sm font-black text-foreground">{m.customer_count || 0}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Clientes</p>
                      </div>

                      <div className="rounded-lg bg-background/50 p-2 border border-border/40">
                        <Bike className="mx-auto size-3.5 text-emerald-400 mb-1" />
                        <p className="text-sm font-black text-foreground">{m.motorcycle_count || 0}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Motos</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[10px] text-muted-foreground font-mono">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Status: {m.status || "Ativo"}
                    </span>
                    <span>Criado: {m.created_at ? new Date(m.created_at).toLocaleDateString("pt-BR") : "--"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
