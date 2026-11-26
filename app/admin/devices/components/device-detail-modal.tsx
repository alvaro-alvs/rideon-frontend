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
  Cpu,
  Eye,
  History,
  Link2,
  Mail,
  MapPin,
  Phone,
  Radio,
  Unlink,
  User,
  X,
} from "lucide-react";

import { formatVehicleDisplayName } from "@/lib/vehicle-display";
import type { Device } from "@/lib/types/device";

interface DeviceDetailModalProps {
  device: Device | null;
  onClose: () => void;
  onOpenMap: (device: Device) => void;
  onOpenLink: (device: Device) => void;
  onUnlink: (device: Device) => void;
  onOpenTransfer?: (device: Device) => void;
  onOpenAudit: (device: Device) => void;
  canManageTransfers?: boolean;
  showManager?: boolean;
}

export function DeviceDetailModal({
  device,
  onClose,
  onOpenMap,
  onOpenLink,
  onUnlink,
  onOpenTransfer,
  onOpenAudit,
  canManageTransfers = false,
  showManager = false,
}: DeviceDetailModalProps) {
  const [copiedImei, setCopiedImei] = useState(false);

  if (!device) return null;

  const hasLastPosition = Boolean(device.last_position);
  const position = device.last_position;
  const moto = device.motorcycle;
  const isLinked = Boolean(moto);
  const lastActivity = device.last_seen_at || position?.timestamp;

  const statusLabel = hasLastPosition
    ? "Online"
    : device.status === "standby"
      ? "Standby"
      : "Sem sinal";

  const handleCopyImei = () => {
    if (!device.serial_number || device.serial_number === "—") return;
    void navigator.clipboard.writeText(device.serial_number);
    setCopiedImei(true);
    setTimeout(() => setCopiedImei(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
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
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  isLinked
                    ? "border-blue-500/25 bg-blue-500/10 text-blue-400"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                }`}
              >
                {isLinked ? "Vinculado" : "Estoque"}
              </span>

              {device.discovered_via_broker && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-sky-400">
                  <Radio className="size-2.5" />
                  Broker
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-primary shrink-0" />
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-foreground">
                {device.serial_number}
              </span>
              {device.serial_number !== "—" && (
                <button
                  type="button"
                  onClick={handleCopyImei}
                  className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Copiar IMEI"
                >
                  {copiedImei ? (
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {lastActivity && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Clock className="size-3" />
                  Último sinal:{" "}
                  {new Date(lastActivity).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {device.protocol && (
                <span className="font-mono uppercase">
                  Protocolo: {device.protocol}
                </span>
              )}
              {device.firmware_version && (
                <span className="font-mono">FW: {device.firmware_version}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Manager Info (Admin Global) */}
          {showManager && (
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-xs">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4 text-violet-400" />
                Gerente responsável
              </span>
              <span className="font-medium text-foreground">
                {device.manager_email || "Exclusivo Admin (Sem gerente)"}
              </span>
            </div>
          )}

          {/* Vehicle Details & Linking */}
          <section className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Bike className="size-4 text-primary" />
                Detalhes do Veículo & Vínculo
              </h3>

              {moto && (
                <div className="inline-flex items-center overflow-hidden rounded-md border border-blue-500/60 bg-neutral-950 text-xs font-extrabold">
                  <span className="bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase">
                    BR
                  </span>
                  <span className="px-2 py-0.5 tracking-wider text-foreground font-mono">
                    {moto.license_plate}
                  </span>
                </div>
              )}
            </div>

            {moto ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Modelo
                    </span>
                    <p className="font-semibold text-foreground">
                      {formatVehicleDisplayName(moto)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Ano / Cor
                    </span>
                    <p className="font-semibold text-foreground">
                      {moto.year} · {moto.color}
                    </p>
                  </div>
                  {moto.chassis && (
                    <div className="col-span-2">
                      <span className="text-[11px] text-muted-foreground">
                        Chassi
                      </span>
                      <p className="font-mono text-xs text-foreground">
                        {moto.chassis}
                      </p>
                    </div>
                  )}
                </div>

                {moto.rider && (
                  <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <User className="size-3.5 text-emerald-400" />
                      <span>{moto.rider.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      {moto.rider.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" />
                          {moto.rider.phone}
                        </span>
                      )}
                      {moto.rider.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3" />
                          {moto.rider.email}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLink(device);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    <Link2 className="size-3.5 text-primary" />
                    <span>Alterar Vínculo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onUnlink(device);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Unlink className="size-3.5" />
                    <span>Desvincular</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  Equipamento disponível em estoque, sem veículo vinculado.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLink(device);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Link2 className="size-3.5" />
                  <span>Vincular Veículo</span>
                </button>
              </div>
            )}
          </section>

          {/* Location & Telemetry Data */}
          <section className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="size-4 text-primary" />
                Dados de Localização
              </h3>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMap(device);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  hasLastPosition
                    ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary hover:text-white"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="size-3.5" />
                <span>Abrir Mapa</span>
              </button>
            </div>

            {position ? (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Coordenadas
                    </span>
                    <p className="font-mono font-semibold text-foreground">
                      {position.latitude.toFixed(5)},{" "}
                      {position.longitude.toFixed(5)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Velocidade
                    </span>
                    <p className="inline-flex items-center gap-1 font-bold text-primary">
                      <Activity className="size-3.5" />
                      {position.speed !== undefined
                        ? `${position.speed} km/h`
                        : "0 km/h"}
                    </p>
                  </div>
                </div>

                {position.address && (
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Endereço aproximado
                    </span>
                    <p className="text-foreground">{position.address}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono">
                  {position.timestamp && (
                    <span>
                      Atualizado:{" "}
                      {new Date(position.timestamp).toLocaleString("pt-BR")}
                    </span>
                  )}
                  {position.accuracy !== undefined && (
                    <span>Precisão: {position.accuracy}m</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Nenhuma coordenada GPS recebida recentemente.
              </p>
            )}
          </section>

          {/* Audit & Transfer Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAudit(device);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground hover:border-primary transition-colors cursor-pointer"
              >
                <History className="size-3.5 text-emerald-400" />
                <span>Auditoria</span>
              </button>

              {canManageTransfers && onOpenTransfer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTransfer(device);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3.5 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="size-3.5" />
                  <span>Transferir Gerente</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
