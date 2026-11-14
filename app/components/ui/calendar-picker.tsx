"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useId,
} from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronDown,
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

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

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const margin = 12;
    const gap = 8;

    const width = Math.min(340, viewportW - margin * 2);
    const left = Math.min(
      Math.max(margin, rect.left),
      viewportW - width - margin,
    );

    const measuredHeight = popoverRef.current?.offsetHeight ?? 380;
    const spaceBelow = viewportH - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;

    let top: number;
    if (spaceBelow >= measuredHeight || spaceBelow >= spaceAbove) {
      top = Math.min(rect.bottom + gap, viewportH - measuredHeight - margin);
      top = Math.max(margin, top);
    } else {
      top = Math.max(margin, rect.top - measuredHeight - gap);
    }

    setPopoverCoords({
      top,
      left,
      width,
      maxHeight: viewportH - margin * 2,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, viewMode, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  // Auto-scroll selected year into view when switching to years selector
  useEffect(() => {
    if (isOpen && viewMode === "years" && selectedYearRef.current) {
      selectedYearRef.current.scrollIntoView({
        block: "center",
        behavior: "instant" as ScrollBehavior,
      });
    }
  }, [isOpen, viewMode]);

  // Click outside or Escape to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!popoverRef.current || !popoverRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
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
    <div ref={containerRef} className={`relative ${isOpen ? "z-50" : "z-0"} space-y-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block cursor-pointer">
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

      {/* Interactive Trigger */}
      <div
        ref={triggerRef}
        className={`group relative flex w-full items-center rounded-xl border bg-background transition-all duration-200 ${
          isOpen
            ? "border-primary ring-1 ring-primary shadow-lg shadow-primary/10"
            : "border-border hover:border-primary/50 hover:bg-secondary/40"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <button
          id={inputId}
          type="button"
          disabled={disabled}
          onClick={handleToggleOpen}
          className="flex flex-1 min-w-0 items-center justify-between gap-2 px-3.5 py-2.5 text-left focus:outline-none"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CalendarDays
              className={`size-4 shrink-0 transition-colors ${
                isOpen || currentValue ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`truncate text-xs ${
                currentValue
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground font-normal normal-case"
              }`}
            >
              {formattedDisplay || placeholder}
            </span>
          </div>

          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </button>

        {currentValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Limpar data"
            aria-label="Limpar data"
            className="mr-2 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Popover Calendar Modal (Portaled to body so it is never clipped and always fits on screen) */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={label || "Selecionar data"}
            style={{
              position: "fixed",
              top: popoverCoords ? `${popoverCoords.top}px` : "-9999px",
              left: popoverCoords ? `${popoverCoords.left}px` : "-9999px",
              width: popoverCoords ? `${popoverCoords.width}px` : "336px",
              maxHeight: popoverCoords ? `${popoverCoords.maxHeight}px` : "90vh",
              visibility: popoverCoords ? "visible" : "hidden",
            }}
            className="z-[9999] overflow-y-auto calendar-scrollbar rounded-2xl border border-border bg-card/98 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
          >
            {/* Subtle Cyber Glow Top Line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

            {/* Preset Quick-Jumps (Great UX for Birthdate) */}
            {showPresets && presets.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0 flex items-center gap-1 mr-0.5">
                  <RotateCcw className="size-2.5 text-primary" />
                  Atalhos:
                </span>
                {presets.map((preset) => {
                  const isActivePreset =
                    !("day" in preset) && viewYear === preset.year;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (
                          "day" in preset &&
                          preset.day !== undefined &&
                          preset.month !== undefined
                        ) {
                          handleSelectDate(preset.year, preset.month, preset.day);
                        } else {
                          setViewYear(preset.year);
                          setViewMode("days");
                        }
                      }}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-all shrink-0 ${
                        isActivePreset
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/60 bg-secondary/60 text-foreground/80 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
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
                className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase transition-colors ${
                  viewMode === "months"
                    ? "bg-primary/15 text-primary border border-primary/50"
                    : "text-foreground hover:bg-secondary hover:text-primary"
                }`}
              >
                {MONTHS_PT[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
                className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase transition-colors border ${
                  viewMode === "years"
                    ? "bg-primary/15 text-primary border-primary/50"
                    : "border-border/60 bg-secondary/40 text-foreground hover:bg-secondary hover:text-primary"
                }`}
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
                  const m = viewMonth === 0 ? 11 : viewMonth - 1;
                  const y = viewMonth === 0 ? viewYear - 1 : viewYear;
                  const fillerIso = `${y}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isFillerDisabled =
                    Boolean(maxDate && fillerIso > maxDate) ||
                    Boolean(minDate && fillerIso < minDate);
                  return (
                    <button
                      key={`prev-${idx}`}
                      type="button"
                      disabled={isFillerDisabled}
                      onClick={() => handleSelectDate(y, m, dayNum)}
                      className={`h-9 w-full rounded-lg text-center text-xs font-medium transition-colors ${
                        isFillerDisabled
                          ? "text-muted-foreground/15 cursor-not-allowed"
                          : "text-muted-foreground/35 hover:bg-secondary/40 hover:text-muted-foreground"
                      }`}
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
                      className={`relative h-9 w-full rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center ${
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
            <div className="max-h-52 overflow-y-auto calendar-scrollbar pr-1.5 grid grid-cols-4 gap-1.5 py-2">
              {yearsList.map((yearNum) => {
                const isSelected = viewYear === yearNum;
                return (
                  <button
                    key={yearNum}
                    ref={isSelected ? selectedYearRef : undefined}
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
              Fechar
            </button>
          </div>
        </div>,
        document.body,
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
