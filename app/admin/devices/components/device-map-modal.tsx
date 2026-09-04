"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bike,
  Compass,
  Cpu,
  MapPin,
  Radio,
  User,
  X,
} from "lucide-react";

import { GoogleMapView } from "@/app/dashboard/components/google-map-view";
import type { Device } from "@/lib/types/device";

interface DeviceMapModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeviceMapModal({ device, isOpen, onClose }: DeviceMapModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !device) return null;

  const position = device.last_position;
  const moto = device.motorcycle;

  const copyCoordinates = () => {
    if (!position) return;
    const text = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 flex h-[90vh] max-h-[850px] w-full max-w-5xl flex-col overflow-hidden border border-border bg-card shadow-2xl shadow-black/80">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-secondary/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded bg-primary/10 text-primary">
              <Cpu className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[.14em] text-primary">
                  Telemetria em Tempo Real
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {device.serial_number}
                </span>
              </div>
              <h2 className="text-lg font-bold uppercase text-foreground">
                {device.serial_number !== "—" ? device.serial_number : "Sem Rastreador"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {position ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                Posição Ativa
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                <span className="size-2 rounded-full bg-muted-foreground/60"></span>
                Sem Posição Recente
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-foreground focus:outline-none"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Content Body: Map + Info Sidebar */}
        <div className="grid flex-1 overflow-hidden lg:grid-cols-3">
          {/* Map Area */}
          <div className="relative h-[320px] bg-background lg:col-span-2 lg:h-full">
            {position ? (
              <>
                <GoogleMapView
                  position={{
                    latitude: position.latitude,
                    longitude: position.longitude,
                  }}
                  heading={position.heading ?? 0}
                />
                {/* Floating Coordinates Tag */}
                <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 rounded border border-border/90 bg-background/90 p-2.5 backdrop-blur">
                  <MapPin className="size-4 text-primary" />
                  <span className="font-mono text-xs font-medium text-foreground">
                    {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  </span>
                  <button
                    type="button"
                    onClick={copyCoordinates}
                    className="ml-2 rounded border border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="grid size-16 place-items-center rounded-full border border-dashed border-border bg-secondary text-muted-foreground">
                  <Radio className="size-8 opacity-50" />
                </div>
                <h3 className="mt-4 text-base font-bold uppercase text-foreground">
                  Sem Localização Transmitida
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Este dispositivo ainda não reportou coordenadas GPS ou está sem sinal de rede no momento.
                </p>
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="flex flex-col overflow-y-auto border-t border-border bg-card p-5 lg:border-t-0 lg:border-l">
            {/* Associated Motorcycle Box */}
            <div className="border border-border bg-secondary/50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-primary">
                <Bike className="size-4" />
                <span>Motocicleta Vinculada</span>
              </div>
              {moto ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {moto.brand} {moto.model}
                    </span>
                    {/* Mercosul plate badge */}
                    <div className="inline-flex items-center overflow-hidden rounded border border-blue-500/60 bg-neutral-900 text-[11px] font-bold shadow">
                      <span className="bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        BR
                      </span>
                      <span className="px-2 py-0.5 tracking-wider text-foreground">
                        {moto.license_plate}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Ano: <b className="text-foreground">{moto.year}</b></span>
                    <span>Cor: <b className="text-foreground">{moto.color}</b></span>
                  </div>

                  {moto.rider && (
                    <div className="mt-3 border-t border-border/80 pt-3">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <User className="size-3 text-primary" />
                        <span>Piloto</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-foreground">
                        {moto.rider.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {moto.rider.phone}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Nenhuma motocicleta associada a este dispositivo.
                </p>
              )}
            </div>

            {/* Live Metrics Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border border-border bg-secondary/30 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Velocidade
                  </span>
                </div>
                <p className="mt-1.5 text-xl font-extrabold text-foreground">
                  {position?.speed !== undefined ? `${position.speed} km/h` : "—"}
                </p>
              </div>

              <div className="border border-border bg-secondary/30 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Compass className="size-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Direção
                  </span>
                </div>
                <p className="mt-1.5 text-xl font-extrabold text-foreground">
                  {position?.heading !== undefined ? `${position.heading}°` : "—"}
                </p>
              </div>
            </div>

            {/* Address & Timestamp Info */}
            <div className="mt-4 space-y-3 rounded border border-border bg-secondary/20 p-3 text-xs">
              {position?.address && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Endereço aproximado
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {position.address}
                  </p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Última Atualização
                </span>
                <p className="mt-0.5 font-mono text-[11px] text-foreground">
                  {position?.timestamp
                    ? new Date(position.timestamp).toLocaleString("pt-BR")
                    : "Nenhum registro"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Serial
                  </span>
                  <p className="font-mono text-[11px] text-foreground truncate">
                    {device.serial_number}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Firmware
                  </span>
                  <p className="font-mono text-[11px] text-foreground">
                    {device.firmware_version || "—"}
                  </p>
                </div>
                {device.protocol && (
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Protocolo
                    </span>
                    <p className="mt-0.5 text-xs font-semibold uppercase text-primary">
                      {device.protocol}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
