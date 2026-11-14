"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2, ShieldCheck, UserCheck, X } from "lucide-react";

import type { Device } from "@/lib/types/device";
import type { Manager } from "@/lib/types/manager";

type Props = {
  device: Device | null;
  onClose: () => void;
  onTransferred: () => void;
};

export function DeviceTransferModal({ device, onClose, onTransferred }: Props) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!device) return;
    setSelectedManagerId(device.manager_id ?? "");
    setError(null);
    setIsLoadingManagers(true);

    fetch("/api/admin/devices/managers", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.message || "Falha ao carregar gerentes do tenant.");
        }
        setManagers(Array.isArray(body?.data) ? (body.data as Manager[]) : []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar gerentes.");
      })
      .finally(() => setIsLoadingManagers(false));
  }, [device]);

  if (!device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/devices/${device.id}/transfer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manager_id: selectedManagerId.trim() === "" ? null : selectedManagerId.trim(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "Não foi possível transferir o equipamento.");
      }
      onTransferred();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao transferir equipamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ArrowRightLeft className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Transferir Equipamento
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                IMEI: {device.serial_number}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="size-4 text-emerald-400" />
              Controle de Visibilidade
            </div>
            <p className="mt-1">
              Equipamentos sem gerente ficam visíveis apenas para o{" "}
              <span className="font-semibold text-foreground">Tenant Admin</span>. Ao
              transferir para um gerente, ele passará a visualizar e operar este
              equipamento.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tenant Manager de Destino
            </label>
            {isLoadingManagers ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Carregando gerentes...
              </div>
            ) : (
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">
                  Nenhum (Visível apenas para Tenant Admin)
                </option>
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.email} ({mgr.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingManagers}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserCheck className="size-3.5" />
              )}
              Confirmar Transferência
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

