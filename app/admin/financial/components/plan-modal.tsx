"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Building2, Globe, Sparkles, X } from "lucide-react";

import { PaymentMethodsPicker } from "@/app/admin/financial/components/payment-methods-picker";
import {
  formatCurrencyCents,
  formatPriceInputFromDigits,
  normalizeSelectedMethods,
  parsePriceInputToCents,
} from "@/lib/financial-format";
import type {
  BillingCycle,
  BillingPlan,
  PaymentMethod,
} from "@/lib/types/financial";
import type { TenantItem } from "@/lib/types/tenant";

interface PlanModalProps {
  open: boolean;
  editingPlan: BillingPlan | null;
  isMaster: boolean;
  tenants: TenantItem[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function PlanModal({
  open,
  editingPlan,
  isMaster,
  tenants,
  onClose,
  onSaved,
}: PlanModalProps) {
  if (!open) return null;
  const modalKey = editingPlan ? `edit:${editingPlan.id}` : "new";
  return (
    <PlanModalDialog
      key={modalKey}
      editingPlan={editingPlan}
      isMaster={isMaster}
      tenants={tenants}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

interface PlanModalDialogProps {
  editingPlan: BillingPlan | null;
  isMaster: boolean;
  tenants: TenantItem[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function PlanModalDialog({
  editingPlan,
  isMaster,
  tenants,
  onClose,
  onSaved,
}: PlanModalDialogProps) {
  const initial = useMemo(() => {
    if (editingPlan) {
      const cycle = editingPlan.billing_cycle || "monthly";
      const methods = editingPlan.allowed_payment_methods?.length
        ? editingPlan.allowed_payment_methods
        : (["pix", "card"] as PaymentMethod[]);
      return {
        name: editingPlan.name || "",
        description: editingPlan.description || "",
        billingCycle: cycle,
        amountReais: formatCurrencyCents(editingPlan.amount_cents || 9990),
        allowInstallments:
          cycle === "yearly" ? Boolean(editingPlan.allow_installments) : true,
        allowedMethods: normalizeSelectedMethods(methods),
        active: editingPlan.active !== false,
        tenantId: editingPlan.tenant_id || "",
      };
    }

    return {
      name: "",
      description: "",
      billingCycle: "monthly" as BillingCycle,
      amountReais: "R$ 99,90",
      allowInstallments: true,
      allowedMethods: ["pix", "card"] as PaymentMethod[],
      active: true,
      tenantId: "",
    };
  }, [editingPlan]);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    initial.billingCycle,
  );
  const [amountReais, setAmountReais] = useState(initial.amountReais);
  const [allowInstallments, setAllowInstallments] = useState(
    initial.allowInstallments,
  );
  const [allowedMethods, setAllowedMethods] = useState<PaymentMethod[]>(
    initial.allowedMethods,
  );
  const [active, setActive] = useState(initial.active);
  const [tenantId, setTenantId] = useState(initial.tenantId);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose]);

  const amountCents = parsePriceInputToCents(amountReais);
  const installmentCents = Math.round(amountCents / 12);
  const hasCardAllowed = allowedMethods.includes("card");

  const handleCycleChange = (nextCycle: BillingCycle) => {
    setBillingCycle(nextCycle);
    if (nextCycle === "yearly" && !editingPlan) {
      setAllowInstallments(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError("Informe o nome do template de plano.");
      return;
    }
    if (!amountCents || amountCents <= 0) {
      setModalError("Informe um valor válido maior que R$ 0,00.");
      return;
    }
    if (allowedMethods.length === 0) {
      setModalError("Ative pelo menos um meio de pagamento.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const isEdit = Boolean(editingPlan);
      const endpoint = isEdit
        ? `/api/admin/financial/plans/${editingPlan!.id}`
        : "/api/admin/financial/plans";

      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        billing_cycle: billingCycle,
        amount_cents: amountCents,
        allow_installments: billingCycle === "yearly" && allowInstallments,
        allowed_payment_methods: allowedMethods,
        active,
      };
      if (!isEdit && isMaster && tenantId) {
        payload.tenant_id = tenantId;
      }

      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setModalError(
          body?.error?.message ||
            body?.message ||
            "Falha ao salvar template de plano.",
        );
        return;
      }
      await onSaved();
      onClose();
    } catch {
      setModalError("Erro de conexão ao salvar template de plano.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div>
            <h2
              id="plan-modal-title"
              className="font-display text-base font-bold tracking-tight text-foreground"
            >
              {editingPlan ? "Editar Template de Plano" : "Novo Template de Plano"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {editingPlan
                ? "Atualize valores, recorrência e meios de pagamento do modelo."
                : "Crie um modelo reutilizável para agilizar o lançamento de cobranças."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar modal"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs">
            {/* Master Admin scope selector on creation */}
            {!editingPlan && isMaster && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                  {tenantId ? (
                    <Building2 className="size-3.5" />
                  ) : (
                    <Globe className="size-3.5 text-primary" />
                  )}
                  Visibilidade do Template (Master Admin)
                </label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">
                    Global — disponível para toda a plataforma (todos os gerentes)
                  </option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      Organização: {t.trade_name || t.legal_name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Name & Amount */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <label className="mb-1.5 block font-semibold text-muted-foreground">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Plano Proteção 24h"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="mb-1.5 block font-semibold text-muted-foreground">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountReais}
                  onChange={(e) =>
                    setAmountReais(formatPriceInputFromDigits(e.target.value))
                  }
                  placeholder="R$ 0,00"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block font-semibold text-muted-foreground">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Rastreamento 24h + bloqueio remoto + cercas virtuais"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Billing Cycle */}
            <div>
              <label className="mb-1.5 block font-semibold text-muted-foreground">
                Recorrência Padrão
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "monthly", label: "Mensal", hint: "Recorrente" },
                    { id: "yearly", label: "Anual", hint: "12 meses" },
                    { id: "one_time", label: "Única", hint: "Avulsa" },
                  ] as const
                ).map((opt) => {
                  const selected = billingCycle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleCycleChange(opt.id)}
                      className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background/60 text-muted-foreground hover:border-border/90 hover:text-foreground"
                      }`}
                    >
                      <span className="font-semibold leading-tight">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 text-[10px] opacity-75">
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Yearly Installments */}
            {billingCycle === "yearly" && (
              <div
                className={`rounded-xl border p-3 transition ${
                  allowInstallments
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/80 bg-secondary/20"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={allowInstallments}
                    onChange={(e) => setAllowInstallments(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                      <span>Permitir parcelamento em 12x no cartão</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        <Sparkles className="size-2.5" />
                        Padrão
                      </span>
                    </div>
                    {allowInstallments ? (
                      <p className="text-[11px] text-muted-foreground">
                        Cliente verá{" "}
                        <strong className="text-foreground">
                          12x de {formatCurrencyCents(installmentCents)}/mês
                        </strong>{" "}
                        (Total anual: {amountReais})
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Cobrança anual exibida somente à vista ({amountReais}).
                      </p>
                    )}
                    {allowInstallments && !hasCardAllowed && (
                      <p className="pt-0.5 text-[11px] text-amber-400">
                        Dica: ative o switch de Cartão abaixo para permitir 12x.
                      </p>
                    )}
                  </div>
                </label>
              </div>
            )}

            {/* Payment Methods */}
            <PaymentMethodsPicker
              label="Meios de pagamento padrão"
              selectedMethods={allowedMethods}
              onChange={setAllowedMethods}
              billingCycle={billingCycle}
              allowInstallments={allowInstallments}
            />

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3.5 py-2.5">
              <div>
                <div className="font-semibold text-foreground">
                  Template ativo
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Planos ativos aparecem no seletor ao criar uma nova cobrança.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                  active
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-border bg-secondary"
                }`}
              >
                <span
                  className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    active ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-rose-300">
                <AlertCircle className="size-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 bg-background/40 px-5 py-3.5 text-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || allowedMethods.length === 0}
              className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : editingPlan
                  ? "Salvar Alterações"
                  : "Criar Plano"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
