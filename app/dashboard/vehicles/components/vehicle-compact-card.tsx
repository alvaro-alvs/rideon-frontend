"use client";

import { Maximize2, Radio, ShieldCheck, UserRound } from "lucide-react";

import { formatVehicleDisplayName } from "@/lib/vehicle-display";
import { VehiclePlatePreview } from "./vehicle-plate-preview";
import type { VehicleCardData } from "./vehicle-mini-card";

interface VehicleCompactCardProps {
  vehicle: VehicleCardData;
  onOpenDetail: (vehicle: VehicleCardData) => void;
}

export function VehicleCompactCard({
  vehicle,
  onOpenDetail,
}: VehicleCompactCardProps) {
  const hasDevice = Boolean(
    vehicle.device && (vehicle.device.serial_number || vehicle.device.id),
  );
  const hasGps = Boolean(
    hasDevice && (vehicle.has_position || vehicle.last_position),
  );
  const riderName = vehicle.rider?.name || vehicle.rider_name;

  return (
    <article
      onClick={() => onOpenDetail(vehicle)}
      className={`group flex flex-col justify-between rounded-2xl border bg-card/90 p-4 backdrop-blur-md transition-all duration-200 cursor-pointer ${
        hasGps
          ? "border-emerald-500/35 hover:border-emerald-400/70"
          : "border-border/70 hover:border-primary/40"
      }`}
    >
      <div className="space-y-3">
        {/* Top Row: Status + Plate */}
        <div className="flex items-center justify-between gap-2">
          {hasGps ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="size-3" />
              GPS Ativo
            </span>
          ) : hasDevice ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <Radio className="size-3" />
              Aguardando
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sem Rastreador
            </span>
          )}

          {vehicle.license_plate && (
            <VehiclePlatePreview plate={vehicle.license_plate} size="sm" />
          )}
        </div>

        {/* Model */}
        <div>
          <h3 className="text-sm font-bold text-foreground truncate">
            {formatVehicleDisplayName(vehicle)}
          </h3>
          {riderName && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground truncate max-w-full">
              <UserRound className="size-3 text-primary shrink-0" />
              <span className="truncate">{riderName}</span>
            </p>
          )}
        </div>

        {/* Footer Trigger */}
        <div className="flex items-center justify-between border-t border-border/40 pt-2.5 text-[11px]">
          <span className="font-mono text-muted-foreground truncate">
            {vehicle.device?.serial_number
              ? `IMEI •••${vehicle.device.serial_number.slice(-6)}`
              : "Sem IMEI"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground group-hover:text-primary transition-colors shrink-0">
            <Maximize2 className="size-3" />
            Detalhes
          </span>
        </div>
      </div>
    </article>
  );
}
