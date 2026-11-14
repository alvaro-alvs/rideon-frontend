"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  Bike,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  History,
  Link2,
  MapPin,
  Radio,
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
  showManager?: boolean;
}

export function DeviceCard({
  device,
  onOpenMap,
  onOpenLink,
  onUnlink,
  onOpenTransfer,
  onOpenAudit,
  canManageTransfers = false,
  showManager = false,
}: DeviceCardProps) {
  const [copied, setCopied] = useState(false);

  const hasLastPosition = Boolean(device.last_position);
  const position = device.last_position;
  const moto = device.motorcycle;
  const isLinked = Boolean(moto);

  const handleCopyImei = () => {
    if (!device.serial_number || device.serial_number === "—") return;
    void navigator.clipboard.writeText(device.serial_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel = hasLastPosition
    ? "Online"
    : device.status === "standby"
      ? "Standby"
      : "Sem sinal";

  const lastActivity = device.last_seen_at || position?.timestamp;

  return (
    <article
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card/90 backdrop-blur-md transition-all duration-200 ${
        hasLastPosition
          ? "border-emerald-500/40 shadow-[0_8px_24px_-14px_rgba(16,185,129,0.3)] hover:border-emerald-400/70"
          : isLinked
            ? "border-border/80 hover:border-primary/40"
            : "border-border/60 opacity-95 hover:border-amber-500/40 hover:opacity-100"
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Top Row: Status + Badges + Relative Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                hasLastPosition
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                  : device.status === "standby"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  hasLastPosition
                    ? "bg-emerald-400 animate-pulse"
                    : device.status === "standby"
                      ? "bg-amber-400"
                      : "bg-neutral-500"
                }`}
              />
              {statusLabel}
            </span>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                isLinked
                  ? "border-blue-500/25 bg-blue-500/10 text-blue-400"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-400"
              }`}
            >
              {isLinked ? "Vinculado" : "Estoque"}
            </span>

            {device.discovered_via_broker && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-400"
                title="Descoberto via Broker"
              >
                <Radio className="size-2.5" />
                Broker
              </span>
            )}
          </div>

          {lastActivity && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground shrink-0">
              <Clock className="size-2.5" />
              {formatRelativeTime(lastActivity)}
            </span>
          )}
        </div>

        {/* IMEI / Serial Row */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              IMEI / Serial
            </span>
            <p className="font-mono text-xs sm:text-sm font-bold tracking-wider text-foreground truncate">
              {device.serial_number}
            </p>
          </div>

          {device.serial_number !== "—" && (
            <button
              type="button"
              onClick={handleCopyImei}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
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

        {/* Manager Assignment (visible to Platform Admin) */}
        {showManager && (
          <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 truncate">
              <Building2 className="size-3 text-violet-400 shrink-0" />
              <span className="truncate font-medium text-foreground/85">
                {device.manager_email || "Exclusivo Admin (Sem gerente)"}
              </span>
            </span>
          </div>
        )}

        {/* Vehicle & Rider Unified Block */}
        {moto ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-blue-500/60 bg-neutral-950 text-[11px] font-extrabold">
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
                      {moto.year} · {moto.color}
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

        {/* Unified Telemetry Summary Line */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
          {position ? (
            <>
              <span className="inline-flex items-center gap-1 font-mono text-foreground/90 truncate">
                <MapPin className="size-3 text-primary shrink-0" />
                {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-primary shrink-0">
                <Activity className="size-3" />
                {position.speed ? `${position.speed} km/h` : "0 km/h"}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 italic text-neutral-500">
              <MapPin className="size-3 shrink-0" />
              Sem coordenadas recentes
            </span>
          )}
        </div>
      </div>

      {/* Compact Card Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-background/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {onOpenAudit && (
            <button
              type="button"
              onClick={() => onOpenAudit(device)}
              className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
              title="Auditoria de comunicações"
            >
              <History className="size-3" />
              <span>Auditoria</span>
            </button>
          )}

          {canManageTransfers && onOpenTransfer && (
            <button
              type="button"
              onClick={() => onOpenTransfer(device)}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300 hover:bg-violet-500/20 transition-colors cursor-pointer"
              title="Transferir para Gerente"
            >
              <ArrowRightLeft className="size-3" />
              <span>Transferir</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenMap(device)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            hasLastPosition
              ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary hover:text-white"
              : "border-border/70 bg-secondary/80 text-muted-foreground hover:border-primary hover:text-foreground"
          }`}
          title="Ver posição no mapa"
        >
          <Eye className="size-3.5" />
          <span>Mapa</span>
        </button>
      </div>
    </article>
  );
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
