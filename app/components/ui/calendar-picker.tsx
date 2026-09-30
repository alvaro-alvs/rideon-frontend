"use client";

import { useEffect, useRef, useState, useId } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  RotateCcw,
} from "lucide-react";

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface CalendarPickerProps {
  label?: string;
  name?: string;
  value?: string; // Format: YYYY-MM-DD
  defaultValue?: string;
  onChange?: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  mode?: "birthdate" | "future" | "standard";
  showPresets?: boolean;
}

export function CalendarPicker({
  label,
  name,
  value: controlledValue,
  defaultValue = "",
  onChange,
  minDate = "1920-01-01",
  maxDate = new Date().toISOString().split("T")[0],
  placeholder = "Selecione uma data",
  required = false,
  disabled = false,
  className = "",
  mode = "birthdate",
  showPresets = true,
}: CalendarPickerProps) {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

  // Controlled vs uncontrolled state
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? controlledValue : internalValue;

  // Selected date components
  const parsedDate = currentValue ? parseIsoDate(currentValue) : null;

  // View state (Year & Month being viewed)
  const today = new Date();
  const initialYear = parsedDate ? parsedDate.getFullYear() : mode === "birthdate" ? 1998 : today.getFullYear();
  const initialMonth = parsedDate ? parsedDate.getMonth() : today.getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      if (parsedDate) {
        setViewYear(parsedDate.getFullYear());
        setViewMonth(parsedDate.getMonth());
      }
      setViewMode("days");
    }
    setIsOpen((prev) => !prev);
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle date selection
  const handleSelectDate = (year: number, month: number, day: number) => {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    if (!isControlled) {
      setInternalValue(dateStr);
    }
    onChange?.(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
  };

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Quick Decade Navigation
  const prevDecade = () => setViewYear((y) => y - 10);
  const nextDecade = () => setViewYear((y) => y + 10);

  // Quick Age / Date Presets (UX enhancement)
  const presets = mode === "birthdate" ? [
    { label: "18 anos", year: today.getFullYear() - 18 },
    { label: "25 anos", year: today.getFullYear() - 25 },
    { label: "30 anos", year: today.getFullYear() - 30 },
    { label: "40 anos", year: today.getFullYear() - 40 },
  ] : [
    { label: "Hoje", year: today.getFullYear(), month: today.getMonth(), day: today.getDate() },
  ];

  // Generate calendar days
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Range of years for quick selector (e.g. 1920 to currentYear + 5)
  const minYear = Number(minDate.split("-")[0]) || 1920;
  const maxYear = Number(maxDate.split("-")[0]) || today.getFullYear();
  const yearsList = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearsList.push(y);
  }

  // Display text in input
  const formattedDisplay = parsedDate
    ? formatReadablePtBr(parsedDate)
    : "";

  return (
    <div ref={containerRef} className={`relative ${isOpen ? "z-50" : "z-0"} grid gap-2 text-xs font-bold uppercase tracking-wider text-foreground ${className}`}>
      {label && (
        <label htmlFor={inputId} className="cursor-pointer">
          {label} {required && <span className="text-primary">*</span>}
        </label>
      )}

      {/* Hidden input to ensure standard form POST / FormData compatibility */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue || ""}
          required={required}
        />
      )}

      {/* Interactive Trigger Button */}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`group flex w-full items-center justify-between rounded-xl border bg-secondary/80 px-3.5 py-3 text-left transition-all duration-200 ${
          isOpen
            ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
            : "border-border/80 hover:border-primary/50 hover:bg-secondary"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <CalendarDays
            className={`size-4 shrink-0 transition-colors ${
              isOpen || currentValue ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <span
            className={`truncate text-sm font-medium ${
              currentValue ? "text-foreground font-semibold" : "text-muted-foreground/70 lowercase font-normal"
            }`}
          >
            {formattedDisplay || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpar data"
              className="rounded-lg p-1 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
          <span
            className="rounded-md bg-card/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase border border-border/40 transition-colors group-hover:border-primary/40"
          >
            {isOpen ? "Fechar" : "Alterar"}
          </span>
        </div>
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-[300px] max-w-[340px] sm:max-w-[360px] overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-2xl">
          {/* Subtle Cyber Glow Top Line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Preset Quick-Jumps (Great UX for Birthdate) */}
          {showPresets && presets.length > 0 && (
            <div className="mb-3 flex items-center gap-1.5 border-b border-border/60 pb-2.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0 flex items-center gap-1">
                <RotateCcw className="size-2.5 text-primary" />
                Atalhos:
              </span>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if ("day" in preset && preset.day !== undefined && preset.month !== undefined) {
                      handleSelectDate(preset.year, preset.month, preset.day);
                    } else {
                      setViewYear(preset.year);
                      setViewMode("days");
                    }
                  }}
                  className="rounded-lg border border-border/60 bg-secondary/60 px-2 py-1 text-[10px] font-bold text-foreground/80 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-1 mb-3">
            {viewMode === "days" && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevDecade}
                  title="Recuar 10 anos"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <ChevronsLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={prevMonth}
                  title="Mês Anterior"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>
            )}

            {/* Mode Selector Header (Click to switch to Month or Year Picker) */}
            <div className="flex items-center gap-1.5 mx-auto">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "months" ? "days" : "months")}
                className="rounded-lg px-2 py-1 text-xs font-black uppercase text-foreground hover:bg-secondary hover:text-primary transition-colors"
              >
                {MONTHS_PT[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
                className="rounded-lg px-2 py-1 text-xs font-black uppercase text-foreground hover:bg-secondary hover:text-primary transition-colors border border-border/60 bg-secondary/40"
              >
                {viewYear}
              </button>
            </div>

            {viewMode === "days" && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={nextMonth}
                  title="Próximo Mês"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={nextDecade}
                  title="Avançar 10 anos"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <ChevronsRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* VIEW: DAYS GRID                                                   */}
          {/* ================================================================= */}
          {viewMode === "days" && (
            <div className="space-y-1">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAYS_PT.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Days Numbers */}
              <div className="grid grid-cols-7 gap-1">
                {/* Previous month filler days */}
                {Array.from({ length: firstDayWeekday }).map((_, idx) => {
                  const dayNum = prevMonthDays - firstDayWeekday + idx + 1;
                  return (
                    <button
                      key={`prev-${idx}`}
                      type="button"
                      onClick={() => {
                        const m = viewMonth === 0 ? 11 : viewMonth - 1;
                        const y = viewMonth === 0 ? viewYear - 1 : viewYear;
                        handleSelectDate(y, m, dayNum);
                      }}
                      className="size-8 rounded-lg text-center text-xs font-medium text-muted-foreground/30 hover:bg-secondary/40 hover:text-muted-foreground"
                    >
                      {dayNum}
                    </button>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isSelected =
                    parsedDate &&
                    parsedDate.getFullYear() === viewYear &&
                    parsedDate.getMonth() === viewMonth &&
                    parsedDate.getDate() === dayNum;

                  const isToday =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === dayNum;

                  const thisDateIso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isBeyondMax = Boolean(maxDate && thisDateIso > maxDate);
                  const isBelowMin = Boolean(minDate && thisDateIso < minDate);
                  const isDisabled = isBeyondMax || isBelowMin;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelectDate(viewYear, viewMonth, dayNum)}
                      className={`relative size-8 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center ${
                        isSelected
                          ? "bg-primary text-white shadow-md shadow-primary/30 font-black scale-105"
                          : isToday
                          ? "border border-primary text-primary hover:bg-primary/10"
                          : isDisabled
                          ? "text-muted-foreground/20 cursor-not-allowed"
                          : "text-foreground hover:bg-secondary hover:text-primary"
                      }`}
                    >
                      {dayNum}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW: MONTHS SELECTOR                                             */}
          {/* ================================================================= */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {MONTHS_PT.map((monthName, idx) => {
                const isSelected = viewMonth === idx;
                return (
                  <button
                    key={monthName}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setViewMode("days");
                    }}
                    className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "border border-border/60 bg-secondary/50 text-foreground hover:border-primary/50 hover:bg-secondary hover:text-primary"
                    }`}
                  >
                    {monthName.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW: YEARS SELECTOR                                              */}
          {/* ================================================================= */}
          {viewMode === "years" && (
            <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-4 gap-1.5 py-2">
              {yearsList.map((yearNum) => {
                const isSelected = viewYear === yearNum;
                return (
                  <button
                    key={yearNum}
                    type="button"
                    onClick={() => {
                      setViewYear(yearNum);
                      setViewMode("days");
                    }}
                    className={`rounded-xl py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "border border-border/60 bg-secondary/50 text-foreground hover:border-primary/50 hover:bg-secondary hover:text-primary"
                    }`}
                  >
                    {yearNum}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer with Today / Confirm button */}
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                handleSelectDate(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate(),
                );
              }}
              className="font-bold text-primary hover:underline"
            >
              Ir para Hoje
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground font-bold"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function parseIsoDate(iso: string): Date | null {
  if (!iso) return null;
  const parts = iso.split("T")[0].split("-");
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month, day);
}

function formatReadablePtBr(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
