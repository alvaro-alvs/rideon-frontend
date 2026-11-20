"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import {
  CreditCard3DForm,
  type CardCheckoutPayload,
} from "@/app/dashboard/financial/components/credit-card-3d-form";
import type {
  CustomerCurrentBillingResponse,
  InvoiceItem,
  InvoiceStatus,
} from "@/lib/types/financial";

type CheckoutResponse = {
  Provider?: string;
  provider?: string;
  ExternalID?: string;
  external_id?: string;
  CheckoutURL?: string;
  checkout_url?: string;
  PixQRCode?: string;
  pix_qr_code?: string;
  PixCopyPaste?: string;
  pix_copy_paste?: string;
  Paid?: boolean;
  paid?: boolean;
};

function formatCurrencyCents(cents?: number) {
  if (!cents) return "R$ 0,00";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function daysDiffFromToday(iso?: string): number | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  let targetMs: number;
  if (match) {
    targetMs = Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
  } else {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    targetMs = Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    );
  }
  const now = new Date();
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetMs - todayMs) / 86_400_000);
}

/**
 * Resolves the effective display status of an invoice.
 * Paid invoices (status === "paid" or paid_at present) ALWAYS remain "paid",
 * even if their original due_date is in the past.
 */
function getEffectiveInvoiceStatus(
  inv: Pick<InvoiceItem, "status" | "due_date" | "paid_at">,
): InvoiceStatus {
  if (inv.status === "paid" || Boolean(inv.paid_at)) {
    return "paid";
  }
  if (inv.status === "cancelled") {
    return "cancelled";
  }
  if (inv.status === "overdue") {
    return "overdue";
  }
  const diff = daysDiffFromToday(inv.due_date);
  if (diff !== null && diff < 0) {
    return "overdue";
  }
  return "pending";
}

function normalizeQrDataUrl(raw?: string) {
  if (!raw) return "";
  return raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
        <CheckCircle2 className="size-3" />
        Paga
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
        <AlertCircle className="size-3" />
        Vencida
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
        Cancelada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
      <Clock className="size-3" />
      Em aberto
    </span>
  );
}

