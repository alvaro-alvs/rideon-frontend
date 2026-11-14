"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";
import type {
  BillingCycle,
  ComplianceStatus,
  CustomerBillingSummary,
  InvoiceItem,
  ManagerCustomersBillingResponse,
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

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  if (status === "compliant") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
        <CheckCircle2 className="size-3" />
        Adimplente
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
        <AlertCircle className="size-3" />
        Inadimplente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
      <Clock className="size-3" />
      Pendente
    </span>
  );
}

export default function AdminFinancialPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [data, setData] = useState<ManagerCustomersBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ComplianceStatus>("all");

  // Create / Edit charge modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBillingSummary | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);
  const [chargeMode, setChargeMode] = useState<"paid" | "pending">("pending");
  const [planName, setPlanName] = useState("Plano Padrão");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [allowInstallments, setAllowInstallments] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [amountReais, setAmountReais] = useState("R$ 99,90");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cardBrand, setCardBrand] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Customer charges list modal (Edit / Delete)
  const [chargesCustomer, setChargesCustomer] = useState<CustomerBillingSummary | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<InvoiceItem[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

  const userRole =
    currentUser.status === "authenticated" ? currentUser.user.role : undefined;

  useEffect(() => {
    if (
      currentUser.status === "authenticated" &&
      !isPlatformOrTenantAdmin(userRole)
    ) {
      router.replace("/dashboard/financial");
    }
  }, [currentUser.status, userRole, router]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/financial/customers", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || body?.message || "Erro ao carregar financeiro.");
        return;
      }
      setData(body);
    } catch {
      setError("Erro de conexão ao carregar dados financeiros.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (
      currentUser.status === "authenticated" &&
      isPlatformOrTenantAdmin(userRole)
    ) {
      loadData();
    }
  }, [currentUser.status, userRole, loadData]);

  const filteredCustomers = useMemo(() => {
    const list = data?.customers ?? [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((c) => {
      if (statusFilter !== "all" && c.compliance_status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery, statusFilter]);

  const openPaymentModal = (c: CustomerBillingSummary) => {
    setEditingInvoice(null);
    setSelectedCustomer(c);
    setChargeMode("pending");
    setPlanName(c.plan_name || "Plano Padrão");
    setBillingCycle(c.billing_cycle || "monthly");
    setAllowInstallments(c.allow_installments ?? true);
    setPaymentMethod(c.payment_method || "card");
    setAmountReais(formatCurrencyCents(c.amount_cents || 9990));
    const today = new Date().toISOString().slice(0, 10);
    setPaidAt(today);
    setDueDate(today);
    setCardBrand("");
    setCardLast4("");
    setModalError("");
  };

  const openEditInvoiceModal = (c: CustomerBillingSummary, inv: InvoiceItem) => {
    setEditingInvoice(inv);
    setSelectedCustomer(c);
    setChargeMode(inv.status === "paid" ? "paid" : "pending");
    setPlanName(inv.plan_name || "Plano Padrão");
    setBillingCycle(inv.billing_cycle || "monthly");
    setAllowInstallments(inv.allow_installments ?? true);
    setPaymentMethod(inv.payment_method || "card");
    setAmountReais(formatCurrencyCents(inv.amount_cents || 9990));
    const today = new Date().toISOString().slice(0, 10);
    setPaidAt(inv.paid_at ? inv.paid_at.slice(0, 10) : today);
    setDueDate(inv.due_date ? inv.due_date.slice(0, 10) : today);
    setCardBrand(inv.card_brand || "");
    setCardLast4(inv.card_last4 || "");
    setModalError("");
  };

  const openChargesModal = async (c: CustomerBillingSummary) => {
    setChargesCustomer(c);
    setLoadingInvoices(true);
    try {
      const res = await fetch(
        `/api/admin/financial/customers/${c.rider_id}/invoices`,
        { cache: "no-store" },
      );
      const body = await res.json().catch(() => null);
      setCustomerInvoices(Array.isArray(body?.invoices) ? body.invoices : []);
    } catch {
      setCustomerInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!chargesCustomer) return;
    setDeletingInvoiceId(invoiceId);
    try {
      const res = await fetch(`/api/admin/financial/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCustomerInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
        await loadData(true);
      }
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amountCents = parsePriceInputToCents(amountReais);
    if (!amountCents || amountCents <= 0) {
      setModalError("Informe um valor válido maior que zero.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const isEdit = Boolean(editingInvoice);
      const endpoint = isEdit
        ? `/api/admin/financial/invoices/${editingInvoice!.id}`
        : `/api/admin/financial/customers/${selectedCustomer.rider_id}/manual-payment`;
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: planName.trim() || "Plano Padrão",
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          amount_cents: amountCents,
          allow_installments: billingCycle === "yearly" ? allowInstallments : false,
          installments: billingCycle === "yearly" && allowInstallments ? 12 : 1,
          status: chargeMode,
          paid_at: chargeMode === "paid" ? paidAt : undefined,
          due_date: chargeMode === "pending" ? dueDate : undefined,
          card_brand: paymentMethod === "card" ? cardBrand.trim() : "",
          card_last4: paymentMethod === "card" ? cardLast4.trim() : "",
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setModalError(body?.error?.message || body?.message || "Falha ao salvar cobrança.");
        return;
      }
      setSelectedCustomer(null);
      setEditingInvoice(null);
      if (chargesCustomer) {
        await openChargesModal(chargesCustomer);
      }
      await loadData(true);
    } catch {
      setModalError("Erro de conexão ao salvar cobrança.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <CreditCard className="size-5 text-primary" />
              Financeiro
            </h1>
            <p className="text-xs text-muted-foreground">
              Situação cadastral, adimplência e última mensalidade dos clientes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total de Clientes</span>
              <Users className="size-4 text-primary" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-foreground">{data?.total ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Adimplentes</span>
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-emerald-400">{data?.compliant ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Inadimplentes</span>
              <AlertCircle className="size-4 text-rose-400" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-rose-400">{data?.overdue ?? 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nome ou e-mail..."
              className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "all", label: "Todos" },
                { id: "compliant", label: "Adimplentes" },
                { id: "overdue", label: "Inadimplentes" },
                { id: "pending", label: "Pendentes" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === opt.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/70 bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Situação Cadastral</th>
                  <th className="px-4 py-3">Adimplência</th>
                  <th className="px-4 py-3">Última Mensalidade</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Carregando clientes...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isActive = c.registration_status === "active";
                    return (
                      <tr key={c.rider_id} className="transition hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {c.email || c.phone || "Sem contato"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              isActive
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border border-border bg-secondary text-muted-foreground"
                            }`}
                          >
                            {isActive ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ComplianceBadge status={c.compliance_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {formatDate(c.last_paid_at)}
                          </div>
                          {c.last_paid_amount_cents ? (
                            <div className="text-[11px] text-muted-foreground">
                              {formatCurrencyCents(c.last_paid_amount_cents)} •{" "}
                              {c.billing_cycle === "yearly"
                                ? c.allow_installments
                                  ? "Anual (12x)"
                                  : "Anual"
                                : c.billing_cycle === "one_time"
                                  ? "Única"
                                  : "Mensal"}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openChargesModal(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            >
                              <FileText className="size-3" />
                              Cobranças
                            </button>
                            <button
                              type="button"
                              onClick={() => openPaymentModal(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                            >
                              <Plus className="size-3" />
                              Nova cobrança
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Payment Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {editingInvoice ? "Editar Cobrança" : "Cobrança do Cliente"}
                </h2>
                <p className="text-xs text-muted-foreground">{selectedCustomer.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setChargeMode("pending")}
                  className={`rounded-lg py-1.5 font-semibold transition ${
                    chargeMode === "pending"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cobrança em Aberto
                </button>
                <button
                  type="button"
                  onClick={() => setChargeMode("paid")}
                  className={`rounded-lg py-1.5 font-semibold transition ${
                    chargeMode === "paid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Já Pago
                </button>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-muted-foreground">Plano</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">
                    Tipo de Cobrança
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="monthly">Mensalidade</option>
                    <option value="yearly">Anual</option>
                    <option value="one_time">Cobrança Única</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="card">Cartão (InfinitePay)</option>
                    <option value="pix">PIX (Mercado Pago)</option>
                    <option value="manual">Manual / Dinheiro</option>
                  </select>
                </div>
              </div>

              {billingCycle === "yearly" && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-secondary/20 p-3">
                  <label className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={allowInstallments}
                      onChange={(e) => setAllowInstallments(e.target.checked)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    Permitir parcelamento em 12x para o cliente
                  </label>
                  {allowInstallments && (
                    <span className="text-[11px] text-muted-foreground">
                      Cliente verá{" "}
                      <strong className="text-foreground">
                        12x de {formatCurrencyCents(Math.round(parsePriceInputToCents(amountReais) / 12))}/mês
                      </strong>{" "}
                      (Total anual: {amountReais})
                    </span>
                  )}
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-muted-foreground">
                      Bandeira (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Visa, Mastercard..."
                      value={cardBrand}
                      onChange={(e) => setCardBrand(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-muted-foreground">
                      Final do cartão
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="4242"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountReais}
                    onChange={(e) => setAmountReais(formatPriceInputFromDigits(e.target.value))}
                    placeholder="R$ 0,00"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">
                    {chargeMode === "pending" ? "Data de Vencimento" : "Data do Pagamento"}
                  </label>
                  <input
                    type="date"
                    value={chargeMode === "pending" ? dueDate : paidAt}
                    onChange={(e) =>
                      chargeMode === "pending"
                        ? setDueDate(e.target.value)
                        : setPaidAt(e.target.value)
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {modalError && (
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-rose-400">{modalError}</p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-xl border border-border px-3.5 py-2 font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
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
            </form>
          </div>
        </div>
      )}

      {/* Customer Charges List Modal (Edit / Delete) */}
      {chargesCustomer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Cobranças — {chargesCustomer.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Edite ou exclua cobranças já criadas para este cliente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChargesCustomer(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {loadingInvoices ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Carregando cobranças...
              </p>
            ) : customerInvoices.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nenhuma cobrança criada para este cliente.
              </p>
            ) : (
              <div className="max-h-80 divide-y divide-border/50 overflow-y-auto text-xs">
                {customerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {inv.plan_name} • {formatCurrencyCents(inv.amount_cents)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {inv.status === "paid" ? "Pago em " : "Vencimento "}
                        {formatDate(inv.status === "paid" ? inv.paid_at : inv.due_date)} •{" "}
                        {inv.billing_cycle === "yearly"
                          ? inv.allow_installments
                            ? "Anual (12x)"
                            : "Anual"
                          : inv.billing_cycle === "one_time"
                            ? "Única"
                            : "Mensal"} •{" "}
                        {inv.status === "paid"
                          ? "Paga"
                          : inv.status === "overdue"
                            ? "Vencida"
                            : "Em aberto"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditInvoiceModal(chargesCustomer, inv)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-secondary"
                      >
                        <Pencil className="size-3" />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={deletingInvoiceId === inv.id}
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <Trash2 className="size-3" />
                        {deletingInvoiceId === inv.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
