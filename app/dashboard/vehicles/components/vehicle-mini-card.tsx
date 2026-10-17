"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bike,
  CalendarDays,
  ChevronRight,
  Cpu,
  Info,
  MapPin,
  MapPinOff,
  Radio,
  RadioOff,
  ShieldCheck,
  X,
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
  rider_name?: string;
  rider?: {
    name?: string;
    phone?: string;
  };
  device?: {
    id?: string;
    serial_number?: string;
    protocol?: string;
    firmware_version?: string;
    status?: string;
    last_communication?: string;
    last_seen_at?: string | null;
  } | null;
  has_position?: boolean;
  last_position?: {
    latitude: number;
    longitude: number;
    speed?: number;
    timestamp: string;
  } | null;
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

  // Verificação de rastreador e posição reportada
  const hasDevice = Boolean(
    vehicle.device && (vehicle.device.serial_number || vehicle.device.id),
  );

  const [asyncCheck, setAsyncCheck] = useState<{
    vehicleId: string;
    hasPosition: boolean;
    data: { latitude: number; longitude: number; speed?: number; timestamp: string } | null;
  } | null>(null);

  const [showUnlinkedInfo, setShowUnlinkedInfo] = useState(false);

  // Deriva o status de verificação sob demanda
  const isVerifying = Boolean(
    hasDevice &&
      vehicle.id &&
      vehicle.has_position === undefined &&
      !vehicle.last_position &&
      (!asyncCheck || asyncCheck.vehicleId !== vehicle.id),
  );

  // Deriva o status de posição das props diretamente ou da verificação assíncrona
  const hasReportedPosition: boolean =
    vehicle.has_position !== undefined
      ? Boolean(vehicle.has_position)
      : vehicle.last_position
      ? true
      : asyncCheck && asyncCheck.vehicleId === vehicle.id
      ? asyncCheck.hasPosition
      : false;

  const lastPositionData =
    vehicle.last_position ??
    (asyncCheck && asyncCheck.vehicleId === vehicle.id ? asyncCheck.data : null);

  // Verificação básica sob demanda se o veículo tem rastreador mas não trouxe posição prévia
  useEffect(() => {
    if (vehicle.has_position !== undefined || vehicle.last_position) {
      return;
    }

    if (!hasDevice || !vehicle.id) {
      return;
    }

    let active = true;

    fetch(`/api/motorcycles/${vehicle.id}/location`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && data.position && typeof data.position.latitude === "number") {
          setAsyncCheck({
            vehicleId: vehicle.id ?? "",
            hasPosition: true,
            data: {
              latitude: data.position.latitude,
              longitude: data.position.longitude,
              speed: data.motion?.speed,
              timestamp: data.timestamp || new Date().toISOString(),
            },
          });
        } else {
          setAsyncCheck({
            vehicleId: vehicle.id ?? "",
            hasPosition: false,
            data: null,
          });
        }
      })
      .catch(() => {
        if (active) {
          setAsyncCheck({
            vehicleId: vehicle.id ?? "",
            hasPosition: false,
            data: null,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [vehicle.id, vehicle.has_position, vehicle.last_position, hasDevice]);

  const getInitials = (name?: string) => {
    if (!name) return "P";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const deviceProtocolName = vehicle.device?.protocol
    ? `${vehicle.device.protocol.toUpperCase()} GPS`
    : "Rastreador GPS";

  const maskedSerial = vehicle.device?.serial_number
    ? vehicle.device.serial_number.length > 8
      ? `•••${vehicle.device.serial_number.slice(-6)}`
      : vehicle.device.serial_number
    : null;

  return (
    <>
      <article
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${
          hasDevice && hasReportedPosition
            ? "border-border/80 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/10"
            : hasDevice
            ? "border-border/70 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10"
            : "border-border/60 hover:border-zinc-500/50 hover:shadow-xl opacity-95"
        }`}
      >
        {/* Top Accent Gradient Line */}
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
            hasDevice && hasReportedPosition
              ? "from-transparent via-emerald-500 to-transparent"
              : hasDevice
              ? "from-transparent via-amber-500 to-transparent"
              : "from-transparent via-zinc-600 to-transparent"
          }`}
        />

        {/* Subtle Background Glow on Hover */}
        <div
          className={`pointer-events-none absolute -right-12 -top-12 size-36 rounded-full blur-2xl transition-all duration-300 ${
            hasDevice && hasReportedPosition
              ? "bg-emerald-500/5 group-hover:bg-emerald-500/15"
              : hasDevice
              ? "bg-amber-500/5 group-hover:bg-amber-500/15"
              : "bg-zinc-700/5 group-hover:bg-zinc-700/15"
          }`}
        />

        <div>
          {/* Top Header Row: Icon/Beacon + Mercosul Plate */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-secondary/80 text-foreground shadow-inner transition-colors duration-300 group-hover:border-primary/40">
                <Bike className="size-5" />

                {/* Status Beacon - honesto e contextual */}
                {hasDevice && hasReportedPosition ? (
                  <span className="absolute -bottom-1 -right-1 flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-emerald-500" />
                  </span>
                ) : hasDevice ? (
                  <span className="absolute -bottom-1 -right-1 flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-amber-500" />
                  </span>
                ) : (
                  <span
                    className="absolute -bottom-1 -right-1 flex size-3"
                    title="Sem rastreador vinculado"
                  >
                    <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-zinc-600" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                {hasDevice && hasReportedPosition ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="size-3" />
                    Protegido 24h
                  </span>
                ) : hasDevice ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                    <Radio className="size-3 animate-pulse" />
                    {isVerifying ? "Verificando GPS..." : "GPS em Busca"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 border border-zinc-700/50">
                    <AlertTriangle className="size-3 text-amber-400" />
                    Aguardando Rastreador
                  </span>
                )}
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

          {/* Equipment Status & Hardware Information Box */}
          {hasDevice ? (
            <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs backdrop-blur-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Cpu className="size-3.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {deviceProtocolName}
                  </p>
                  {maskedSerial && (
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      Serial: {maskedSerial}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                    hasReportedPosition
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {hasReportedPosition ? "Posição Ativa" : "Sem Sinal GPS"}
                </span>
                {lastPositionData?.speed !== undefined && hasReportedPosition && (
                  <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                    {Math.round(lastPositionData.speed)} km/h
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-dashed border-amber-500/25 bg-amber-500/5 p-2.5 text-xs">
              <RadioOff className="size-3.5 shrink-0 text-amber-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-amber-300">
                  Sem rastreador vinculado
                </p>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Aguardando associação de equipamento pelo administrador.
                </p>
              </div>
            </div>
          )}

          {/* Pilot Info Box (if present or in admin mode) */}
          {(vehicle.rider?.name || vehicle.rider_name) && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-2.5 text-xs backdrop-blur-sm">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 font-bold text-primary text-[10px] border border-primary/20">
                {getInitials(vehicle.rider?.name || vehicle.rider_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">
                  {vehicle.rider?.name || vehicle.rider_name}
                </p>
                {vehicle.rider?.phone && (
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
          {/* Status Label */}
          {hasDevice && hasReportedPosition ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <Radio className="size-3 text-emerald-400 animate-pulse" />
              <span>{isAdmin ? "Frota RideOn" : "GPS Conectado"}</span>
            </span>
          ) : hasDevice ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <Radio className="size-3 text-amber-400 animate-pulse" />
              <span>{isVerifying ? "Verificando..." : "GPS em Busca"}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              <RadioOff className="size-3 text-muted-foreground/50" />
              <span>Sem GPS Vinculado</span>
            </span>
          )}

          {/* Action Button */}
          {hasDevice && hasReportedPosition ? (
            onOpenTelemetry ? (
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
            )
          ) : hasDevice ? (
            onOpenTelemetry ? (
              <button
                type="button"
                onClick={() => onOpenTelemetry(vehicle)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 transition-all duration-200 hover:bg-amber-500 hover:text-black"
                title="Rastreador vinculado, aguardando fix de coordenadas"
              >
                <MapPin className="size-3.5" />
                <span>Verificar Sinal</span>
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 transition-all duration-200 hover:bg-amber-500 hover:text-black"
              >
                <span>Verificar</span>
                <ChevronRight className="size-3.5" />
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowUnlinkedInfo(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all duration-200 hover:border-amber-500/40 hover:bg-secondary hover:text-foreground"
              title="Clique para saber como vincular um rastreador"
            >
              <Info className="size-3.5 text-amber-400" />
              <span>Sem Vínculo</span>
            </button>
          )}
        </div>
      </article>

      {/* Modal explicativo quando clica em 'Sem Vínculo' */}
      {showUnlinkedInfo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowUnlinkedInfo(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowUnlinkedInfo(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                <MapPinOff className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Aguardando Rastreador GPS
                </h3>
                <p className="text-xs text-muted-foreground">
                  {modelText} • {vehicle.license_plate || "Sem Placa"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 text-xs text-muted-foreground space-y-2">
              <p>
                Esta motocicleta está cadastrada no sistema, mas ainda <strong>não possui nenhum equipamento rastreador (IMEI) vinculado</strong>.
              </p>
              <p>
                Assim que a equipe técnica ou o administrador realizar a instalação e associação do dispositivo, o status mudará automaticamente para <strong>Protegido 24h</strong> e o monitoramento ao vivo estará disponível.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowUnlinkedInfo(false)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
