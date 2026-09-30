"use client";

import { useState } from "react";
import {
  Activity,
  Bike,
  CheckCircle2,
  Copy,
  Cpu,
  Eye,
  Link2,
  MapPin,
  User,
} from "lucide-react";

import type { Device } from "@/lib/types/device";

interface DeviceCardProps {
  device: Device;
  onOpenMap: (device: Device) => void;
  onOpenLink?: (device: Device) => void;
}

export function DeviceCard({ device, onOpenMap, onOpenLink }: DeviceCardProps) {
  const [copied, setCopied] = useState(false);

  const hasLastPosition = Boolean(device.last_position);
  const position = device.last_position;
  const moto = device.motorcycle;

  const isJ16 =
    !device.protocol ||
    device.protocol.toUpperCase() === "GT06" ||
    device.protocol.toUpperCase().includes("J16");

  const handleCopyImei = () => {
    if (!device.serial_number || device.serial_number === "—") return;
    void navigator.clipboard.writeText(device.serial_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 transition-all duration-300 hover:shadow-2xl ${
        hasLastPosition
          ? "border-border/80 bg-gradient-to-br from-card via-card/90 to-secondary/40 hover:border-emerald-500/50 hover:shadow-emerald-950/20"
          : "border-border/60 bg-gradient-to-br from-card/70 via-card/50 to-secondary/20 opacity-90 hover:border-border hover:opacity-100"
      }`}
    >
      {/* Top ambient glow on hover */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 size-36 rounded-full blur-2xl transition-opacity duration-300 ${
          hasLastPosition
            ? "bg-emerald-500/15 group-hover:opacity-100 opacity-60"
            : "bg-primary/10 group-hover:opacity-100 opacity-30"
        }`}
      />

      <div className="space-y-4">
        {/* Card Header: Device Model + Simulated LED Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-inner ${
                hasLastPosition
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border/80 bg-secondary text-muted-foreground"
              }`}
            >
              <Cpu className="size-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                  {isJ16 ? "J16 4G Tracker" : "Rastreador GPS"}
                </span>
                {isJ16 && (
                  <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-black uppercase text-primary border border-primary/20">
                    J16
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                {device.firmware_version || "J16-FW-2.4"}
              </p>
            </div>
          </div>

          {/* Simulated LED status */}
          <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 backdrop-blur-sm">
            {/* GPS Fix LED */}
            <span
              title={hasLastPosition ? "GPS Conectado" : "GPS em Busca"}
              className={`size-2 rounded-full ${
                hasLastPosition
                  ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                  : "bg-neutral-600"
              }`}
            />
            {/* GSM LED */}
            <span
              title="GSM 4G Online"
              className={`size-2 rounded-full ${
                device.status === "active"
                  ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                  : "bg-neutral-600"
              }`}
            />
            {/* Power LED */}
            <span
              title="Alimentação DC 9-90V"
              className="size-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,37,27,0.8)]"
            />
          </div>
        </div>

        {/* IMEI / Serial Bar with 1-click Copy */}
        <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-secondary/70 px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              IMEI / Número Serial
            </span>
            <p className="font-mono text-xs sm:text-sm font-bold tracking-wider text-foreground truncate">
              {device.serial_number}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {device.protocol && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-primary border border-primary/20">
                {device.protocol}
              </span>
            )}
            {device.serial_number !== "—" && (
              <button
                type="button"
                onClick={handleCopyImei}
                className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
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
        </div>

        {/* Associated Motorcycle Box with Link Action */}
        <div className="rounded-2xl border border-border/60 bg-background/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <Bike className="size-3.5 text-primary" />
              Veículo Vinculado
            </span>

            {moto ? (
              <span className="text-[10px] text-muted-foreground font-mono">
                {moto.year} • {moto.color}
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400 border border-amber-500/20">
                Estoque (Standby)
              </span>
            )}
          </div>

          {moto ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                {/* Mercosul Badge */}
                <div className="inline-flex shrink-0 items-center overflow-hidden rounded-lg border border-blue-500/60 bg-neutral-950 text-xs font-extrabold shadow-sm">
                  <span className="bg-blue-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase">
                    BR
                  </span>
                  <span className="px-2 py-0.5 tracking-wider text-foreground font-mono">
                    {moto.license_plate}
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-right">
                  <p className="text-xs font-bold text-foreground truncate">
                    {moto.brand} {moto.model}
                  </p>
                  {moto.rider?.name && (
                    <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1 truncate">
                      <User className="size-3 text-primary shrink-0" />
                      <span className="truncate">{moto.rider.name}</span>
                    </p>
                  )}
                </div>
              </div>

              {onOpenLink && (
                <div className="flex justify-end pt-1 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => onOpenLink(device)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    <Link2 className="size-3" />
                    <span>Gerenciar / Alterar Vínculo</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 text-xs">
              <span className="italic text-[11px] text-muted-foreground">
                Nenhuma motocicleta vinculada
              </span>
              {onOpenLink && (
                <button
                  type="button"
                  onClick={() => onOpenLink(device)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 border border-primary/30 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  <Link2 className="size-3.5" />
                  <span>Vincular a Moto</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Telemetry / Last Location Box */}
        <div className="rounded-2xl border border-border/60 bg-background/50 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-3.5 text-primary" />
              Última Posição GPS
            </span>

            {hasLastPosition ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {position?.timestamp
                  ? formatRelativeTime(position.timestamp)
                  : "Online"}
              </span>
            ) : (
              <span className="text-[10px] text-neutral-500">Sem sinal</span>
            )}
          </div>

          {position ? (
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="font-mono text-[11px] text-foreground">
                {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
              </span>

              <span className="flex items-center gap-1 text-[11px] font-bold text-foreground bg-secondary/80 px-2 py-0.5 rounded-md">
                <Activity className="size-3 text-primary" />
                {position.speed ? `${position.speed} km/h` : "0 km/h"}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-neutral-500 italic">
              Aguardando primeira transmissão de coordenadas...
            </p>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              device.status === "active"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-neutral-800 text-neutral-400 border border-neutral-700"
            }`}
          >
            {device.status === "active" ? "Ativo" : "Inativo"}
          </span>

          {device.last_seen_at && (
            <span className="text-[10px] text-muted-foreground">
              Visto {formatRelativeTime(device.last_seen_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenLink && (
            <button
              type="button"
              onClick={() => onOpenLink(device)}
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer"
              title="Vincular ou gerenciar motocicleta"
            >
              <Link2 className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Vínculo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenMap(device)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              hasLastPosition
                ? "border-primary/50 bg-primary/10 text-primary hover:border-primary hover:bg-primary hover:text-white shadow-sm"
                : "border-border bg-secondary text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            <Eye className="size-3.5" />
            <span>Ver no Mapa</span>
          </button>
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
