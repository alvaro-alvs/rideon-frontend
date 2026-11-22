"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Globe,
  Layers,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";

import { PlanModal } from "@/app/admin/financial/components/plan-modal";
import {
  formatBillingCycleLabel,
  formatCurrencyCents,
  PAYMENT_METHOD_LABELS,
} from "@/lib/financial-format";
import type { BillingPlan } from "@/lib/types/financial";
import type { TenantItem } from "@/lib/types/tenant";

interface PlansTabProps {
  plans: BillingPlan[];
  loading: boolean;
  isMaster: boolean;
  userRole?: string;
  currentUserId?: string | null;
  tenants: TenantItem[];
  onRefresh: () => Promise<void> | void;
}

function canUserManagePlan(
  plan: BillingPlan,
  isMaster: boolean,
  userRole: string | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (isMaster) return true;
  if (!plan.tenant_id) return false;
  if (userRole === "manager") {
    return Boolean(currentUserId && plan.manager_id === currentUserId);
  }
  if (userRole === "tenant_owner" || userRole === "tenant_admin") {
    return true;
  }
  return false;
}

export function PlansTab({
  plans,
  loading,
  isMaster,
  userRole,
  currentUserId,
  tenants,
  onRefresh,
}: PlansTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const tenantNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tenants) {
      map.set(t.id, t.trade_name || t.legal_name || t.slug);
    }
    return map;
  }, [tenants]);

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p) => p.active !== false).length;
    const ownOrEditable = plans.filter((p) =>
      canUserManagePlan(p, isMaster, userRole, currentUserId),
    ).length;
    return { total, active, ownOrEditable };
  }, [plans, isMaster, userRole, currentUserId]);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return plans.filter((p) => {
      const isActive = p.active !== false;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        formatBillingCycleLabel(p.billing_cycle, p.allow_installments)
          .toLowerCase()
          .includes(q)
      );
    });
  }, [plans, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setActionError("");
    setEditingPlan(null);
    setModalOpen(true);
  };

  const openEditModal = (plan: BillingPlan) => {
    setActionError("");
    setEditingPlan(plan);
    setModalOpen(true);
  };

  const handleToggleActive = async (plan: BillingPlan) => {
    setBusyId(plan.id);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/financial/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !(plan.active !== false) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(
          body?.error?.message || body?.message || "Erro ao atualizar status.",
        );
        return;
      }
      await onRefresh();
    } catch {
      setActionError("Erro de conexão ao atualizar status do plano.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (planId: string) => {
    setBusyId(planId);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/financial/plans/${planId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(
          body?.error?.message || body?.message || "Erro ao excluir plano.",
        );
        return;
      }
      setConfirmDeleteId(null);
      await onRefresh();
    } catch {
      setActionError("Erro de conexão ao excluir plano.");
    } finally {
      setBusyId(null);
    }
  };

  const renderScopeBadge = (plan: BillingPlan) => {
    if (!plan.tenant_id) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Globe className="size-2.5" />
          Global (Master)
        </span>
      );
    }
    if (!plan.manager_id) {
      const tName = tenantNameMap.get(plan.tenant_id);
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
          <Building2 className="size-2.5" />
          {tName ? tName : "Organização"}
        </span>
      );
    }
    const isMine = currentUserId && plan.manager_id === currentUserId;
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <UserCheck className="size-2.5" />
        {isMine ? "Meu Plano" : "Gerente"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="py-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Layers className="size-4 text-primary" />
            <span>Total de Templates</span>
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-foreground">
            {stats.total}
          </p>
        </div>
        <div className="py-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>Planos Ativos</span>
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-emerald-400">
            {stats.active}
          </p>
        </div>
        <div className="py-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserCheck className="size-4 text-sky-400" />
            <span>Administráveis por Você</span>
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-sky-400">
            {stats.ownOrEditable}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {actionError}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plano por nome, descrição..."
              className="w-full rounded-xl bg-background/60 py-2.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-xl bg-background/50 p-1">
            {(
              [
                { id: "all", label: "Todos" },
                { id: "active", label: "Ativos" },
                { id: "inactive", label: "Inativos" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  statusFilter === opt.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 cursor-pointer"
        >
          <Plus className="size-4" />
          Novo Plano
        </button>
      </div>

      {/* Plans Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-background/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Escopo</th>
              <th className="px-4 py-3">Valor & Recorrência</th>
              <th className="px-4 py-3">Meios de Pagamento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Carregando templates de planos...
                </td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {plans.length === 0
                    ? "Nenhum template de plano cadastrado ainda. Clique em \"Novo Plano\" para criar."
                    : "Nenhum plano encontrado para os filtros atuais."}
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => {
                const isActive = plan.active !== false;
                const editable = canUserManagePlan(
                  plan,
                  isMaster,
                  userRole,
                  currentUserId,
                );
                const isBusy = busyId === plan.id;
                const isConfirmingDelete = confirmDeleteId === plan.id;

                return (
                  <tr
                    key={plan.id}
                    className={`transition hover:bg-secondary/20 ${
                      !isActive ? "opacity-65" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {plan.name}
                      </div>
                      {plan.description && (
                        <div className="mt-0.5 max-w-xs truncate text-[11px] text-muted-foreground">
                          {plan.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{renderScopeBadge(plan)}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-foreground">
                        {formatCurrencyCents(plan.amount_cents)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatBillingCycleLabel(
                          plan.billing_cycle,
                          plan.allow_installments,
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(plan.allowed_payment_methods ?? []).map((m) => (
                          <span
                            key={m}
                            className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-semibold text-foreground"
                          >
                            {PAYMENT_METHOD_LABELS[m] || m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleActive(plan)}
                          title={
                            isActive
                              ? "Clique para desativar"
                              : "Clique para ativar"
                          }
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {isActive ? "Ativo" : "Inativo"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-border bg-secondary text-muted-foreground"
                          }`}
                        >
                          {isActive ? "Ativo" : "Inativo"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!editable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Lock className="size-3" />
                          Somente uso
                        </span>
                      ) : isConfirmingDelete ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDelete(plan.id)}
                            className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30 cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? "Excluindo..." : "Confirmar"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(plan)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-secondary cursor-pointer"
                          >
                            <Pencil className="size-3" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(plan.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-400 transition hover:bg-rose-500/20 cursor-pointer"
                          >
                            <Trash2 className="size-3" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PlanModal
        open={modalOpen}
        editingPlan={editingPlan}
        isMaster={isMaster}
        tenants={tenants}
        onClose={() => {
          setModalOpen(false);
          setEditingPlan(null);
        }}
        onSaved={onRefresh}
      />
    </div>
  );
}
