"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  QrCode,
  Sparkles,
  X,
} from "lucide-react";

import type {
  BillingCycle,
  ComplianceStatus,
  CustomerBillingSummary,
  InvoiceItem,
  PaymentMethod,
} from "@/lib/types/financial";

function formatCurrencyCents(cents?: number) {
  if (!cents) return "R$ 0,00";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPriceInputFromDigits(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "R$ 0,00";
  const cents = Number.parseInt(digits, 10);
  return formatCurrencyCents(cents);
}

function parsePriceInputToCents(formatted: string) {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

function formatLocalDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextMonthDueDate(base: Date = new Date()): string {
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();
  const lastDayOfNextMonth = new Date(year, month + 2, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfNextMonth);
  return formatLocalDateISO(new Date(year, month + 1, clampedDay));
}

function addDaysLocalISO(days: number, base: Date = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return formatLocalDateISO(d);
}

function formatShortDateBR(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getRelativeDueLabel(iso: string): { text: string; isPast: boolean } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(y, m - 1, d);
  const diffDays = Math.round((targetUtc - todayUtc) / 86_400_000);

  if (diffDays === 0) return { text: "Vence hoje", isPast: false };
  if (diffDays === 1) return { text: "Vence amanhã", isPast: false };
  if (diffDays > 1) return { text: `Em ${diffDays} dias`, isPast: false };
  const abs = Math.abs(diffDays);
  return {
    text: `Vencida há ${abs} ${abs === 1 ? "dia" : "dias"}`,
    isPast: true,
  };
}

const PAYMENT_METHOD_OPTIONS: Array<{
  id: PaymentMethod;
  label: string;
  description: string;
  icon: typeof QrCode;
}> = [
  {
    id: "pix",
    label: "PIX",
    description: "QR Code e Copia e Cola instantâneo",
    icon: QrCode,
  },
  {
    id: "card",
    label: "Cartão de Crédito",
    description: "Pagamento online com cartão de crédito",
    icon: CreditCard,
  },
  {
    id: "manual",
    label: "Manual / Dinheiro",
    description: "Pagamento direto fora do app (dinheiro, transferência)",
    icon: Banknote,
  },
];

const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["pix", "card", "manual"];

function normalizeSelectedMethods(methods: PaymentMethod[]): PaymentMethod[] {
  const set = new Set(methods);
  return PAYMENT_METHOD_ORDER.filter((m) => set.has(m));
}

function StatusPill({ status }: { status: ComplianceStatus }) {
  if (status === "compliant") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <CheckCircle2 className="size-2.5" />
        Adimplente
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
        <AlertCircle className="size-2.5" />
        Inadimplente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
      <Clock className="size-2.5" />
      Pendente
    </span>
  );
}

export interface ChargeModalProps {
  customer: CustomerBillingSummary | null;
  editingInvoice: InvoiceItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function ChargeModal({
  customer,
  editingInvoice,
  onClose,
  onSaved,
}: ChargeModalProps) {
  if (!customer) return null;
  const modalKey = `${customer.rider_id}:${editingInvoice?.id ?? "new"}`;
  return (
    <ChargeModalDialog
      key={modalKey}
      customer={customer}
      editingInvoice={editingInvoice}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

interface ChargeModalDialogProps {
  customer: CustomerBillingSummary;
  editingInvoice: InvoiceItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function getInitialFormState(
  customer: CustomerBillingSummary,
  editingInvoice: InvoiceItem | null,
) {
  const today = formatLocalDateISO(new Date());
  const nextMonth = getNextMonthDueDate();

  if (editingInvoice) {
    const cycle = editingInvoice.billing_cycle || "monthly";
    const initialMethods = editingInvoice.allowed_payment_methods?.length
      ? editingInvoice.allowed_payment_methods
      : [editingInvoice.payment_method || "card"];
    const initialNotes = editingInvoice.notes || "";
    return {
      chargeMode: (editingInvoice.status === "paid" ? "paid" : "pending") as
        | "paid"
        | "pending",
      planName: editingInvoice.plan_name || "Plano Padrão",
      billingCycle: cycle,
      allowInstallments:
        cycle === "yearly" ? Boolean(editingInvoice.allow_installments) : true,
      allowedMethods: normalizeSelectedMethods(initialMethods),
      amountReais: formatCurrencyCents(editingInvoice.amount_cents || 9990),
      paidAt: editingInvoice.paid_at ? editingInvoice.paid_at.slice(0, 10) : today,
      dueDate: editingInvoice.due_date
        ? editingInvoice.due_date.slice(0, 10)
        : nextMonth,
      notes: initialNotes,
      showNotes: Boolean(initialNotes.trim()),
    };
  }

  const initialCustomerMethods = customer.allowed_payment_methods?.length
    ? customer.allowed_payment_methods
    : (["pix", "card"] as PaymentMethod[]);

  return {
    chargeMode: "pending" as const,
    planName: customer.plan_name || "Plano Padrão",
    billingCycle: customer.billing_cycle || "monthly",
    allowInstallments: true,
    allowedMethods: normalizeSelectedMethods(initialCustomerMethods),
    amountReais: formatCurrencyCents(customer.amount_cents || 9990),
    paidAt: today,
    dueDate: nextMonth,
    notes: "",
    showNotes: false,
  };
}

function ChargeModalDialog({
  customer,
  editingInvoice,
  onClose,
  onSaved,
}: ChargeModalDialogProps) {
  const initial = useMemo(
    () => getInitialFormState(customer, editingInvoice),
    [customer, editingInvoice],
  );

  const [chargeMode, setChargeMode] = useState<"paid" | "pending">(initial.chargeMode);
  const [planName, setPlanName] = useState(initial.planName);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initial.billingCycle);
  const [allowInstallments, setAllowInstallments] = useState(initial.allowInstallments);
  const [allowedMethods, setAllowedMethods] = useState<PaymentMethod[]>(
    initial.allowedMethods,
  );
  const [amountReais, setAmountReais] = useState(initial.amountReais);
  const [paidAt, setPaidAt] = useState(initial.paidAt);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [notes, setNotes] = useState(initial.notes);
  const [showNotes, setShowNotes] = useState(initial.showNotes);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose]);

  const amountCents = parsePriceInputToCents(amountReais);
  const installmentCents = Math.round(amountCents / 12);
  const hasCardAllowed = allowedMethods.includes("card");
  const relativeDue = useMemo(
    () => (chargeMode === "pending" ? getRelativeDueLabel(dueDate) : null),
    [chargeMode, dueDate],
  );

  const dueDatePresets = useMemo(() => {
    const today = formatLocalDateISO(new Date());
    const plus7 = addDaysLocalISO(7);
    const plus15 = addDaysLocalISO(15);
    const nextMonth = getNextMonthDueDate();
    return [
      { label: "Próx. mês", value: nextMonth },
      { label: "+15 dias", value: plus15 },
      { label: "+7 dias", value: plus7 },
      { label: "Hoje", value: today },
    ];
  }, []);

  const paidAtPresets = useMemo(() => {
    const today = formatLocalDateISO(new Date());
    const yesterday = addDaysLocalISO(-1);
    return [
      { label: "Hoje", value: today },
      { label: "Ontem", value: yesterday },
    ];
  }, []);

  const toggleMethod = (method: PaymentMethod) => {
    setAllowedMethods((prev) => {
      const exists = prev.includes(method);
      const next = exists ? prev.filter((m) => m !== method) : [...prev, method];
      return normalizeSelectedMethods(next);
    });
  };

  const handleCycleChange = (nextCycle: BillingCycle) => {
    setBillingCycle(nextCycle);
    if (nextCycle === "yearly" && !editingInvoice) {
      setAllowInstallments(true);
    }
  };

  const summaryMethodsText = useMemo(() => {
    if (allowedMethods.length === 0) return "Nenhum meio ativo";
    const labels: Record<PaymentMethod, string> = {
      pix: "PIX",
      card: "Cartão",
      manual: "Manual",
    };
    return allowedMethods.map((m) => labels[m]).join(", ");
  }, [allowedMethods]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amountCents || amountCents <= 0) {
      setModalError("Informe um valor válido maior que R$ 0,00.");
      return;
    }
    if (allowedMethods.length === 0) {
      setModalError("Ative pelo menos um meio de pagamento.");
      return;
    }
    const activeDate = chargeMode === "pending" ? dueDate : paidAt;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
      setModalError(
        chargeMode === "pending"
          ? "Informe uma data de vencimento válida."
          : "Informe uma data de pagamento válida.",
      );
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const isEdit = Boolean(editingInvoice);
      const endpoint = isEdit
        ? `/api/admin/financial/invoices/${editingInvoice!.id}`
        : `/api/admin/financial/customers/${customer.rider_id}/manual-payment`;

      const primaryMethod = allowedMethods[0];
      const effectiveInstallments = billingCycle === "yearly" && allowInstallments;

      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: planName.trim() || "Plano Padrão",
          billing_cycle: billingCycle,
          payment_method: primaryMethod,
          allowed_payment_methods: allowedMethods,
          amount_cents: amountCents,
          allow_installments: effectiveInstallments,
          installments: effectiveInstallments ? 12 : 1,
          status: chargeMode,
          paid_at: chargeMode === "paid" ? paidAt : undefined,
          due_date: chargeMode === "pending" ? dueDate : undefined,
          card_brand: isEdit ? editingInvoice?.card_brand || "" : "",
          card_last4: isEdit ? editingInvoice?.card_last4 || "" : "",
          notes: notes.trim(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setModalError(body?.error?.message || body?.message || "Falha ao salvar cobrança.");
        return;
      }
      await onSaved();
      onClose();
    } catch {
      setModalError("Erro de conexão ao salvar cobrança.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="charge-modal-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="charge-modal-title"
                className="font-display text-base font-bold tracking-tight text-foreground"
              >
                {editingInvoice ? "Editar Cobrança" : "Nova Cobrança"}
              </h2>
              <StatusPill status={customer.compliance_status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">{customer.name}</span>
              {customer.email || customer.phone
                ? ` • ${customer.email || customer.phone}`
                : ""}
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs">
            {/* Mode Segmented Control */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setChargeMode("pending")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition cursor-pointer ${
                    chargeMode === "pending"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="size-3.5" />
                  Cobrança em Aberto
                </button>
                <button
                  type="button"
                  onClick={() => setChargeMode("paid")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition cursor-pointer ${
                    chargeMode === "paid"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CheckCircle2 className="size-3.5" />
                  Já Pago
                </button>
              </div>
              <p className="px-0.5 text-[11px] text-muted-foreground">
                {chargeMode === "pending"
                  ? "Cria uma fatura pendente para o cliente pagar pelos meios liberados abaixo."
                  : "Registra um pagamento já recebido e atualiza o próximo ciclo do cliente."}
              </p>
            </div>

            {/* Plan & Amount */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <label className="mb-1.5 block font-semibold text-muted-foreground">
                  Plano / Descrição
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ex: Plano Pro Premium"
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
                  onChange={(e) => setAmountReais(formatPriceInputFromDigits(e.target.value))}
                  placeholder="R$ 0,00"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Billing Cycle Pills */}
            <div>
              <label className="mb-1.5 block font-semibold text-muted-foreground">
                Tipo de Cobrança
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "monthly", label: "Mensal", hint: "Recorrente" },
                    { id: "yearly", label: "Anual", hint: "12 meses" },
                    { id: "one_time", label: "Única", hint: "Avulsa" },
                  ] as const
                ).map((opt) => {
                  const active = billingCycle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleCycleChange(opt.id)}
                      className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background/60 text-muted-foreground hover:border-border/90 hover:text-foreground"
                      }`}
                    >
                      <span className="font-semibold leading-tight">{opt.label}</span>
                      <span className="mt-0.5 text-[10px] opacity-75">{opt.hint}</span>
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
                        Dica: ative o switch de Cartão abaixo para o cliente parcelar em 12x.
                      </p>
                    )}
                  </div>
                </label>
              </div>
            )}

            {/* Payment Methods Switches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-muted-foreground">
                  {chargeMode === "pending"
                    ? "Meios de pagamento permitidos"
                    : "Meios de pagamento aceitos"}
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    allowedMethods.length > 0
                      ? "bg-secondary text-muted-foreground"
                      : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {allowedMethods.length}{" "}
                  {allowedMethods.length === 1 ? "ativo" : "ativos"}
                </span>
              </div>

              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/60">
                {PAYMENT_METHOD_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const enabled = allowedMethods.includes(opt.id);
                  const subtitle =
                    opt.id === "card" && billingCycle === "yearly" && allowInstallments
                      ? `${opt.description} • até 12x`
                      : opt.description;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => toggleMethod(opt.id)}
                      className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition cursor-pointer ${
                        enabled ? "bg-secondary/35" : "hover:bg-secondary/20"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg border transition ${
                            enabled
                              ? "border-primary/40 bg-primary/15 text-primary"
                              : "border-border bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{opt.label}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {subtitle}
                          </div>
                        </div>
                      </div>

                      <span
                        aria-hidden="true"
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                          enabled
                            ? "border-primary bg-primary"
                            : "border-border bg-secondary"
                        }`}
                      >
                        <span
                          className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                            enabled ? "translate-x-4.5" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              {allowedMethods.length === 0 && (
                <p className="text-[11px] font-medium text-rose-400">
                  Ative pelo menos um meio de pagamento para continuar.
                </p>
              )}
            </div>

            {/* Due Date / Paid Date */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                  <Calendar className="size-3.5" />
                  {chargeMode === "pending" ? "Data de Vencimento" : "Data do Pagamento"}
                </label>
                {relativeDue && (
                  <span
                    className={`text-[11px] font-semibold ${
                      relativeDue.isPast ? "text-amber-400" : "text-muted-foreground"
                    }`}
                  >
                    {relativeDue.text}
                  </span>
                )}
              </div>

              <input
                type="date"
                value={chargeMode === "pending" ? dueDate : paidAt}
                onChange={(e) =>
                  chargeMode === "pending"
                    ? setDueDate(e.target.value)
                    : setPaidAt(e.target.value)
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />

              <div className="flex flex-wrap gap-1.5">
                {(chargeMode === "pending" ? dueDatePresets : paidAtPresets).map((preset) => {
                  const current = chargeMode === "pending" ? dueDate : paidAt;
                  const active = current === preset.value;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        chargeMode === "pending"
                          ? setDueDate(preset.value)
                          : setPaidAt(preset.value)
                      }
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                        active
                          ? "border-primary/50 bg-primary/15 text-foreground"
                          : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              {!showNotes ? (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground cursor-pointer"
                >
                  <FileText className="size-3" />
                  + Adicionar observação (opcional)
                </button>
              ) : (
                <div className="space-y-1.5">
                  <label className="block font-semibold text-muted-foreground">
                    Observação (opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Referente à mensalidade de dezembro"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            {modalError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-rose-300">
                <AlertCircle className="size-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
          </div>

          {/* Sticky Footer with Live Summary */}
          <div className="space-y-3 border-t border-border/70 bg-background/40 px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                <strong className="text-foreground">
                  {amountCents > 0 ? amountReais : "R$ 0,00"}
                </strong>
                {billingCycle === "yearly" && allowInstallments && amountCents > 0
                  ? ` (12x ${formatCurrencyCents(installmentCents)})`
                  : ""}
              </span>
              <span className="truncate">
                {chargeMode === "pending"
                  ? `Venc. ${formatShortDateBR(dueDate)}`
                  : `Pago em ${formatShortDateBR(paidAt)}`}{" "}
                • {summaryMethodsText}
              </span>
            </div>

            <div className="flex justify-end gap-2 text-xs">
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
                className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? "Salvando..."
                  : editingInvoice
                    ? "Salvar Alterações"
                    : chargeMode === "pending"
                      ? "Gerar Cobrança"
                      : "Confirmar Pagamento"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
