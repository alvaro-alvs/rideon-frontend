"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, Cpu, Radio, Search, X } from "lucide-react";
import type { Device } from "@/lib/types/device";

export type TrackerOption = Pick<
  Device,
  "id" | "serial_number" | "protocol" | "status" | "discovered_via_broker" | "last_seen_at"
>;

interface TrackerSelectProps {
  options: TrackerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function normalizeToken(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function renderHighlightedImei(imei: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return imei;

  const idx = imei.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return imei;

  const before = imei.slice(0, idx);
  const match = imei.slice(idx, idx + trimmed.length);
  const after = imei.slice(idx + trimmed.length);

  return (
    <>
      {before}
      <mark className="rounded bg-primary/25 px-0.5 text-primary font-black">{match}</mark>
      {after}
    </>
  );
}

/**
 * Combobox pesquisável por IMEI para seleção de rastreadores disponíveis.
 */
export function TrackerSelect({
  options,
  value,
  onChange,
  placeholder = "Pesquisar ou selecionar rastreador por IMEI...",
  required = false,
}: TrackerSelectProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((opt) => opt.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    const qToken = normalizeToken(q);
    return options.filter((opt) => {
      const imei = opt.serial_number.toLowerCase();
      const protocol = (opt.protocol || "gps").toLowerCase();
      const status = opt.status.toLowerCase();
      return (
        imei.includes(q) ||
        (qToken.length > 0 && normalizeToken(opt.serial_number).includes(qToken)) ||
        protocol.includes(q) ||
        status.includes(q)
      );
    });
  }, [options, query]);

  const activeIndex =
    filtered.length === 0 ? -1 : Math.min(highlightedIndex, filtered.length - 1);

  const closeDropdown = () => {
    setOpen(false);
    setQuery("");
  };

  const selectOption = (id: string) => {
    onChange(id);
    closeDropdown();
  };

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => searchInputRef.current?.focus(), 10);

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
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
      selectOption(filtered[activeIndex].id);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0 w-full opacity-0"
        />
      )}

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
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
          open
            ? "border-primary bg-background ring-2 ring-primary/20"
            : "border-border bg-background hover:border-primary/50"
        }`}
      >
        {selected ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/15 text-cyan-400">
              <Cpu className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-bold text-foreground">
                IMEI: {selected.serial_number}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {(selected.protocol || "GPS").toUpperCase()} • {selected.status}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-secondary text-muted-foreground">
              <Cpu className="size-3.5" />
            </span>
            <span className="text-xs">{placeholder}</span>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar seleção"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                  setQuery("");
                }
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-border/90 bg-card/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-border/70 p-2.5 space-y-1.5">
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
                placeholder="Digite o IMEI ou protocolo..."
                className="w-full bg-transparent font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:outline-none"
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
              <span>Pesquise pelo número IMEI do equipamento</span>
              <span className="font-mono">
                {filtered.length}/{options.length}
              </span>
            </div>
          </div>

          <div id={listboxId} role="listbox" className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhum rastreador encontrado para &ldquo;{query.trim()}&rdquo;.
              </div>
            ) : (
              filtered.map((opt, index) => {
                const isSelected = opt.id === value;
                const isHighlighted = index === activeIndex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(opt.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : isHighlighted
                          ? "bg-secondary/90 text-foreground"
                          : "text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-cyan-500/25 bg-cyan-500/10 text-cyan-400"
                        }`}
                      >
                        <Cpu className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-bold">
                          {renderHighlightedImei(opt.serial_number, query)}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-cyan-400">
                            {(opt.protocol || "GPS").toUpperCase()}
                          </span>
                          <span>•</span>
                          <span>{opt.status}</span>
                          {opt.discovered_via_broker && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <Radio className="size-2.5" />
                                Broker
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
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