export default function CustomerFinancialPage() {
  const [billing, setBilling] = useState<CustomerCurrentBillingResponse | null>(null);
  const [profileContact, setProfileContact] = useState<{ email: string; phone: string }>({
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [payingMethod, setPayingMethod] = useState<"card" | "pix" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [cardLinkByInvoice, setCardLinkByInvoice] = useState<Record<string, string>>({});
  const [pixByInvoice, setPixByInvoice] = useState<
    Record<string, { qrCode: string; copyPaste: string; expiresAt?: number }>
  >({});
  const [pixNowTs, setPixNowTs] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [useInstallments, setUseInstallments] = useState(true);

  const loadBilling = useCallback(async (isRefresh = false): Promise<CustomerCurrentBillingResponse | null> => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/financial/current", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || body?.message || "Erro ao carregar fatura.");
        return null;
      }
      setBilling(body);
      return body as CustomerCurrentBillingResponse;
    } catch {
      setError("Erro de conexão ao carregar dados financeiros.");
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/financial/current", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setError(body?.error?.message || body?.message || "Erro ao carregar fatura.");
          return;
        }
        setBilling(body);
      })
      .catch(() => {
        if (active) setError("Erro de conexão ao carregar dados financeiros.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetch("/api/profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setProfileContact({
            email: data?.user?.email || "",
            phone: data?.rider?.phone || "",
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const openInvoices = useMemo(
    () =>
      (billing?.history ?? []).filter((inv) => {
        const status = getEffectiveInvoiceStatus(inv);
        return status === "pending" || status === "overdue";
      }),
    [billing],
  );

  const activeInvoice: InvoiceItem | undefined = useMemo(() => {
    if (selectedInvoiceId) {
      const matched = billing?.history?.find((inv) => inv.id === selectedInvoiceId);
      if (matched) return matched;
    }
    if (billing?.current_invoice) {
      const currentEff = getEffectiveInvoiceStatus(billing.current_invoice);
      if (currentEff === "pending" || currentEff === "overdue") {
        return billing.current_invoice;
      }
    }
    return openInvoices[0] ?? billing?.current_invoice;
  }, [selectedInvoiceId, billing, openInvoices]);

  const invoiceKey = activeInvoice?.id || "default";
  const activeStatus: InvoiceStatus = useMemo(() => {
    if (activeInvoice) {
      return getEffectiveInvoiceStatus(activeInvoice);
    }
    if (billing?.status === "paid") {
      return "paid";
    }
    return billing?.status ?? "pending";
  }, [activeInvoice, billing?.status]);

  const isPaid = activeStatus === "paid";
  const isOverdueUnpaid = !isPaid && activeStatus === "overdue";
  const activePlanName = activeInvoice?.plan_name ?? billing?.plan_name ?? "Plano Padrão";
  const activeBillingCycle = activeInvoice?.billing_cycle ?? billing?.billing_cycle ?? "monthly";
  const activeAmountCents = activeInvoice?.amount_cents ?? billing?.amount_cents ?? 0;
  const activeAllowInstallments =
    activeInvoice?.allow_installments ?? billing?.allow_installments ?? false;
  const activeInstallments = activeInvoice?.installments ?? billing?.installments ?? 1;
  const activePaymentMethod = activeInvoice?.payment_method ?? billing?.payment_method ?? "card";
  const activeGateway = activeInvoice?.gateway_provider ?? billing?.gateway ?? "abacatepay";
  const activeDueDate = activeInvoice?.due_date ?? billing?.due_date;
  const activePaidAt = activeInvoice?.paid_at ?? billing?.last_paid_at;
  const activeCardBrand = activeInvoice?.card_brand ?? billing?.card_brand;
  const activeCardLast4 = activeInvoice?.card_last4 ?? billing?.card_last4;

  const localPix = pixByInvoice[invoiceKey];
  const activePixQr = localPix?.qrCode || (!isPaid ? activeInvoice?.pix_qr_code : "") || "";
  const activePixCode =
    localPix?.copyPaste || (!isPaid ? activeInvoice?.pix_copy_paste : "") || "";
  const activeCardLink =
    cardLinkByInvoice[invoiceKey] || (!isPaid ? activeInvoice?.checkout_url : "") || "";

  // Poll every 5s and recheck on window focus while waiting for PIX or Card confirmation
  useEffect(() => {
    const waitingPayment = !isPaid && Boolean(activePixCode || activePixQr || activeCardLink);
    if (!waitingPayment) return;

    const checkAndSync = async () => {
      const prevInvoiceId = activeInvoice?.id;
      const fresh = await loadBilling(true);
      if (!fresh) return;
      const targetNowPaid = prevInvoiceId
        ? fresh.history?.some(
            (inv) =>
              inv.id === prevInvoiceId &&
              (inv.status === "paid" || Boolean(inv.paid_at)),
          )
        : fresh.status === "paid";
      if (targetNowPaid) {
        setPixByInvoice((prev) => {
          const next = { ...prev };
          delete next[invoiceKey];
          return next;
        });
        setCardLinkByInvoice((prev) => {
          const next = { ...prev };
          delete next[invoiceKey];
          return next;
        });
        setPaymentConfirmed(true);
      }
    };

    const timer = setInterval(() => {
      void checkAndSync();
    }, 5000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void checkAndSync();
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [isPaid, activePixCode, activePixQr, activeCardLink, activeInvoice?.id, invoiceKey, loadBilling]);

  // Countdown for PIX expiration (60 min)
  const expiresAt = localPix?.expiresAt;
  const shouldTickPix = Boolean(expiresAt && (activePixCode || activePixQr) && !isPaid);

  useEffect(() => {
    if (!shouldTickPix) return;
    const timer = setInterval(() => {
      setPixNowTs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [shouldTickPix]);

  const pixRemainingSec =
    shouldTickPix && expiresAt
      ? Math.max(0, Math.floor((expiresAt - pixNowTs) / 1000))
      : null;

  const handleCheckout = async (
    method: "card" | "pix",
    opts?: { card?: CardCheckoutPayload; installments?: number },
  ) => {
    setPayingMethod(method);
    setCheckoutError("");
    const targetKey = invoiceKey;
    try {
      const res = await fetch("/api/financial/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: activeInvoice?.id || undefined,
          payment_method: method,
          card_token: opts?.card?.cardToken || "",
          customer_document: opts?.card?.customerDocument || "",
          customer_phone: opts?.card?.customerPhone || "",
          card_brand: opts?.card?.cardBrand || "",
          card_last4: opts?.card?.cardLast4 || "",
          installments: opts?.installments || 1,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | (CheckoutResponse & { error?: { message?: string }; message?: string })
        | null;
      if (!res.ok) {
        setCheckoutError(
          body?.error?.message || body?.message || "Não foi possível iniciar o pagamento.",
        );
        return;
      }

      const paidNow = Boolean(body?.Paid || body?.paid);
      const checkoutUrl = body?.CheckoutURL || body?.checkout_url || "";
      const qrCode = body?.PixQRCode || body?.pix_qr_code || "";
      const copyPaste = body?.PixCopyPaste || body?.pix_copy_paste || "";

      if (paidNow) {
        setPaymentConfirmed(true);
      } else if (method === "card" && checkoutUrl) {
        setCardLinkByInvoice((prev) => ({ ...prev, [targetKey]: checkoutUrl }));
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      } else if (method === "pix" && (qrCode || copyPaste)) {
        const nowTs = Date.now();
        setPixNowTs(nowTs);
        setPixByInvoice((prev) => ({
          ...prev,
          [targetKey]: {
            qrCode,
            copyPaste,
            expiresAt: nowTs + 3600 * 1000,
          },
        }));
      }
      await loadBilling(true);
    } catch {
      setCheckoutError("Erro de conexão ao iniciar pagamento.");
    } finally {
      setPayingMethod(null);
    }
  };

  const handleCopyPix = async () => {
    if (!activePixCode) return;
    await navigator.clipboard.writeText(activePixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCard = activePaymentMethod === "card";
  const isYearly = activeBillingCycle === "yearly";
  const isOneTime = activeBillingCycle === "one_time";
  const canInstallment12x = isYearly && Boolean(activeAllowInstallments);
  const showMonthlyInstallment =
    isYearly && ((canInstallment12x && useInstallments) || activeInstallments === 12);
  const monthlyCents = activeAmountCents ? Math.round(activeAmountCents / 12) : 0;
  const cycleLabel = isYearly ? "Anual" : isOneTime ? "Cobrança única" : "Mensal";

  const allowedMethods = useMemo(() => {
    if (activeInvoice?.allowed_payment_methods?.length) {
      return activeInvoice.allowed_payment_methods;
    }
    if (billing?.allowed_payment_methods?.length) {
      return billing.allowed_payment_methods;
    }
    if (activePaymentMethod === "manual") return ["manual"];
    return ["pix", "card"];
  }, [activeInvoice?.allowed_payment_methods, billing?.allowed_payment_methods, activePaymentMethod]);

  const onlineConfigured = Boolean(billing?.gateways_configured?.abacatepay);
  const pixReady =
    allowedMethods.includes("pix") &&
    (billing?.gateways_configured?.pix ?? onlineConfigured);
  const cardReady =
    allowedMethods.includes("card") &&
    (billing?.gateways_configured?.card ?? onlineConfigured);
  const manualOnly = allowedMethods.length === 1 && allowedMethods[0] === "manual";
  const canPayAmount = activeAmountCents > 0;
  const transparentCardEnabled = Boolean(
    billing?.card_sdk?.enabled && billing?.card_sdk?.public_key,
  );

  const handleCardButtonClick = () => {
    if (transparentCardEnabled) {
      setShowCardModal(true);
      return;
    }
    void handleCheckout("card", {
      installments: showMonthlyInstallment ? 12 : 1,
    });
  };

  const dueHint = useMemo(() => {
    if (isPaid) {
      return { text: "Fatura quitada", tone: "emerald" as const };
    }
    const diff = daysDiffFromToday(activeDueDate);
    if (diff === null) return null;
    if (diff < 0) {
      const abs = Math.abs(diff);
      return {
        text: abs === 1 ? "Venceu ontem" : `Venceu há ${abs} dias`,
        tone: "rose" as const,
      };
    }
    if (diff === 0) return { text: "Vence hoje", tone: "amber" as const };
    if (diff === 1) return { text: "Vence amanhã", tone: "amber" as const };
    if (diff <= 7) return { text: `Vence em ${diff} dias`, tone: "amber" as const };
    return { text: `Em ${diff} dias`, tone: "muted" as const };
  }, [isPaid, activeDueDate]);

  const historyList = billing?.history ?? [];
  const noBillingConfigured =
    billing &&
    !billing.has_profile &&
    historyList.length === 0 &&
    activeAmountCents <= 0;

  return (
    <DashboardShell>
      <div className="w-full space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Financeiro
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Gerencie sua assinatura, acompanhe vencimentos e pague via PIX ou Cartão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {billing && !noBillingConfigured && (
              <InvoiceStatusBadge status={activeStatus} />
            )}
            <button
              type="button"
              onClick={() => loadBilling(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {paymentConfirmed && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            <span className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4" />
              Pagamento confirmado! Sua fatura foi atualizada.
            </span>
            <button
              type="button"
              onClick={() => setPaymentConfirmed(false)}
              className="text-emerald-300/80 hover:text-emerald-200 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border/70 bg-card p-12 text-center text-sm text-muted-foreground">
            Carregando dados financeiros...
          </div>
        ) : noBillingConfigured ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-6 py-14 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-muted-foreground">
              <Receipt className="size-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">
              Nenhuma cobrança ativa
            </h2>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Quando um plano ou fatura for lançado para sua conta, o resumo e as opções de
              pagamento aparecerão aqui.
            </p>
          </div>
        ) : billing ? (
          <>
            {/* Multiple Open Invoices Selector */}
            {openInvoices.length > 1 && (
              <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selecione a fatura para pagar
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                    {openInvoices.length} faturas em aberto
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {openInvoices.map((inv) => {
                    const effStatus = getEffectiveInvoiceStatus(inv);
                    const isSelected = activeInvoice?.id === inv.id;
                    return (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => {
                          setSelectedInvoiceId(inv.id);
                          setCheckoutError("");
                        }}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/70 bg-background/50 hover:border-border hover:bg-background/80"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-foreground">
                            {inv.plan_name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            Venc. {formatDate(inv.due_date)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                            {formatCurrencyCents(inv.amount_cents)}
                          </span>
                          <InvoiceStatusBadge status={effStatus} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main 2-Column Layout */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
              {/* Left Column: Current Invoice & Payment */}
              <div
                className={`lg:col-span-7 rounded-2xl border bg-card p-5 sm:p-6 space-y-5 ${
                  isPaid
                    ? "border-emerald-500/25"
                    : isOverdueUnpaid
                      ? "border-rose-500/30"
                      : "border-border/70"
                }`}
              >
                {/* Plan Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {openInvoices.length > 1 ? "Fatura Selecionada" : "Fatura Atual"} • {cycleLabel}
                    </span>
                    <h2 className="mt-0.5 font-display text-xl font-bold text-foreground sm:text-2xl">
                      {activePlanName}
                    </h2>
                  </div>
                  <InvoiceStatusBadge status={activeStatus} />
                </div>

                {/* Hero Amount Box */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/50 p-4 sm:p-5">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {showMonthlyInstallment ? "Valor mensal (12x)" : "Valor da fatura"}
                    </span>
                    {showMonthlyInstallment ? (
                      <>
                        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                          {formatCurrencyCents(monthlyCents)}
                          <span className="font-sans text-sm font-medium text-muted-foreground">/mês</span>
                        </p>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Total anual: {formatCurrencyCents(activeAmountCents)}
                        </span>
                      </>
                    ) : (
                      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                        {formatCurrencyCents(activeAmountCents)}
                      </p>
                    )}
                  </div>

                  {!isPaid && canInstallment12x && (
                    <div className="inline-flex rounded-xl border border-border/70 bg-card p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setUseInstallments(true)}
                        className={`rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                          useInstallments
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        12x no cartão
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseInstallments(false)}
                        className={`rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                          !useInstallments
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        À vista
                      </button>
                    </div>
                  )}
                </div>

                {/* Metadata Tiles */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {isPaid
                        ? "Vencimento"
                        : isCard && !isOneTime
                          ? "Próximo Vencimento"
                          : "Vencimento"}
                    </span>
                    <p className="mt-1.5 flex items-center gap-2 font-display text-base font-bold text-foreground">
                      <Calendar className="size-4 text-primary" />
                      {formatDate(activeDueDate)}
                    </p>
                    {dueHint && (
                      <span
                        className={`mt-1 block text-[11px] font-medium ${
                          dueHint.tone === "emerald"
                            ? "text-emerald-400"
                            : dueHint.tone === "rose"
                              ? "text-rose-400"
                              : dueHint.tone === "amber"
                                ? "text-amber-400"
                                : "text-muted-foreground"
                        }`}
                      >
                        {dueHint.text}
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/40 p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Forma de Pagamento
                    </span>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">
                      {isCard
                        ? `Cartão${activeCardBrand ? ` (${activeCardBrand})` : ""}${
                            activeCardLast4 ? ` •••• ${activeCardLast4}` : ""
                          }`
                        : activePaymentMethod === "pix"
                          ? "PIX"
                          : "Acerto Manual"}
                    </p>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {activeGateway === "manual" || activePaymentMethod === "manual"
                        ? "Acerto direto com o gestor"
                        : "Pagamento digital seguro"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/40 p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {activePaidAt ? "Último Pagamento" : "Situação"}
                    </span>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">
                      {activePaidAt
                        ? formatDate(activePaidAt)
                        : isPaid
                          ? "Quitada"
                          : isOverdueUnpaid
                            ? "Pendente em atraso"
                            : "Aguardando pagamento"}
                    </p>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {isPaid
                        ? "Assinatura regularizada"
                        : isCard && isYearly
                          ? "Renovação anual"
                          : "Confirmação automática"}
                    </span>
                  </div>
                </div>

                {/* Payment Actions or Paid Confirmation */}
                {isPaid ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    <span>
                      Esta fatura está quitada. Obrigado por manter sua assinatura em dia!
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/40 p-4 sm:p-5">
                    {manualOnly ? (
                      <p className="text-xs text-muted-foreground">
                        Esta cobrança está configurada para acerto manual. Caso já tenha pago,
                        solicite a baixa ao seu gerente.
                      </p>
                    ) : !canPayAmount ? (
                      <p className="text-xs text-muted-foreground">
                        Aguardando definição do valor da cobrança pelo gerente.
                      </p>
                    ) : !pixReady && !cardReady ? (
                      <p className="text-xs text-muted-foreground">
                        O pagamento online está temporariamente indisponível. Entre em contato com o
                        suporte ou seu gerente.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                              Opções de Pagamento
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Escolha pagar instantaneamente via{" "}
                              <strong className="text-foreground">PIX</strong> ou com{" "}
                              <strong className="text-foreground">Cartão de Crédito</strong>.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pixReady && (
                              <button
                                type="button"
                                disabled={payingMethod !== null}
                                onClick={() => void handleCheckout("pix")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                              >
                                <QrCode className="size-3.5" />
                                {payingMethod === "pix"
                                  ? "Gerando QR Code..."
                                  : activePixCode || activePixQr
                                    ? "Gerar novo QR Code PIX"
                                    : "Pagar com PIX"}
                              </button>
                            )}
                            {cardReady && (
                              <button
                                type="button"
                                disabled={payingMethod !== null}
                                onClick={handleCardButtonClick}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                              >
                                <CreditCard className="size-3.5" />
                                {payingMethod === "card"
                                  ? "Iniciando pagamento..."
                                  : "Pagar com Cartão"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* PIX QR Code Box */}
                        {(activePixQr || activePixCode) && (
                          <div className="rounded-xl border border-emerald-500/30 bg-card/90 p-4 sm:p-5">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                                <QrCode className="size-4" />
                                <span>PIX Instantâneo — QR Code</span>
                              </div>
                              {pixRemainingSec !== null && (
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {pixRemainingSec > 0
                                    ? `Expira em ${Math.floor(pixRemainingSec / 60)}m ${String(
                                        pixRemainingSec % 60,
                                      ).padStart(2, "0")}s`
                                    : "Código expirado — gere um novo acima"}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                              {activePixQr && (
                                <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
                                  <img
                                    src={normalizeQrDataUrl(activePixQr)}
                                    alt="QR Code PIX"
                                    className="size-44 object-contain"
                                  />
                                </div>
                              )}

                              <div className="flex w-full flex-1 flex-col gap-2.5">
                                {activePixCode && (
                                  <>
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      PIX Copia e Cola
                                    </label>
                                    <textarea
                                      readOnly
                                      rows={3}
                                      value={activePixCode}
                                      className="w-full rounded-xl border border-border bg-background p-2.5 font-mono text-[11px] text-foreground focus:outline-none"
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={handleCopyPix}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 cursor-pointer"
                                      >
                                        {copied ? (
                                          <Check className="size-3.5" />
                                        ) : (
                                          <Copy className="size-3.5" />
                                        )}
                                        {copied ? "Código copiado!" : "Copiar código PIX"}
                                      </button>
                                    </div>
                                  </>
                                )}
                                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <RefreshCw className="size-3 animate-spin" />
                                  Aguardando confirmação automática após o pagamento no seu banco...
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Card Hosted Checkout Link */}
                        {activeCardLink && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
                            <span className="flex items-center gap-2 font-medium">
                              <ShieldCheck className="size-4 shrink-0" />
                              Página de pagamento segura gerada!
                            </span>
                            <a
                              href={activeCardLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold underline"
                            >
                              Abrir página de pagamento <ExternalLink className="size-3" />
                            </a>
                          </div>
                        )}
                      </>
                    )}

                    {checkoutError && (
                      <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                        {checkoutError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Invoice History */}
              <div className="lg:col-span-5 rounded-2xl border border-border/70 bg-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Histórico de Faturas
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {openInvoices.length > 0
                        ? "Clique em uma fatura em aberto para pagar."
                        : "Acompanhe seus lançamentos e quitações."}
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {historyList.length}{" "}
                    {historyList.length === 1 ? "fatura" : "faturas"}
                  </span>
                </div>

                {historyList.length === 0 ? (
                  <div className="rounded-xl border border-border/50 bg-background/40 p-6 text-center text-xs text-muted-foreground">
                    Nenhum pagamento registrado até o momento.
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {historyList.slice(0, 10).map((inv) => {
                      const effStatus = getEffectiveInvoiceStatus(inv);
                      const isInvPaid = effStatus === "paid";
                      const isInvOverdueUnpaid = !isInvPaid && effStatus === "overdue";
                      const isInvInstallment =
                        inv.billing_cycle === "yearly" &&
                        (Boolean(inv.allow_installments) || inv.installments === 12);
                      const installmentCents = isInvInstallment
                        ? Math.round(inv.amount_cents / 12)
                        : inv.amount_cents;
                      const isSelectable =
                        !isInvPaid && (effStatus === "pending" || effStatus === "overdue");
                      const isSelected = activeInvoice?.id === inv.id;

                      return (
                        <button
                          key={inv.id}
                          type="button"
                          disabled={!isSelectable}
                          onClick={() => {
                            if (isSelectable) {
                              setSelectedInvoiceId(inv.id);
                              setCheckoutError("");
                            }
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                            isSelected && isSelectable
                              ? "border-primary/50 bg-primary/10"
                              : isInvOverdueUnpaid
                                ? "border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer"
                                : isSelectable
                                  ? "border-border/60 bg-background/40 hover:border-border hover:bg-background/70 cursor-pointer"
                                  : "border-border/50 bg-background/30 cursor-default"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate font-semibold text-foreground">
                                {inv.plan_name}
                              </span>
                              {isSelected && isSelectable && (
                                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                  Selecionada
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              {isInvPaid && inv.paid_at
                                ? `Pago em ${formatDate(inv.paid_at)} • Venc. ${formatDate(inv.due_date)}`
                                : `Venc. ${formatDate(inv.due_date)}`}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="font-mono font-semibold tabular-nums text-foreground">
                              {isInvInstallment
                                ? `${formatCurrencyCents(installmentCents)}/mês`
                                : formatCurrencyCents(inv.amount_cents)}
                            </span>
                            <InvoiceStatusBadge status={effStatus} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* 3D Credit Card Modal */}
      {showCardModal && billing && (
        <CreditCard3DForm
          amountCents={activeAmountCents}
          amountLabel={
            showMonthlyInstallment
              ? `12x de ${formatCurrencyCents(monthlyCents)}`
              : formatCurrencyCents(activeAmountCents)
          }
          planLabel={`${activePlanName} (${cycleLabel})`}
          sdkConfig={billing.card_sdk}
          defaultEmail={profileContact.email}
          defaultPhone={profileContact.phone}
          submitting={payingMethod === "card"}
          onClose={() => setShowCardModal(false)}
          onProceedToCheckout={async (card) => {
            await handleCheckout("card", {
              card,
              installments: showMonthlyInstallment ? 12 : 1,
            });
            setShowCardModal(false);
          }}
          onFallbackHostedCheckout={async () => {
            setShowCardModal(false);
            await handleCheckout("card", {
              installments: showMonthlyInstallment ? 12 : 1,
            });
          }}
        />
      )}
    </DashboardShell>
  );
}
