"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bike,
  CheckCircle2,
  Copy,
  Cpu,
  ExternalLink,
  Link2,
  MapPin,
  Phone,
  Radio,
  ShieldCheck,
  Tag,
  Unlink,
  UserRound,
  X,
} from "lucide-react";

import {
  formatVehicleDisplayName,
  formatVehicleModel,
} from "@/lib/vehicle-display";
import { VehiclePlatePreview } from "./vehicle-plate-preview";
import { getColorHex } from "./brand-quick-select";
import type { VehicleCardData } from "./vehicle-mini-card";

interface VehicleDetailModalProps {
  vehicle: VehicleCardData | null;
  onClose: () => void;
  onOpenTelemetry: (vehicle: VehicleCardData) => void;
  onRenameNickname: (vehicle: VehicleCardData) => void;
  onUnlinkDevice?: (vehicle: VehicleCardData) => void;
}

export function VehicleDetailModal({
  vehicle,
  onClose,
  onOpenTelemetry,
  onRenameNickname,
  onUnlinkDevice,
}: VehicleDetailModalProps) {
  const [copiedSerial, setCopiedSerial] = useState(false);

  if (!vehicle) return null;

  const hasDevice = Boolean(
    vehicle.device && (vehicle.device.serial_number || vehicle.device.id),
  );
  const hasGps = Boolean(
    hasDevice && (vehicle.has_position || vehicle.last_position),
  );
  const hasNickname = Boolean(vehicle.nickname?.trim());
  const modelText = formatVehicleDisplayName(vehicle);
  const originalModelText = formatVehicleModel(vehicle);
  const colorHex = getColorHex(vehicle.color);
  const pos = vehicle.last_position;
  const riderName = vehicle.rider?.name || vehicle.rider_name;
  const riderPhone = vehicle.rider?.phone;

  const handleCopySerial = () => {
    const serial = vehicle.device?.serial_number;
    if (!serial) return;
    void navigator.clipboard.writeText(serial);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2000);
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
          <div className="min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {hasGps ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  GPS Ativo
                </span>
              ) : hasDevice ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  <Radio className="size-3" />
                  Aguardando Sinal
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sem Rastreador
                </span>
              )}

              {vehicle.license_plate && (
                <VehiclePlatePreview plate={vehicle.license_plate} size="sm" />
              )}
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {modelText}
              </h2>
              {hasNickname && (
                <p className="text-xs text-muted-foreground">
                  {originalModelText}
                </p>
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
          {/* Quick Management Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTelemetry(vehicle);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Activity className="size-3.5" />
              <span>Monitorar / Telemetria</span>
            </button>

            {vehicle.id && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRenameNickname(vehicle);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <Tag className="size-3.5" />
                <span>{hasNickname ? "Editar Apelido" : "Definir Apelido"}</span>
              </button>
            )}

            <Link
              href="/admin/vehicles"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3.5" />
              <span>Controle de Frota</span>
            </Link>
          </div>

          {/* Vehicle Specs */}
          <section className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Bike className="size-4 text-primary" />
              Detalhes do Veículo
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-muted-foreground">Marca</span>
                <p className="font-semibold text-foreground">
                  {vehicle.brand || "—"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Modelo</span>
                <p className="font-semibold text-foreground">
                  {vehicle.model || "—"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Ano</span>
                <p className="font-semibold text-foreground">
                  {vehicle.year || "—"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Cor</span>
                <p className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  {vehicle.color && (
                    <span
                      className="size-2.5 rounded-full ring-1 ring-border"
                      style={{ backgroundColor: colorHex }}
                    />
                  )}
                  {vehicle.color || "—"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Status</span>
                <p className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  {vehicle.status || "Ativo"}
                </p>
              </div>
            </div>
          </section>

          {/* Rider Info */}
          <section className="space-y-2.5 rounded-xl border border-border/60 bg-background/40 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <UserRound className="size-4 text-primary" />
              Condutor / Piloto
            </h3>

            {riderName ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-foreground">
                  {riderName}
                </span>
                {riderPhone && (
                  <a
                    href={`tel:${riderPhone.replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-secondary/70 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary transition-colors"
                  >
                    <Phone className="size-3 text-emerald-400" />
                    {riderPhone}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Nenhum condutor associado.
              </p>
            )}
          </section>

          {/* Tracker & Location Data */}
          <section className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Cpu className="size-4 text-primary" />
                Rastreador & Localização
              </h3>

              {hasDevice && onUnlinkDevice ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUnlinkDevice(vehicle);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  <Unlink className="size-3" />
                  <span>Desvincular</span>
                </button>
              ) : !hasDevice ? (
                <Link
                  href="/admin/devices"
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  <Link2 className="size-3" />
                  <span>Vincular IMEI</span>
                </Link>
              ) : null}
            </div>

            {hasDevice && vehicle.device ? (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/60 px-3 py-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      IMEI / Serial
                    </span>
                    <p className="font-mono font-bold text-foreground">
                      {vehicle.device.serial_number || "—"}
                    </p>
                  </div>
                  {vehicle.device.serial_number && (
                    <button
                      type="button"
                      onClick={handleCopySerial}
                      className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copiar IMEI"
                    >
                      {copiedSerial ? (
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {pos ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground">
                        Coordenadas
                      </span>
                      <p className="inline-flex items-center gap-1 font-mono font-semibold text-foreground">
                        <MapPin className="size-3 text-primary shrink-0" />
                        {pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground">
                        Velocidade
                      </span>
                      <p className="font-bold text-primary">
                        {pos.speed !== undefined ? `${pos.speed} km/h` : "0 km/h"}
                      </p>
                    </div>
                    {pos.timestamp && (
                      <div className="col-span-2 text-[11px] font-mono text-muted-foreground">
                        Última posição:{" "}
                        {new Date(pos.timestamp).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    Rastreador vinculado, aguardando primeira posição GPS.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Nenhum rastreador GPS vinculado a este veículo.
              </p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border/60 px-5 py-3.5">
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
  );
}
