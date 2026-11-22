"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Tag, X } from "lucide-react";

import { formatVehicleModel } from "@/lib/vehicle-display";

type VehicleNicknameModalProps = {
  vehicle: {
    id: string;
    brand?: string;
    model?: string;
    nickname?: string;
    license_plate?: string;
  };
  onClose: () => void;
  onSaved: (updatedNickname: string) => void;
};

export function VehicleNicknameModal({
  vehicle,
  onClose,
  onSaved,
}: VehicleNicknameModalProps) {
  const [nickname, setNickname] = useState(vehicle.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originalModel = formatVehicleModel(vehicle);

  const submitNickname = async (nextNickname: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/motorcycles/${encodeURIComponent(vehicle.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nextNickname.trim() }),
      });

      const data = (await res.json().catch(() => null)) as {
        message?: string;
        nickname?: string;
      } | null;

      if (!res.ok) {
        throw new Error(data?.message || "Não foi possível salvar o apelido.");
      }

      onSaved((data?.nickname ?? nextNickname.trim()).trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar apelido.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitNickname(nickname);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Tag className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-foreground">
                Apelidar Veículo
              </h2>
              <p className="text-xs text-muted-foreground">
                {originalModel}
                {vehicle.license_plate ? ` • ${vehicle.license_plate}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nome Personalizado
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={60}
              placeholder={`Ex: Veículo Principal, Entregas (${originalModel})`}
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Quando definido, este nome será exibido no lugar do modelo ({originalModel}). Deixe vazio para voltar ao modelo original.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-4">
            {vehicle.nickname ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitNickname("")}
                className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                Remover apelido
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                <span>{saving ? "Salvando..." : "Salvar"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
