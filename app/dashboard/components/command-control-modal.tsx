"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Power,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Terminal,
  Unlock,
  X,
  XCircle,
} from "lucide-react";

import type { CommandType, DeviceCommandItem } from "@/lib/types/protection";

interface CommandControlPanelProps {
  motorcycleId: string;
  vehicleLabel?: string;
  currentSpeedKmh?: number;
  isAdmin?: boolean;
  compact?: boolean;
  onCommandSent?: (cmd: DeviceCommandItem) => void;
}

const COMMAND_STATUS_STYLE: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Na fila",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  sent: {
    label: "Enviado ao módulo",
    className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  acked: {
    label: "Confirmado (ACK)",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  failed: {
    label: "Falhou",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  timeout: {
    label: "Sem resposta",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  blocked_by_safety: {
    label: "Bloqueado (segurança)",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

export function CommandControlPanel({
  motorcycleId,
  vehicleLabel,
  currentSpeedKmh = 0,
  isAdmin = false,
  compact = false,
  onCommandSent,
}: CommandControlPanelProps) {
  const [commands, setCommands] = useState<DeviceCommandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<CommandType>("cut_fuel");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [rawHex, setRawHex] = useState("");
  const [customText, setCustomText] = useState("");
  const [forceMoving, setForceMoving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/motorcycles/${motorcycleId}/commands?limit=15`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { data?: DeviceCommandItem[] };
      setCommands(Array.isArray(data.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  }, [motorcycleId]);

  useEffect(() => {
    void loadHistory();
    const timer = setInterval(() => {
      void loadHistory();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadHistory]);

  const isCritical =
    selectedType === "cut_fuel" ||
    selectedType === "restore_fuel" ||
    selectedType === "reboot" ||
    selectedType === "raw_hex";

  const isMovingUnsafe = selectedType === "cut_fuel" && currentSpeedKmh > 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (isCritical && !password.trim()) {
      setFeedback({
        kind: "error",
        text: "Digite sua senha de acesso para confirmar este comando crítico.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      if (selectedType === "set_interval") {
        payload.interval_seconds = intervalSeconds;
      } else if (selectedType === "raw_hex") {
        payload.raw_hex = rawHex.trim();
      } else if (selectedType === "custom") {
        payload.command = customText.trim();
      }

      const res = await fetch(`/api/motorcycles/${motorcycleId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          payload,
          reason: reason.trim() || undefined,
          password: password || undefined,
          confirm_action: true,
          force_moving: forceMoving,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as DeviceCommandItem & {
        message?: string;
      };

      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: body.message || "Não foi possível enviar o comando.",
        });
        void loadHistory();
        return;
      }

      setFeedback({
        kind: "ok",
        text: `Comando enfileirado (${body.encoded_hex ? `HEX: ${body.encoded_hex.slice(0, 24)}…` : body.type}). Aguardando confirmação do módulo.`,
      });
      setPassword("");
      setReason("");
      onCommandSent?.(body);
      void loadHistory();
    } catch {
      setFeedback({
        kind: "error",
        text: "Erro de conexão ao enviar comando.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {vehicleLabel && !compact && (
          <p className="text-xs text-muted-foreground">
            Veículo selecionado: <strong className="text-foreground">{vehicleLabel}</strong>
          </p>
        )}

        {/* Quick Command Type Grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedType("cut_fuel")}
            className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition cursor-pointer ${
              selectedType === "cut_fuel"
                ? "border-red-500/60 bg-red-500/15 text-red-400"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="size-4 shrink-0" />
            <span>Bloquear Motor</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("restore_fuel")}
            className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition cursor-pointer ${
              selectedType === "restore_fuel"
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Unlock className="size-4 shrink-0" />
            <span>Desbloquear</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("get_status")}
            className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition cursor-pointer ${
              selectedType === "get_status"
                ? "border-sky-500/60 bg-sky-500/15 text-sky-400"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="size-4 shrink-0" />
            <span>Consultar Status</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("set_interval")}
            className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition cursor-pointer ${
              selectedType === "set_interval"
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-4 shrink-0" />
            <span>Intervalo GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("reboot")}
            className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition cursor-pointer ${
              selectedType === "reboot"
                ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Power className="size-4 shrink-0" />
            <span>Reiniciar Módulo</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setSelectedType("raw_hex")}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition cursor-pointer ${
                selectedType === "raw_hex"
                  ? "border-purple-500/60 bg-purple-500/15 text-purple-400"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="size-4 shrink-0" />
              <span>Frame Hex GT06</span>
            </button>
          )}
        </div>

        {/* Dynamic Parameter Inputs */}
        {selectedType === "set_interval" && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Intervalo de transmissão (segundos)
            </label>
            <input
              type="number"
              min={5}
              max={3600}
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(Number(e.target.value) || 30)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {selectedType === "raw_hex" && isAdmin && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Frame Hexadecimal GT06 completo (validado com CRC-16)
            </label>
            <textarea
              rows={2}
              value={rawHex}
              onChange={(e) => setRawHex(e.target.value)}
              placeholder="7878 14 80 0C 00000001 52454C41592C3123 0002 0001 CRC 0D0A"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {selectedType === "custom" && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Comando ASCII (ex.: STATUS#)
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {/* Speed Interlock Warning */}
        {isMovingUnsafe && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-400" />
              <p>
                Veículo em movimento a <strong>{Math.round(currentSpeedKmh)} km/h</strong>. Por segurança, o corte acima de 20 km/h é bloqueado por padrão.
              </p>
            </div>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={forceMoving}
                onChange={(e) => setForceMoving(e.target.checked)}
                className="rounded border-amber-500/50"
              />
              <span>Assumo o risco e autorizo o bloqueio em movimento</span>
            </label>
          </div>
        )}

        {isCritical && (
          <div className="space-y-2">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo operacional (opcional, vai para auditoria)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Confirme sua senha para executar comando crítico"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
              feedback.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {feedback.kind === "ok" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
            selectedType === "cut_fuel"
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <Send className="size-3.5" />
          <span>{submitting ? "Validando e enviando..." : "Enviar Comando Seguro"}</span>
        </button>
      </form>

      {/* Command Execution History */}
      <div className="space-y-2 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Histórico & Respostas (ACK)
          </span>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="size-3" /> Atualizar
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando comandos...</p>
        ) : commands.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum comando enviado para este veículo.</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {commands.map((cmd) => {
              const st = COMMAND_STATUS_STYLE[cmd.status] ?? {
                label: cmd.status,
                className: "bg-secondary text-muted-foreground border-border",
              };
              return (
                <div
                  key={cmd.id}
                  className="rounded-xl border border-border/70 bg-background/50 p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground uppercase text-[11px]">
                      {cmd.type.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  {cmd.response_text && (
                    <p className="text-[11px] text-emerald-400 font-mono">
                      ACK: {cmd.response_text}
                    </p>
                  )}
                  {cmd.error && (
                    <p className="text-[11px] text-red-400">{cmd.error}</p>
                  )}
                  {cmd.encoded_hex && (
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      HEX: {cmd.encoded_hex}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(cmd.created_at).toLocaleString("pt-BR")} • {cmd.protocol.toUpperCase()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommandControlModal({
  isOpen,
  onClose,
  motorcycleId,
  vehicleLabel,
  currentSpeedKmh,
  isAdmin,
}: {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: string;
  vehicleLabel?: string;
  currentSpeedKmh?: number;
  isAdmin?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-foreground">
                Central de Comandos Seguros
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Bloqueio, desbloqueio e diagnóstico hexadecimal GT06
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          <CommandControlPanel
            motorcycleId={motorcycleId}
            vehicleLabel={vehicleLabel}
            currentSpeedKmh={currentSpeedKmh}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}
