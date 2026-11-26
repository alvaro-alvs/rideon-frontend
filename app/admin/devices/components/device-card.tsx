"use client";

import { useState } from "react";
import {
  Bike,
  CheckCircle2,
  Clock,
  Copy,
  Maximize2,
  Radio,
} from "lucide-react";

import type { Device } from "@/lib/types/device";

interface DeviceCardProps {
  device: Device;
  onOpenDetail: (device: Device) => void;
}

export function DeviceCard({ device, onOpenDetail }: DeviceCardProps) {
  const [copied, setCopied] = useState(false);

  const hasLastPosition = Boolean(device.last_position);
  const moto = device.motorcycle;
  const isLinked = Boolean(moto);

  const handleCopyImei = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const lastActivity = device.last_seen_at || device.last_position?.timestamp;

  return (
    <article
      onClick={() => onOpenDetail(device)}
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card/90 backdrop-blur-md transition-all duration-200 cursor-pointer ${
        hasLastPosition
          ? "border-emerald-500/35 hover:border-emerald-400/70"
          : "border-border/70 hover:border-primary/40"
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Top Row: Status + Linked/Stock + Relative Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
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
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
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

        {/* Inline Plate Only + Expand Action */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {isLinked && moto ? (
            <div className="inline-flex items-center overflow-hidden rounded-md border border-blue-500/60 bg-neutral-950 text-[11px] font-extrabold">
              <span className="bg-blue-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase">
                BR
              </span>
              <span className="px-2 py-0.5 tracking-wider text-foreground font-mono">
                {moto.license_plate}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-400 border border-amber-500/20">
              <Bike className="size-3" />
              Estoque
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            <Maximize2 className="size-3" />
            Detalhes
          </span>
        </div>
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
