"use client";

import { Check } from "lucide-react";

export const POPULAR_BRANDS = [
  { name: "Honda", color: "#E60012" },
  { name: "Yamaha", color: "#0C238A" },
  { name: "BMW", color: "#0066B1" },
  { name: "Kawasaki", color: "#66CC00" },
  { name: "Triumph", color: "#D12421" },
  { name: "Suzuki", color: "#E31E24" },
  { name: "Ducati", color: "#CC0000" },
  { name: "Royal Enfield", color: "#C69214" },
  { name: "Harley-Davidson", color: "#FF6600" },
] as const;

export const POPULAR_COLORS = [
  { name: "Preto", hex: "#111111", border: "#444444" },
  { name: "Vermelho", hex: "#EF251B", border: "#FF4D42" },
  { name: "Azul", hex: "#1D4ED8", border: "#3B82F6" },
  { name: "Branco", hex: "#F8FAFC", border: "#CBD5E1", isLight: true },
  { name: "Cinza", hex: "#64748B", border: "#94A3B8" },
  { name: "Verde", hex: "#16A34A", border: "#22C55E" },
  { name: "Amarelo", hex: "#EAB308", border: "#FACC15" },
  { name: "Laranja", hex: "#EA580C", border: "#F97316" },
] as const;

export function BrandQuickSelect({
  selectedBrand,
  onSelect,
}: {
  selectedBrand?: string;
  onSelect: (brand: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sugestões Rápidas de Marca:
      </span>
      <div className="flex flex-wrap gap-1.5">
        {POPULAR_BRANDS.map((item) => {
          const isSelected =
            selectedBrand?.trim().toLowerCase() === item.name.toLowerCase();

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelect(item.name)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                isSelected
                  ? "bg-primary text-white shadow-sm shadow-primary/20 ring-1 ring-primary"
                  : "border border-border/80 bg-secondary/70 text-foreground/80 hover:border-primary/50 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
              {isSelected && <Check className="size-3 stroke-[2.5]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ColorQuickSelect({
  selectedColor,
  onSelect,
}: {
  selectedColor?: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Amostras de Cores:
      </span>
      <div className="flex flex-wrap gap-2">
        {POPULAR_COLORS.map((item) => {
          const isSelected =
            selectedColor?.trim().toLowerCase() === item.name.toLowerCase();

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelect(item.name)}
              className={`group flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                  : "border-border/80 bg-secondary/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
              title={`Selecionar cor ${item.name}`}
            >
              <span
                className="size-3 rounded-full shrink-0 shadow-inner"
                style={{
                  backgroundColor: item.hex,
                  border: `1px solid ${item.border}`,
                }}
              />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getColorHex(colorName?: string): string {
  if (!colorName) return "#6B7280";
  const found = POPULAR_COLORS.find(
    (c) => c.name.toLowerCase() === colorName.trim().toLowerCase(),
  );
  if (found) return found.hex;

  // Fallbacks para nomes comuns
  const lower = colorName.toLowerCase();
  if (lower.includes("preto") || lower.includes("black")) return "#111111";
  if (lower.includes("verm") || lower.includes("red")) return "#EF251B";
  if (lower.includes("azul") || lower.includes("blue")) return "#1D4ED8";
  if (lower.includes("branc") || lower.includes("white")) return "#F8FAFC";
  if (lower.includes("cinza") || lower.includes("gray") || lower.includes("prata") || lower.includes("silver"))
    return "#64748B";
  if (lower.includes("verde") || lower.includes("green")) return "#16A34A";
  if (lower.includes("amar") || lower.includes("yellow")) return "#EAB308";
  if (lower.includes("laranja") || lower.includes("orange")) return "#EA580C";

  return "#4B5563";
}
