"use client";

import Link from "next/link";
import {
  Bike,
  CalendarDays,
  ChevronRight,
  MapPin,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { VehiclePlatePreview } from "./vehicle-plate-preview";
import { getColorHex } from "./brand-quick-select";

export type VehicleCardData = {
  id?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  status?: string;
  rider?: {
    name?: string;
    phone?: string;
  };
};

export function VehicleMiniCard({
  vehicle,
  isAdmin = false,
  onOpenTelemetry,
}: {
  vehicle: VehicleCardData;
  isAdmin?: boolean;
  onOpenTelemetry?: (vehicle: VehicleCardData) => void;
}) {
  const modelText =
    `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() || "Motocicleta";
  const colorHex = getColorHex(vehicle.color);

  const getInitials = (name?: string) => {
    if (!name) return "P";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/10">
      {/* Top Accent Gradient Line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Subtle Background Glow on Hover */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/15" />

      <div>
        {/* Top Header Row: Icon/Beacon + Mercosul Plate */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-secondary/80 text-primary shadow-inner transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-white">
              <Bike className="size-5" />
              {/* Online Pulse Beacon */}
              <span className="absolute -bottom-1 -right-1 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-emerald-500" />
              </span>
            </div>

            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="size-3" />
                Protegido 24h
              </span>
            </div>
          </div>

          {/* Mercosul License Plate Badge */}
          <VehiclePlatePreview plate={vehicle.license_plate} size="sm" />
        </div>

        {/* Model and Brand Name */}
        <div className="mt-4">
          {vehicle.brand && (
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              {vehicle.brand}
            </p>
          )}
          <h3 className="truncate text-lg font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
            {vehicle.model || modelText}
          </h3>

          {/* Specs Chips: Year & Color */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            {vehicle.year && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                <CalendarDays className="size-3 text-primary/80" />
                <span>Ano {vehicle.year}</span>
              </span>
            )}

            {vehicle.color && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                <span
                  className="size-2.5 rounded-full shadow-sm"
                  style={{
                    backgroundColor: colorHex,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
                <span>{vehicle.color}</span>
              </span>
            )}
          </div>
        </div>

        {/* Pilot Info Box (if present or in admin mode) */}
        {vehicle.rider?.name && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-2.5 text-xs backdrop-blur-sm">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 font-bold text-primary text-[10px] border border-primary/20">
              {getInitials(vehicle.rider.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-foreground">
                {vehicle.rider.name}
              </p>
              {vehicle.rider.phone && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  {vehicle.rider.phone}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Quick Actions */}
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Radio className="size-3 text-primary animate-pulse" />
          {isAdmin ? "Frota RideOn" : "GPS Conectado"}
        </span>

        {onOpenTelemetry ? (
          <button
            type="button"
            onClick={() => onOpenTelemetry(vehicle)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/25"
          >
            <MapPin className="size-3.5" />
            <span>Monitorar ao Vivo</span>
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/25"
          >
            <span>Visualizar</span>
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}
