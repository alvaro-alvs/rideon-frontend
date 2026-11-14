"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, User, X } from "lucide-react";

export interface OwnerOption {
  id: string;
  name: string;
  email: string;
}

interface OwnerSelectProps {
  options: OwnerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function OwnerSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione um cliente...",
  required = false,
}: OwnerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((opt) => opt.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.email.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => searchInputRef.current?.focus(), 10);

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
          open
            ? "border-primary bg-background ring-2 ring-primary/20"
            : "border-border bg-background hover:border-primary/50"
        }`}
      >
        {selected ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[11px] font-black text-primary border border-primary/25">
              {getInitials(selected.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">
                {selected.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {selected.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground border border-border/70">
              <User className="size-3.5" />
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
          <div className="border-b border-border/70 p-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : "text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground border-border/70"
                        }`}
                      >
                        {getInitials(opt.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{opt.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {opt.email}
                        </p>
                      </div>
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

