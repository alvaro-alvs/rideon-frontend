import type { BillingCycle, PaymentMethod } from "@/lib/types/financial";

export function formatCurrencyCents(cents?: number): string {
  if (!cents) return "R$ 0,00";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPriceInputFromDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "R$ 0,00";
  const cents = Number.parseInt(digits, 10);
  return formatCurrencyCents(cents);
}

export function parsePriceInputToCents(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

export function formatBillingCycleLabel(
  cycle: BillingCycle,
  allowInstallments?: boolean,
): string {
  if (cycle === "yearly") {
    return allowInstallments ? "Anual (12x)" : "Anual";
  }
  if (cycle === "one_time") {
    return "Única";
  }
  return "Mensal";
}

export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["pix", "card", "manual"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  card: "Cartão",
  manual: "Manual",
};

export function normalizeSelectedMethods(methods: PaymentMethod[]): PaymentMethod[] {
  const set = new Set(methods);
  return PAYMENT_METHOD_ORDER.filter((m) => set.has(m));
}
