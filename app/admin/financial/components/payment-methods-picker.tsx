"use client";

import { Banknote, CreditCard, QrCode } from "lucide-react";

import { normalizeSelectedMethods } from "@/lib/financial-format";
import type { BillingCycle, PaymentMethod } from "@/lib/types/financial";

export const PAYMENT_METHOD_OPTIONS: Array<{
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

interface PaymentMethodsPickerProps {
  label: string;
  selectedMethods: PaymentMethod[];
  onChange: (next: PaymentMethod[]) => void;
  billingCycle: BillingCycle;
  allowInstallments: boolean;
}

export function PaymentMethodsPicker({
  label,
  selectedMethods,
  onChange,
  billingCycle,
  allowInstallments,
}: PaymentMethodsPickerProps) {
  const toggleMethod = (method: PaymentMethod) => {
    const exists = selectedMethods.includes(method);
    const next = exists
      ? selectedMethods.filter((m) => m !== method)
      : [...selectedMethods, method];
    onChange(normalizeSelectedMethods(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-muted-foreground">{label}</label>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            selectedMethods.length > 0
              ? "bg-secondary text-muted-foreground"
              : "bg-rose-500/15 text-rose-400"
          }`}
        >
          {selectedMethods.length}{" "}
          {selectedMethods.length === 1 ? "ativo" : "ativos"}
        </span>
      </div>

      <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/60">
        {PAYMENT_METHOD_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const enabled = selectedMethods.includes(opt.id);
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
                  enabled ? "border-primary bg-primary" : "border-border bg-secondary"
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

      {selectedMethods.length === 0 && (
        <p className="text-[11px] font-medium text-rose-400">
          Ative pelo menos um meio de pagamento para continuar.
        </p>
      )}
    </div>
  );
}
