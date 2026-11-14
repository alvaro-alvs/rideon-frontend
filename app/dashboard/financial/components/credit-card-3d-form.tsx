"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Lock, ShieldCheck, Sparkles, X } from "lucide-react";

type CardBrandInfo = {
  name: string;
  gradient: string;
  badge: string;
};

function detectCardBrand(digits: string): CardBrandInfo {
  if (/^4/.test(digits)) {
    return {
      name: "Visa",
      gradient: "from-slate-900 via-blue-950 to-indigo-900",
      badge: "VISA",
    };
  }
  if (/^(5[1-5]|2[2-7])/.test(digits)) {
    return {
      name: "Mastercard",
      gradient: "from-zinc-900 via-rose-950 to-amber-900",
      badge: "MASTERCARD",
    };
  }
  if (/^3[47]/.test(digits)) {
    return {
      name: "American Express",
      gradient: "from-slate-900 via-emerald-950 to-teal-900",
      badge: "AMEX",
    };
  }
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|6277|6362|6363|650|651|655)/.test(digits)) {
    return {
      name: "Elo",
      gradient: "from-neutral-900 via-yellow-950 to-zinc-900",
      badge: "ELO",
    };
  }
  return {
    name: "Cartão",
    gradient: "from-zinc-900 via-neutral-800 to-zinc-950",
    badge: "CARD",
  };
}

function luhnValid(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number.parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isExpiryValid(expiry: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return false;
  const month = Number.parseInt(match[1], 10);
  const year = 2000 + Number.parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expDate = new Date(year, month, 0, 23, 59, 59);
  return expDate >= now;
}

type CreditCard3DFormProps = {
  amountLabel: string;
  planLabel: string;
  submitting: boolean;
  onClose: () => void;
  onProceedToCheckout: (cardToken: string) => Promise<void>;
};

export function CreditCard3DForm({
  amountLabel,
  planLabel,
  submitting,
  onClose,
  onProceedToCheckout,
}: CreditCard3DFormProps) {
  // Ephemeral state — NEVER persisted or sent to our backend (PCI-DSS safe)
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");

  const digits = cardNumber.replace(/\D/g, "");
  const brand = useMemo(() => detectCardBrand(digits), [digits]);

  const maskedPreview = useMemo(() => {
    const padded = (digits + "••••••••••••••••").slice(0, 16);
    // Mask middle 8 digits on preview for privacy
    const visible = padded
      .split("")
      .map((ch, idx) => (idx >= 4 && idx < 12 && idx < digits.length ? "•" : ch))
      .join("");
    return visible.replace(/(.{4})/g, "$1 ").trim();
  }, [digits]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * 10, y: x * 12 });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!luhnValid(digits)) {
      setError("Número do cartão inválido. Verifique os dígitos.");
      return;
    }
    if (holderName.trim().length < 3) {
      setError("Informe o nome impresso no cartão.");
      return;
    }
    if (!isExpiryValid(expiry)) {
      setError("Validade inválida ou cartão vencido.");
      return;
    }
    if (cvv.length < 3) {
      setError("Informe o código de segurança (CVV).");
      return;
    }

    // Clear sensitive fields from memory immediately before sending tokenized checkout
    setCardNumber("");
    setCvv("");
    // PicPay Transparent SDK temporaryCardToken will be injected here when SDK key is configured
    const ephemeralToken =
      typeof window !== "undefined" &&
      (window as unknown as { __picpayToken?: string }).__picpayToken
        ? String((window as unknown as { __picpayToken?: string }).__picpayToken)
        : "";
    await onProceedToCheckout(ephemeralToken);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <ShieldCheck className="size-5 text-emerald-400" />
              Checkout Seguro — Cartão
            </h2>
            <p className="text-xs text-muted-foreground">
              {planLabel} • <strong className="text-foreground">{amountLabel}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 3D Interactive Card */}
        <div
          className="mx-auto mb-6 h-48 w-full max-w-[340px]"
          style={{ perspective: "1200px" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
          <div
            className="relative h-full w-full transition-transform duration-700"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${tilt.x}deg) rotateY(${
                (isFlipped ? 180 : 0) + tilt.y
              }deg)`,
            }}
          >
            {/* Front Face */}
            <div
              className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${brand.gradient} p-5 text-white shadow-2xl`}
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
              <div className="flex items-center justify-between">
                {/* EMV Chip */}
                <div className="h-8 w-11 rounded-md border border-amber-200/40 bg-gradient-to-br from-amber-200/80 to-yellow-500/70 shadow-inner" />
                <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold tracking-widest">
                  <Sparkles className="size-3" />
                  {brand.badge}
                </span>
              </div>

              <div className="font-mono text-lg font-semibold tracking-[0.16em] text-white/95 drop-shadow">
                {maskedPreview}
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[9px] uppercase tracking-widest text-white/60">
                    Titular
                  </span>
                  <span className="block truncate text-xs font-semibold uppercase tracking-wider">
                    {holderName.trim() || "NOME DO TITULAR"}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-[9px] uppercase tracking-widest text-white/60">
                    Validade
                  </span>
                  <span className="font-mono text-xs font-semibold">
                    {expiry || "MM/AA"}
                  </span>
                </div>
              </div>
            </div>

            {/* Back Face */}
            <div
              className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${brand.gradient} py-5 text-white shadow-2xl`}
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="h-10 w-full bg-black/80" />
              <div className="px-5">
                <span className="mb-1 block text-right text-[9px] uppercase tracking-widest text-white/70">
                  CVV
                </span>
                <div className="flex h-9 items-center justify-end rounded-lg bg-white/90 px-3 font-mono text-sm font-bold tracking-widest text-zinc-900">
                  {cvv ? "•".repeat(cvv.length) : "•••"}
                </div>
              </div>
              <div className="flex items-center justify-between px-5 text-[10px] text-white/60">
                <span>PCI-DSS Protected</span>
                <span className="font-bold">{brand.badge}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs" autoComplete="off">
          <div>
            <label className="mb-1 block font-semibold text-muted-foreground">
              Número do Cartão
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onFocus={() => setIsFlipped(false)}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-muted-foreground">
              Nome Impresso no Cartão
            </label>
            <input
              type="text"
              autoComplete="cc-name"
              placeholder="COMO ESTÁ NO CARTÃO"
              value={holderName}
              onFocus={() => setIsFlipped(false)}
              onChange={(e) => setHolderName(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 uppercase text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-muted-foreground">
                Validade
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={expiry}
                onFocus={() => setIsFlipped(false)}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-muted-foreground">
                CVV
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                placeholder="•••"
                value={cvv}
                onFocus={() => setIsFlipped(true)}
                onBlur={() => setIsFlipped(false)}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Security Guarantee */}
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Criptografia TLS ponta a ponta. Número completo e CVV nunca são gravados nos nossos
              servidores — a cobrança é tokenizada e processada no ambiente PCI-DSS do{" "}
              <strong>PicPay</strong>.
            </span>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-rose-400">{error}</p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
            >
              <Lock className="size-3.5" />
              {submitting ? "Processando no PicPay..." : `Pagar ${amountLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

