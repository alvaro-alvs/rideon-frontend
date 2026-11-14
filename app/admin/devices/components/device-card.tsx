"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  Bike,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Eye,
  History,
  Info,
  Link2,
  MapPin,
  Radio,
  Shield,
  Unlink,
  User,
} from "lucide-react";

import type { Device } from "@/lib/types/device";

interface DeviceCardProps {
  device: Device;
  onOpenMap: (device: Device) => void;
  onOpenLink?: (device: Device) => void;
  onUnlink?: (device: Device) => void;
  onOpenTransfer?: (device: Device) => void;
  onOpenAudit?: (device: Device) => void;
  canManageTransfers?: boolean;
}

export function DeviceCard({
  device,
  onOpenMap,
  onOpenLink,
  onUnlink,
  onOpenTransfer,
  onOpenAudit,
  canManageTransfers = false,
}: DeviceCardProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const hasLastPosition = Boolean(device.last_position);
  const position = device.last_position;
  const moto = device.motorcycle;
  const isLinked = Boolean(moto);

  const isJ16 =
    !device.protocol || device.protocol.toUpperCase().includes("J16");

  const handleCopyImei = () => {
    if (!device.serial_number || device.serial_number === "—") return;
    void navigator.clipboard.writeText(device.serial_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${isLinked
          ? "border-emerald-500/45 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black shadow-[0_10px_30px_-15px_rgba(16,185,129,0.28)] hover:border-emerald-400/70"
          : "border-border/70 bg-gradient-to-b from-card/95 via-neutral-950/95 to-black/95 opacity-95 hover:border-amber-500/40 hover:opacity-100"
        }`}
    >
      {/* Top J16 Hardware Chassis Accent Bar */}
      <div
        className={`h-1 w-full ${isLinked
            ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"
            : "bg-gradient-to-r from-neutral-700 via-amber-500/50 to-neutral-700"
          }`}
      />

      {/* Subtle Hardware Side Ribs (J16 Tracker Aesthetic) */}
      <div className="pointer-events-none absolute inset-y-8 left-0 flex flex-col justify-center gap-1 opacity-25">
        <span className="h-3 w-0.5 rounded-r bg-neutral-400" />
        <span className="h-3 w-0.5 rounded-r bg-neutral-400" />
        <span className="h-3 w-0.5 rounded-r bg-neutral-400" />
      </div>
      <div className="pointer-events-none absolute inset-y-8 right-0 flex flex-col justify-center gap-1 opacity-25">
        <span className="h-3 w-0.5 rounded-l bg-neutral-400" />
        <span className="h-3 w-0.5 rounded-l bg-neutral-400" />
        <span className="h-3 w-0.5 rounded-l bg-neutral-400" />
      </div>

      <div className="p-4 space-y-3">
        {/* Header: J16 Model Identity + Hardware LEDs */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${isLinked
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border/80 bg-secondary/80 text-muted-foreground"
                }`}
            >
              <Cpu className="size-4.5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                  {isJ16 ? "J16 4G" : "Tracker"}
                </span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider border ${isLinked
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                    }`}
                >
                  {isLinked ? "Vinculado" : "Em Estoque"}
                </span>
                {device.discovered_via_broker && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded bg-sky-500/10 px-1.5 py-0.2 text-[9px] font-bold uppercase text-sky-400 border border-sky-500/25"
                    title="Descoberto via Broker"
                  >
                    <Radio className="size-2.5" />
                    Broker
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                {device.firmware_version || "J16-4G"}
                {device.last_seen_at || position?.timestamp
                  ? ` · ${formatRelativeTime(device.last_seen_at || position?.timestamp || "")}`
                  : ""}
              </p>
            </div>
          </div>

          {/* J16 Physical LEDs: GPS (Green), GSM (Amber), PWR (Red) */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2 py-1 shrink-0"
            title="LEDs do Rastreador: GPS / GSM / Energia"
          >
            <span
              title={hasLastPosition ? "GPS Fixado" : "GPS sem sinal"}
              className={`size-2 rounded-full ${hasLastPosition
                  ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                  : "bg-neutral-700"
                }`}
            />
            <span
              title={
                device.status === "active"
                  ? "GSM 4G Ativo"
                  : "GSM em Standby/Inativo"
              }
              className={`size-2 rounded-full ${device.status === "active"
                  ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.85)]"
                  : "bg-neutral-700"
                }`}
            />
            <span
              title="Alimentação DC 9-90V"
              className="size-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
            />
          </div>
        </div>

        {/* J16 Hardware Label Plate: IMEI + Status */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-neutral-900/90 px-3 py-2 shadow-inner">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                IMEI
              </span>
              <span
                className={`rounded-full px-1.5 py-0 text-[8px] font-black uppercase tracking-wider ${device.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : device.status === "standby"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
              >
                {device.status === "active"
                  ? "Ativo"
                  : device.status === "standby"
                    ? "Standby"
                    : "Inativo"}
              </span>
            </div>
            <p className="font-mono text-xs sm:text-sm font-bold tracking-wider text-foreground truncate">
              {device.serial_number}
            </p>
          </div>

          {device.serial_number !== "—" && (
            <button
              type="button"
              onClick={handleCopyImei}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
              title="Copiar IMEI"
            >
              {copied ? (
                <CheckCircle2 className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Vehicle Binding Section (Differentiated when linked vs unlinked) */}
        {moto ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              {/* Mercosul Plate */}
              <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-blue-500/60 bg-neutral-950 text-[11px] font-extrabold shadow-sm">
                <span className="bg-blue-600 px-1 py-0.5 text-[8px] font-black text-white uppercase">
                  BR
                </span>
                <span className="px-1.5 py-0.5 tracking-wider text-foreground font-mono">
                  {moto.license_plate}
                </span>
              </div>

              <div className="min-w-0 flex-1 text-right">
                <p className="text-xs font-bold text-foreground truncate">
                  {moto.brand} {moto.model}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {moto.rider?.name ? (
                    <span className="inline-flex items-center gap-1">
                      <User className="size-2.5 text-emerald-400" />
                      {moto.rider.name}
                    </span>
                  ) : (
                    <span>
                      {moto.year} • {moto.color}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {(onUnlink || onOpenLink) && (
              <div className="flex items-center justify-between border-t border-emerald-500/15 pt-1.5">
                {onUnlink ? (
                  <button
                    type="button"
                    onClick={() => onUnlink(device)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400/90 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <Unlink className="size-2.5" />
                    <span>Desvincular</span>
                  </button>
                ) : (
                  <span />
                )}
                {onOpenLink && (
                  <button
                    type="button"
                    onClick={() => onOpenLink(device)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Link2 className="size-2.5" />
                    <span>Alterar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border/70 bg-background/30 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Bike className="size-3.5 text-neutral-500" />
              Sem veículo vinculado
            </span>
            {onOpenLink && (
              <button
                type="button"
                onClick={() => onOpenLink(device)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-all cursor-pointer"
              >
                <Link2 className="size-3" />
                <span>Vincular</span>
              </button>
            )}
          </div>
        )}

        {/* Expandable Details (Coordinates & Telemetry only shown when clicked) */}
        {showDetails && (
          <div className="rounded-xl border border-border/70 bg-black/50 p-3 space-y-2 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <MapPin className="size-3 text-primary" />
                Coordenadas GPS
              </span>
              {hasLastPosition ? (
                <span className="font-mono font-semibold text-foreground">
                  {position!.latitude.toFixed(5)}, {position!.longitude.toFixed(5)}
                </span>
              ) : (
                <span className="italic text-neutral-500">Sem coordenadas</span>
              )}
            </div>

            {position && (
              <div className="flex items-center justify-between border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="size-3 text-primary" />
                  Velocidade:{" "}
                  <b className="text-foreground">
                    {position.speed ? `${position.speed} km/h` : "0 km/h"}
                  </b>
                </span>
                {position.timestamp && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="size-3 text-primary/80" />
                    {formatFullDateTime(position.timestamp)}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground">
              <span className="font-mono">
                {device.protocol || "J16"}
                {device.last_source_ip ? ` · IP ${device.last_source_ip}` : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Compact Card Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-black/40 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Info className="size-3.5 text-primary" />
          <span>{showDetails ? "Ocultar info" : "Mais info"}</span>
          <ChevronDown
            className={`size-3.5 transition-transform duration-200 ${showDetails ? "rotate-180" : ""
              }`}
          />
        </button>

        <div className="flex items-center gap-1.5">
          {onOpenAudit && (
            <button
              type="button"
              onClick={() => onOpenAudit(device)}
              className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-secondary/80 text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
              title="Auditoria de comunicações"
            >
              <History className="size-3.5" />
            </button>
          )}

          {canManageTransfers && onOpenTransfer && (
            <button
              type="button"
              onClick={() => onOpenTransfer(device)}
              className="flex size-7 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors cursor-pointer"
              title="Transferir para Tenant Manager"
            >
              <ArrowRightLeft className="size-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenMap(device)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${hasLastPosition
                ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary hover:text-white"
                : "border-border/70 bg-secondary/80 text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            title="Ver posição no mapa"
          >
            <Eye className="size-3.5" />
            <span>Mapa</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function formatFullDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffSeconds = Math.round(
      (Date.now() - new Date(isoString).getTime()) / 1000,
    );
    if (diffSeconds < 60) return `Há ${Math.max(1, diffSeconds)}s`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `Há ${diffMinutes} min`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return new Date(isoString).toLocaleDateString("pt-BR");
  } catch {
    return "Recente";
  }
}
