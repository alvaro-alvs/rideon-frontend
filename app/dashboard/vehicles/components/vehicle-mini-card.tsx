"use client";

import Link from "next/link";
import { Bike, CalendarDays, ChevronRight, Palette, User } from "lucide-react";

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
}: {
  vehicle: VehicleCardData;
  isAdmin?: boolean;
}) {
  const plate = vehicle.license_plate?.trim().toUpperCase() || "SEM PLACA";
  const modelText = `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() || "Motocicleta";

  return (
    <article className="group relative flex flex-col justify-between border border-border bg-card p-4 transition-all duration-200 hover:border-primary/70 hover:shadow-lg hover:shadow-primary/5">
      {/* Top accent glow line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div>
        {/* Card Header: Bike icon + Plate Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Bike className="size-4" />
            </span>
            <div className="min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Ativo
              </span>
            </div>
          </div>

          {/* Mercosul License Plate Badge */}
          <div className="inline-flex shrink-0 items-center overflow-hidden rounded border border-blue-500/60 bg-neutral-950 text-xs font-black shadow-sm">
            <span className="bg-blue-600 px-1 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
              BR
            </span>
            <span className="px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-widest text-foreground">
              {plate}
            </span>
          </div>
        </div>

        {/* Model and Brand */}
        <div className="mt-3">
          <h3 className="truncate text-base font-extrabold uppercase tracking-tight text-foreground">
            {modelText}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {vehicle.year && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3 text-muted-foreground/70" />
                {vehicle.year}
              </span>
            )}
            {vehicle.year && vehicle.color && <span>•</span>}
            {vehicle.color && (
              <span className="inline-flex items-center gap-1">
                <Palette className="size-3 text-muted-foreground/70" />
                {vehicle.color}
              </span>
            )}
          </div>
        </div>

        {/* Pilot info (if present or in admin mode) */}
        {vehicle.rider?.name && (
          <div className="mt-3 flex items-center gap-1.5 rounded border border-border/50 bg-secondary/50 px-2 py-1 text-[11px] text-muted-foreground">
            <User className="size-3 shrink-0 text-primary" />
            <span className="truncate">
              Piloto: <b className="text-foreground">{vehicle.rider.name}</b>
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Quick CTA to monitor / dashboard */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isAdmin ? "Frota conectada" : "Veículo monitorado"}
        </span>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
        >
          <span>Painel</span>
          <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
