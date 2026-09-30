"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bike,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Link2,
  Radio,
  Search,
  Sparkles,
  Unlink,
  User,
  X,
} from "lucide-react";

import type { Device } from "@/lib/types/device";

type MotorcycleOption = {
  id: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  license_plate: string;
  rider?: { name?: string; phone?: string };
};

interface DeviceLinkModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeviceLinkModal({
  device,
  isOpen,
  onClose,
  onSuccess,
}: DeviceLinkModalProps) {
  if (!isOpen || !device) return null;

  return (
    <DeviceLinkModalInner
      key={`${device.id}-${device.motorcycle?.id || "unlinked"}`}
      device={device}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function DeviceLinkModalInner({
  device,
  onClose,
  onSuccess,
}: {
  device: Device;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [motorcycles, setMotorcycles] = useState<MotorcycleOption[]>([]);
  const [loadingMotos, setLoadingMotos] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMotoId, setSelectedMotoId] = useState<string>(
    device.motorcycle?.id || "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedImei, setCopiedImei] = useState(false);

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Carrega lista de motocicletas
  useEffect(() => {
    let active = true;
    async function loadMotos() {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            motorcycles?: MotorcycleOption[];
          };
          if (active && Array.isArray(data.motorcycles)) {
            setMotorcycles(data.motorcycles);
          }
        }
      } catch {
        // Silently ignore
      } finally {
        if (active) setLoadingMotos(false);
      }
    }

    void loadMotos();
    return () => {
      active = false;
    };
  }, []);

  const handleCopyImei = () => {
    if (!device.serial_number || device.serial_number === "—") return;
    void navigator.clipboard.writeText(device.serial_number);
    setCopiedImei(true);
    setTimeout(() => setCopiedImei(false), 2000);
  };

  const filteredMotos = motorcycles.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const plate = (m.license_plate || "").toLowerCase();
    const brand = (m.brand || "").toLowerCase();
    const model = (m.model || "").toLowerCase();
    const rider = (m.rider?.name || "").toLowerCase();
    return (
      plate.includes(q) ||
      brand.includes(q) ||
      model.includes(q) ||
      rider.includes(q)
    );
  });

  const currentMoto = device.motorcycle;
  const isChangingLink = Boolean(
    selectedMotoId && (!currentMoto || currentMoto.id !== selectedMotoId),
  );

  // Vincular à motocicleta selecionada
  const handleLink = async () => {
    if (!selectedMotoId) {
      setError("Selecione uma motocicleta da lista para vincular.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motorcycle_id: selectedMotoId }),
      });

      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        throw new Error(data.message || "Erro ao vincular dispositivo.");
      }

      setSuccessMsg(data.message || "Dispositivo vinculado com sucesso!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha na comunicação com o servidor.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Desvincular e enviar para estoque
  const handleUnlink = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlink: true }),
      });

      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        throw new Error(data.message || "Erro ao desvincular dispositivo.");
      }

      setSuccessMsg(data.message || "Dispositivo desvinculado e enviado para estoque!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao desvincular.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl shadow-black/90 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="relative overflow-hidden border-b border-border/70 bg-gradient-to-r from-card via-card/90 to-secondary/70 px-6 py-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/15 blur-2xl" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-sm">
                <Link2 className="size-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Gerenciamento de Vínculo
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    PATCH /api/v1/devices/:id
                  </span>
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
                  Vincular Tracker a Veículo
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Feedback Banners */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/60 bg-primary/10 p-3.5 text-xs text-primary shadow-sm animate-in fade-in">
              <AlertCircle className="size-4 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 shadow-sm animate-in fade-in">
              <CheckCircle2 className="size-4 shrink-0" />
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {/* Device Info Card */}
          <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card to-secondary/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                Rastreador Selecionado
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  device.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                }`}
              >
                {device.status === "active" ? "Ativo" : "Em Estoque / Standby"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-background/60 rounded-xl p-3 border border-border/60">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-mono">IMEI / Serial</p>
                <p className="font-mono text-sm sm:text-base font-bold text-foreground tracking-wider truncate">
                  {device.serial_number}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-primary border border-primary/20">
                  {device.protocol || "GT06"}
                </span>

                <button
                  type="button"
                  onClick={handleCopyImei}
                  className="flex size-7 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
                  title="Copiar IMEI"
                >
                  {copiedImei ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Current Association Status & Unlink Action */}
          {currentMoto ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  Atualmente Vinculado a:
                </span>

                <button
                  type="button"
                  onClick={handleUnlink}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  title="Desvincular e enviar para estoque"
                >
                  <Unlink className="size-3" />
                  <span>Desvincular (Enviar p/ Estoque)</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 bg-background/80 rounded-xl p-3 border border-border/70">
                <div className="inline-flex shrink-0 items-center overflow-hidden rounded-lg border border-blue-500/60 bg-neutral-950 text-xs font-extrabold shadow-sm">
                  <span className="bg-blue-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase">
                    BR
                  </span>
                  <span className="px-2 py-0.5 tracking-wider text-foreground font-mono">
                    {currentMoto.license_plate}
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-right">
                  <p className="text-xs font-bold text-foreground truncate">
                    {currentMoto.brand} {currentMoto.model}
                  </p>
                  {currentMoto.rider?.name && (
                    <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1 truncate">
                      <User className="size-3 text-primary shrink-0" />
                      <span>{currentMoto.rider.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-3.5 text-xs text-amber-300/90 flex items-center gap-2.5">
              <Radio className="size-4 shrink-0 text-amber-400 animate-pulse" />
              <span>
                Este rastreador está <b>em estoque (standby)</b>. Selecione uma motocicleta abaixo para vinculá-lo e ativar o rastreamento em tempo real.
              </span>
            </div>
          )}

          {/* Motorcycle Selection List */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Bike className="size-3.5 text-primary" />
                {currentMoto
                  ? "Transferir / Selecionar Nova Motocicleta"
                  : "Selecione a Motocicleta para Vinculação"}
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {filteredMotos.length} motos disponíveis
              </span>
            </div>

            {/* Search filter inside modal */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar moto por placa, marca, modelo ou piloto..."
                className="w-full rounded-2xl border border-border/80 bg-secondary/80 py-2.5 pl-10 pr-8 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Moto Cards Grid Selection */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {loadingMotos ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Carregando frota de motocicletas...</span>
                </div>
              ) : filteredMotos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                  Nenhuma motocicleta encontrada para &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredMotos.map((m) => {
                  const isSelected = selectedMotoId === m.id;
                  const isCurrent = currentMoto && currentMoto.id === m.id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMotoId(m.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/15 shadow-md shadow-primary/10 ring-1 ring-primary/40"
                          : "border-border/70 bg-secondary/40 hover:border-border hover:bg-secondary/70"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mercosul Badge Mini */}
                        <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-blue-500/60 bg-neutral-950 text-[11px] font-black">
                          <span className="bg-blue-600 px-1 py-0.5 text-[7px] text-white">
                            BR
                          </span>
                          <span className="px-1.5 py-0.5 tracking-wider text-foreground font-mono">
                            {m.license_plate}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {m.brand} {m.model}
                            {m.year ? ` • ${m.year}` : ""}
                          </p>
                          {m.rider?.name && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              Piloto: {m.rider.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCurrent && (
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-400 border border-emerald-500/30">
                            Atual
                          </span>
                        )}
                        {isSelected ? (
                          <div className="flex size-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                            <Check className="size-3.5" />
                          </div>
                        ) : (
                          <div className="size-6 rounded-full border border-border/80 bg-secondary" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-secondary/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border/80 bg-secondary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleLink}
            disabled={submitting || !selectedMotoId || (!isChangingLink && Boolean(currentMoto))}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>
                  {currentMoto && isChangingLink
                    ? "Transferir Vínculo"
                    : "Confirmar Vínculo"}
                </span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
