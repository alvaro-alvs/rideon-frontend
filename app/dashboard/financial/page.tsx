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
  RefreshCw,
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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
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
      (billing?.history ?? []).filter(
        (inv) => inv.status === "pending" || inv.status === "overdue",
      ),
    [billing],
  );

  const activeInvoice: InvoiceItem | undefined = useMemo(() => {
    if (selectedInvoiceId) {
      const matched = billing?.history?.find((inv) => inv.id === selectedInvoiceId);
      if (matched) return matched;
    }
    if (
      billing?.current_invoice &&
      (billing.current_invoice.status === "pending" ||
        billing.current_invoice.status === "overdue")
    ) {
      return billing.current_invoice;
    }
    return openInvoices[0] ?? billing?.current_invoice;
  }, [selectedInvoiceId, billing, openInvoices]);

  const invoiceKey = activeInvoice?.id || "default";
  const activeStatus: InvoiceStatus = activeInvoice?.status ?? billing?.status ?? "pending";
  const isPaid = activeStatus === "paid";
  const activePlanName = activeInvoice?.plan_name ?? billing?.plan_name ?? "Plano Padrão";
  const activeBillingCycle = activeInvoice?.billing_cycle ?? billing?.billing_cycle ?? "monthly";
  const activeAmountCents = activeInvoice?.amount_cents ?? billing?.amount_cents ?? 0;
  const activeAllowInstallments =
    activeInvoice?.allow_installments ?? billing?.allow_installments ?? false;
  const activeInstallments = activeInvoice?.installments ?? billing?.installments ?? 1;
  const activePaymentMethod = activeInvoice?.payment_method ?? billing?.payment_method ?? "card";
  const activeGateway = activeInvoice?.gateway_provider ?? billing?.gateway ?? "abacatepay";
  const activeDueDate = activeInvoice?.due_date ?? billing?.due_date;
  const activeCardBrand = activeInvoice?.card_brand ?? billing?.card_brand;
  const activeCardLast4 = activeInvoice?.card_last4 ?? billing?.card_last4;

  const localPix = pixByInvoice[invoiceKey];
  const activePixQr = localPix?.qrCode || (!isPaid ? activeInvoice?.pix_qr_code : "") || "";
  const activePixCode =
    localPix?.copyPaste || (!isPaid ? activeInvoice?.pix_copy_paste : "") || "";
  const activeCardLink =
    cardLinkByInvoice[invoiceKey] || (!isPaid ? activeInvoice?.checkout_url : "") || "";

  // Poll every 5s and recheck on window focus while waiting for AbacatePay PIX or Card confirmation
  useEffect(() => {
    const waitingPayment = !isPaid && Boolean(activePixCode || activePixQr || activeCardLink);
    if (!waitingPayment) return;

    const checkAndSync = async () => {
      const prevInvoiceId = activeInvoice?.id;
      const fresh = await loadBilling(true);
      if (!fresh) return;
      const targetNowPaid = prevInvoiceId
        ? fresh.history?.some((inv) => inv.id === prevInvoiceId && inv.status === "paid")
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

  // Countdown for PIX expiration (AbacatePay PIX expires in 60 min)
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

  const abacateConfigured = Boolean(billing?.gateways_configured?.abacatepay);
  const pixReady =
    allowedMethods.includes("pix") &&
    (billing?.gateways_configured?.pix ?? abacateConfigured);
  const cardReady =
    allowedMethods.includes("card") &&
    (billing?.gateways_configured?.card ?? abacateConfigured);
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

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
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

        {/* Unified Single Card */}
        <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                <CreditCard className="size-5 text-primary" />
                Financeiro
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Dados da sua fatura atual, pagamento via PIX ou Cartão (AbacatePay) e vencimento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadBilling(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Carregando dados da fatura...
            </div>
          ) : billing ? (
            <>
              {/* Fatura Atual Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {openInvoices.length > 1 ? "Fatura Selecionada" : "Fatura Atual"}
                  </span>
                  <h2 className="mt-0.5 font-display text-xl font-bold text-foreground">
                    {activePlanName}{" "}
                    <span className="font-sans text-xs font-medium text-muted-foreground">
                      • {cycleLabel}
                    </span>
                  </h2>
                </div>
                <InvoiceStatusBadge status={activeStatus} />
              </div>

              {/* Unified Metrics */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="py-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {showMonthlyInstallment ? "Valor mensal (12x)" : "Valor"}
                  </span>
                  {showMonthlyInstallment ? (
                    <>
                      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                        {formatCurrencyCents(monthlyCents)}
                        <span className="font-sans text-xs font-medium text-muted-foreground">/mês</span>
                      </p>
                      <span className="block text-xs text-muted-foreground">
                        Total anual: {formatCurrencyCents(activeAmountCents)}
                      </span>
                    </>
                  ) : (
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                      {formatCurrencyCents(activeAmountCents)}
                    </p>
                  )}

                  {!isPaid && canInstallment12x && (
                    <div className="mt-2.5 inline-flex rounded-lg bg-background p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setUseInstallments(true)}
                        className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                          useInstallments
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        12x no cartão
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseInstallments(false)}
                        className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                          !useInstallments
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        À vista
                      </button>
                    </div>
                  )}
                </div>

                <div className="py-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {isCard && !isOneTime ? "Próximo Vencimento (Cartão)" : "Vencimento"}
                  </span>
                  <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                    <Calendar className="size-4 text-primary" />
                    {formatDate(activeDueDate)}
                  </p>
                  {isCard && isYearly && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Renovação anual prevista para o próximo ano
                    </span>
                  )}
                </div>

                <div className="py-1">
                  <span className="text-xs font-medium text-muted-foreground">Forma de Pagamento</span>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">
                    {isCard
                      ? `Cartão${activeCardBrand ? ` (${activeCardBrand})` : ""}${
                          activeCardLast4 ? ` •••• ${activeCardLast4}` : ""
                        }`
                      : activePaymentMethod === "pix"
                        ? "PIX"
                        : "Manual"}
                  </p>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Gateway:{" "}
                    {activeGateway === "manual" ? "Gerente" : "AbacatePay"}
                  </span>
                </div>
              </div>

              {/* Payment Gateway Actions & Internal PIX QR Code */}
              {isPaid ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-300">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Esta fatura está quitada. Obrigado por manter sua assinatura em dia!</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-xl bg-background/40 p-4">
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
                      O gateway de pagamento online (AbacatePay) ainda não está configurado neste
                      ambiente. Entre em contato com o suporte ou seu gerente.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Escolha pagar via <strong className="text-foreground">PIX</strong> (QR Code
                          instantâneo aqui na tela) ou{" "}
                          <strong className="text-foreground">Cartão</strong> pela{" "}
                          <strong className="text-foreground">AbacatePay</strong>.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {pixReady && (
                            <button
                              type="button"
                              disabled={payingMethod !== null}
                              onClick={() => void handleCheckout("pix")}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            >
                              <QrCode className="size-3.5" />
                              {payingMethod === "pix"
                                ? "Gerando QR Code..."
                                : activePixCode || activePixQr
                                  ? "Gerar novo QR Code PIX"
                                  : "Gerar QR Code PIX"}
                            </button>
                          )}
                          {cardReady && (
                            <button
                              type="button"
                              disabled={payingMethod !== null}
                              onClick={handleCardButtonClick}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            >
                              <CreditCard className="size-3.5" />
                              {payingMethod === "card"
                                ? "Iniciando checkout..."
                                : "Pagar com Cartão"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Internal PIX QR Code Box */}
                      {(activePixQr || activePixCode) && (
                        <div className="rounded-xl border border-emerald-500/30 bg-card/80 p-4 sm:p-5">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                              <QrCode className="size-4" />
                              <span>PIX Instantâneo — QR Code Interno (AbacatePay)</span>
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

                      {/* AbacatePay Card Hosted Checkout Link */}
                      {activeCardLink && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
                          <span>Checkout seguro AbacatePay gerado!</span>
                          <a
                            href={activeCardLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold underline"
                          >
                            Abrir checkout AbacatePay <ExternalLink className="size-3" />
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

              {/* Compact History */}
              <div>
                <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Histórico de Mensalidades
                </h3>
                {billing.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum pagamento registrado até o momento.
                  </p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {billing.history.slice(0, 8).map((inv) => {
                      const isInvInstallment =
                        inv.billing_cycle === "yearly" &&
                        (Boolean(inv.allow_installments) || inv.installments === 12);
                      const installmentCents = isInvInstallment
                        ? Math.round(inv.amount_cents / 12)
                        : inv.amount_cents;
                      const isSelectable =
                        inv.status === "pending" || inv.status === "overdue";
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
                          className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "border border-primary/40 bg-primary/10"
                              : isSelectable
                                ? "hover:bg-background/50 cursor-pointer"
                                : "hover:bg-background/30 cursor-default"
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-foreground">{inv.plan_name}</span>
                            <span className="ml-2 text-muted-foreground">
                              • Venc. {formatDate(inv.due_date)}
                            </span>
                            {isSelected && isSelectable && (
                              <span className="ml-2 text-[10px] font-semibold uppercase text-primary">
                                • Selecionada
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold tabular-nums text-foreground">
                              {isInvInstallment
                                ? `${formatCurrencyCents(installmentCents)}/mês`
                                : formatCurrencyCents(inv.amount_cents)}
                            </span>
                            <InvoiceStatusBadge status={inv.status} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* 3D Credit Card Modal (used when AbacatePay transparent card SDK is configured) */}
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
