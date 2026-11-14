"use client";

import { useCallback, useEffect, useState } from "react";
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
import { CreditCard3DForm } from "@/app/dashboard/financial/components/credit-card-3d-form";
import type {
  CustomerCurrentBillingResponse,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [payingMethod, setPayingMethod] = useState<"card" | "pix" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [cardLink, setCardLink] = useState("");
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [useInstallments, setUseInstallments] = useState(true);

  const loadBilling = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/financial/current", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || body?.message || "Erro ao carregar fatura.");
        return;
      }
      setBilling(body);
    } catch {
      setError("Erro de conexão ao carregar dados financeiros.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  // Poll every 5s while waiting for PIX or InfinitePay card payment confirmation
  useEffect(() => {
    const waitingPayment = Boolean(pixData || cardLink);
    if (!waitingPayment) return;
    if (billing?.status === "paid") {
      setPixData(null);
      setCardLink("");
      setPaymentConfirmed(true);
      return;
    }

    const timer = setInterval(() => {
      loadBilling(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [pixData, cardLink, billing?.status, loadBilling]);

  const handleCheckout = async (
    method: "card" | "pix",
    opts?: { cardToken?: string; installments?: number },
  ) => {
    setPayingMethod(method);
    setCheckoutError("");
    setCardLink("");
    try {
      const res = await fetch("/api/financial/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: method,
          card_token: opts?.cardToken || "",
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
        setCardLink(checkoutUrl);
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      } else if (method === "pix" && (qrCode || copyPaste)) {
        setPixData({ qrCode, copyPaste });
      }
      await loadBilling(true);
    } catch {
      setCheckoutError("Erro de conexão ao iniciar pagamento.");
    } finally {
      setPayingMethod(null);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.copyPaste) return;
    await navigator.clipboard.writeText(pixData.copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCard = billing?.payment_method === "card";
  const isYearly = billing?.billing_cycle === "yearly";
  const isOneTime = billing?.billing_cycle === "one_time";
  const canInstallment12x = isYearly && Boolean(billing?.allow_installments);
  const showMonthlyInstallment =
    isYearly && ((canInstallment12x && useInstallments) || billing?.installments === 12);
  const monthlyCents = billing?.amount_cents
    ? Math.round(billing.amount_cents / 12)
    : 0;
  const cycleLabel = isYearly ? "Anual" : isOneTime ? "Cobrança única" : "Mensal";
  const picpayReady = Boolean(billing?.gateways_configured?.picpay);
  const mercadoPagoReady = Boolean(billing?.gateways_configured?.mercadopago);
  const canPayAmount = (billing?.amount_cents ?? 0) > 0;

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <CreditCard className="size-5 text-primary" />
              Financeiro
            </h1>
            <p className="text-xs text-muted-foreground">
              Dados da sua fatura atual, forma de pagamento e vencimento.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadBilling(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
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
              className="text-emerald-300/80 hover:text-emerald-200"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-xs text-muted-foreground">
            Carregando dados da fatura...
          </div>
        ) : billing ? (
          <>
            {/* Fatura Atual Card */}
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fatura Atual
                  </span>
                  <h2 className="mt-0.5 text-lg font-bold text-foreground">
                    {billing.plan_name}{" "}
                    <span className="text-xs font-medium text-muted-foreground">
                      • {cycleLabel}
                    </span>
                  </h2>
                </div>
                <InvoiceStatusBadge status={billing.status} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-[11px] text-muted-foreground">
                    {showMonthlyInstallment ? "Valor mensal (12x)" : "Valor"}
                  </span>
                  {showMonthlyInstallment ? (
                    <>
                      <p className="mt-0.5 text-xl font-bold text-foreground">
                        {formatCurrencyCents(monthlyCents)}
                        <span className="text-xs font-medium text-muted-foreground">/mês</span>
                      </p>
                      <span className="block text-[10px] text-muted-foreground/80">
                        Total anual: {formatCurrencyCents(billing.amount_cents)}
                      </span>
                    </>
                  ) : (
                    <p className="mt-0.5 text-xl font-bold text-foreground">
                      {formatCurrencyCents(billing.amount_cents)}
                    </p>
                  )}

                  {canInstallment12x && (
                    <div className="mt-2 inline-flex rounded-lg border border-border bg-background p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setUseInstallments(true)}
                        className={`rounded-md px-2 py-0.5 font-semibold transition ${
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
                        className={`rounded-md px-2 py-0.5 font-semibold transition ${
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

                <div>
                  <span className="text-[11px] text-muted-foreground">
                    {isCard && !isOneTime ? "Próximo Vencimento (Cartão)" : "Vencimento"}
                  </span>
                  <p className="mt-0.5 flex items-center gap-1.5 text-base font-bold text-foreground">
                    <Calendar className="size-4 text-primary" />
                    {formatDate(billing.due_date)}
                  </p>
                  {isCard && isYearly && (
                    <span className="text-[11px] text-muted-foreground">
                      Renovação anual prevista para o próximo ano
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground">Forma de Pagamento</span>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {isCard
                      ? `Cartão${billing.card_brand ? ` (${billing.card_brand})` : ""}${
                          billing.card_last4 ? ` •••• ${billing.card_last4}` : ""
                        }`
                      : billing.payment_method === "pix"
                        ? "PIX"
                        : "Manual"}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    Gateway:{" "}
                    {isCard
                      ? "PicPay"
                      : billing.payment_method === "pix"
                        ? "Mercado Pago"
                        : "Gerente"}
                  </span>
                </div>
              </div>

              {/* Payment Gateway Actions */}
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border/70 bg-secondary/20 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Pagamento seguro no crédito via{" "}
                    <strong>PicPay</strong> (no próprio site).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!picpayReady || !canPayAmount || payingMethod !== null}
                      onClick={() => setShowCardModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CreditCard className="size-3.5" />
                      {payingMethod === "card" ? "Processando..." : "Pagar com Cartão"}
                    </button>
                  </div>
                </div>

                {!canPayAmount && (
                  <p className="text-[11px] text-muted-foreground">
                    Aguardando definição do valor da cobrança pelo gerente.
                  </p>
                )}

                {checkoutError && (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                    {checkoutError}
                  </p>
                )}

                {cardLink && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <span>Link de pagamento InfinitePay gerado!</span>
                    <a
                      href={cardLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      Abrir checkout <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Compact History */}
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Histórico de Mensalidades
              </h3>
              {billing.history.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum pagamento registrado até o momento.
                </p>
              ) : (
                <div className="divide-y divide-border/50 text-xs">
                  {billing.history.slice(0, 5).map((inv) => {
                    const isInvInstallment =
                      inv.billing_cycle === "yearly" &&
                      (Boolean(inv.allow_installments) || inv.installments === 12);
                    const installmentCents = isInvInstallment
                      ? Math.round(inv.amount_cents / 12)
                      : inv.amount_cents;

                    return (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{inv.plan_name}</span>
                          <span className="ml-2 text-muted-foreground">
                            • Venc. {formatDate(inv.due_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {isInvInstallment
                              ? `${formatCurrencyCents(installmentCents)}/mês`
                              : formatCurrencyCents(inv.amount_cents)}
                          </span>
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* 3D Credit Card Modal */}
      {showCardModal && billing && (
        <CreditCard3DForm
          amountLabel={
            showMonthlyInstallment
              ? `12x de ${formatCurrencyCents(monthlyCents)}`
              : formatCurrencyCents(billing.amount_cents)
          }
          planLabel={`${billing.plan_name} (${cycleLabel})`}
          submitting={payingMethod === "card"}
          onClose={() => setShowCardModal(false)}
          onProceedToCheckout={async (cardToken) => {
            await handleCheckout("card", {
              cardToken,
              installments: showMonthlyInstallment ? 12 : 1,
            });
            setShowCardModal(false);
          }}
        />
      )}

      {/* PIX Modal */}
      {pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <QrCode className="size-4 text-primary" />
                Pagamento via PIX
              </h2>
              <button
                type="button"
                onClick={() => setPixData(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {pixData.qrCode && (
              <div className="mb-4 flex justify-center rounded-xl bg-white p-3">
                <img
                  src={`data:image/png;base64,${pixData.qrCode}`}
                  alt="QR Code PIX"
                  className="size-48 object-contain"
                />
              </div>
            )}

            {pixData.copyPaste && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  PIX Copia e Cola
                </label>
                <textarea
                  readOnly
                  rows={3}
                  value={pixData.copyPaste}
                  className="w-full rounded-xl border border-border bg-background p-2.5 font-mono text-[11px] text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copiado!" : "Copiar código PIX"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
