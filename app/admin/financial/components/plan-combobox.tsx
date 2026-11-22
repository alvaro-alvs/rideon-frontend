"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, ChevronDown, Layers, Search, X } from "lucide-react";

import {
  formatBillingCycleLabel,
  formatCurrencyCents,
  PAYMENT_METHOD_LABELS,
} from "@/lib/financial-format";
import type { BillingPlan } from "@/lib/types/financial";

interface PlanComboboxProps {
  plans: BillingPlan[];
  loading?: boolean;
  selectedPlanId: string;
  onSelect: (plan: BillingPlan | null) => void;
  onManagePlans?: () => void;
}

function getPlanScopeTag(plan: BillingPlan): string {
  if (!plan.tenant_id) return "Global";
  if (!plan.manager_id) return "Organização";
  return "Gerente";
}

function renderHighlighted(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const idx = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/25 px-0.5 font-bold text-primary">
        {text.slice(idx, idx + trimmed.length)}
      </mark>
      {text.slice(idx + trimmed.length)}
    </>
  );
}

/**
 * Searchable combobox allowing managers and master admins to search and apply
 * existing billing plan templates in the new charge modal.
 */
export function PlanCombobox({
  plans,
  loading = false,
  selectedPlanId,
  onSelect,
  onManagePlans,
}: PlanComboboxProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activePlans = useMemo(
    () => plans.filter((p) => p.active !== false),
    [plans],
  );

  const selected = useMemo(
    () => activePlans.find((p) => p.id === selectedPlanId) ?? null,
    [activePlans, selectedPlanId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activePlans;
    return activePlans.filter((plan) => {
      const cycleLabel = formatBillingCycleLabel(
        plan.billing_cycle,
        plan.allow_installments,
      ).toLowerCase();
      const priceStr = formatCurrencyCents(plan.amount_cents).toLowerCase();
      const methodsStr = (plan.allowed_payment_methods ?? [])
        .map((m) => PAYMENT_METHOD_LABELS[m] || m)
        .join(" ")
        .toLowerCase();
      const scope = getPlanScopeTag(plan).toLowerCase();

      return (
        plan.name.toLowerCase().includes(q) ||
        (plan.description || "").toLowerCase().includes(q) ||
        cycleLabel.includes(q) ||
        priceStr.includes(q) ||
        methodsStr.includes(q) ||
        scope.includes(q)
      );
    });
  }, [activePlans, query]);

  const activeIndex =
    filtered.length === 0 ? -1 : Math.min(highlightedIndex, filtered.length - 1);

  const closeDropdown = () => {
    setOpen(false);
    setQuery("");
  };

  const handleChoose = (plan: BillingPlan) => {
    onSelect(plan);
    closeDropdown();
  };

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 10);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleChoose(filtered[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="font-semibold text-muted-foreground">
          Selecionar Plano Existente (opcional)
        </label>
        {onManagePlans && (
          <button
            type="button"
            onClick={onManagePlans}
            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            Gerenciar planos
          </button>
        )}
      </div>

      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((prev) => !prev);
          setHighlightedIndex(0);
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
          open
            ? "border-primary bg-background ring-2 ring-primary/20"
            : "border-border bg-background hover:border-primary/50"
        }`}
      >
        {selected ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
              <Layers className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">
                {selected.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {formatCurrencyCents(selected.amount_cents)} •{" "}
                {formatBillingCycleLabel(
                  selected.billing_cycle,
                  selected.allow_installments,
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-secondary text-muted-foreground">
              <Layers className="size-3.5" />
            </span>
            <span className="truncate text-xs">
              {loading
                ? "Carregando planos disponíveis..."
                : activePlans.length === 0
                  ? "Nenhum template de plano ativo — preencha manualmente abaixo"
                  : `Pesquisar e selecionar entre ${activePlans.length} ${
                      activePlans.length === 1 ? "plano" : "planos"
                    }...`}
            </span>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar plano selecionado"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setQuery("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onSelect(null);
                  setQuery("");
                }
              }}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-2xl border border-border/90 bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="space-y-1.5 border-b border-border/70 p-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Buscar plano por nome, valor ou recorrência..."
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Limpar busca"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>Selecione um plano para preencher os dados da cobrança</span>
              <span className="font-mono">
                {filtered.length}/{activePlans.length}
              </span>
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            className="max-h-56 space-y-0.5 overflow-y-auto p-1.5"
          >
            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Carregando planos...
              </div>
            ) : activePlans.length === 0 ? (
              <div className="space-y-2 py-6 text-center text-xs text-muted-foreground">
                <p>Nenhum template de plano ativo disponível.</p>
                {onManagePlans && (
                  <button
                    type="button"
                    onClick={() => {
                      closeDropdown();
                      onManagePlans();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 cursor-pointer"
                  >
                    Criar plano na aba Planos
                  </button>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhum plano encontrado para &ldquo;{query.trim()}&rdquo;.
              </div>
            ) : (
              filtered.map((plan, index) => {
                const isSelected = plan.id === selectedPlanId;
                const isHighlighted = index === activeIndex;
                const methodsText = (plan.allowed_payment_methods ?? [])
                  .map((m) => PAYMENT_METHOD_LABELS[m] || m)
                  .join(" • ");

                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleChoose(plan)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : isHighlighted
                          ? "bg-secondary/90 text-foreground"
                          : "text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-xs font-bold">
                          {renderHighlighted(plan.name, query)}
                        </span>
                        <span className="rounded-md border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {getPlanScopeTag(plan)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">
                          {formatCurrencyCents(plan.amount_cents)}
                        </span>
                        <span>•</span>
                        <span>
                          {formatBillingCycleLabel(
                            plan.billing_cycle,
                            plan.allow_installments,
                          )}
                        </span>
                        {methodsText && (
                          <>
                            <span>•</span>
                            <span>{methodsText}</span>
                          </>
                        )}
                      </div>
                      {plan.description && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
