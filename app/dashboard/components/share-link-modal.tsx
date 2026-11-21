"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  MessageCircle,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import type { ShareLinkItem } from "@/lib/types/protection";

interface ShareLinkPanelProps {
  motorcycleId: string;
  vehicleLabel?: string;
  compact?: boolean;
}

const DURATION_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hora", minutes: 60 },
  { label: "6 horas", minutes: 360 },
  { label: "24 horas", minutes: 1440 },
];

export function ShareLinkPanel({
  motorcycleId,
  vehicleLabel,
  compact = false,
}: ShareLinkPanelProps) {
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [label, setLabel] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [showPlate, setShowPlate] = useState(true);
  const [showSpeed, setShowSpeed] = useState(true);
  const [showRecentPath, setShowRecentPath] = useState(true);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    const res = await fetch(`/api/motorcycles/${motorcycleId}/share-links`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const body = (await res.json()) as { data?: ShareLinkItem[] };
    setLinks(Array.isArray(body.data) ? body.data : []);
  }, [motorcycleId]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/motorcycles/${motorcycleId}/share-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || undefined,
          duration_minutes: durationMinutes,
          show_plate: showPlate,
          show_speed: showSpeed,
          show_recent_path: showRecentPath,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        message?: string;
      };
      if (!res.ok || !data.token) {
        setError(data.message || "Falha ao gerar link.");
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/tracking/${data.token}`;
      setGeneratedUrl(url);
      setLabel("");
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
      void loadLinks();
    } catch {
      setError("Erro de conexão ao gerar link.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/share-links/${id}`, { method: "DELETE" });
    if (res.ok) {
      void loadLinks();
    }
  };

  const handleCopyUrl = async (url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const activeLinks = links.filter(
    (l) => !l.revoked_at && new Date(l.expires_at).getTime() > Date.now(),
  );

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <form onSubmit={handleCreate} className="space-y-3">
        {vehicleLabel && !compact && (
          <p className="text-xs text-muted-foreground">
            Rastreamento temporário para <strong className="text-foreground">{vehicleLabel}</strong> (sem expor seus dados pessoais).
          </p>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              type="button"
              onClick={() => setDurationMinutes(opt.minutes)}
              className={`rounded-xl border py-2 text-xs font-semibold transition cursor-pointer ${
                durationMinutes === opt.minutes
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Etiqueta (ex.: Entrega Cliente, Apoio Policial)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
        />

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showPlate}
              onChange={(e) => setShowPlate(e.target.checked)}
            />
            <span>Exibir placa</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showSpeed}
              onChange={(e) => setShowSpeed(e.target.checked)}
            />
            <span>Exibir velocidade</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showRecentPath}
              onChange={(e) => setShowRecentPath(e.target.checked)}
            />
            <span>Exibir trilha recente</span>
          </label>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          <Link2 className="size-3.5" />
          <span>{submitting ? "Gerando link seguro..." : "Gerar Link Temporário"}</span>
        </button>
      </form>

      {generatedUrl && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-emerald-400">
            Link criado e pronto para envio:
          </p>
          <p className="break-all rounded-lg bg-background/80 px-2.5 py-2 font-mono text-[11px] text-foreground">
            {generatedUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyUrl(generatedUrl)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copiado!" : "Copiar Link"}</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Acompanhe a localização em tempo real (${vehicleLabel || "Veículo"}): ${generatedUrl}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <MessageCircle className="size-3.5" />
              <span>Enviar no WhatsApp</span>
            </a>
            <a
              href={generatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              <span>Abrir</span>
            </a>
          </div>
        </div>
      )}

      {/* Active Links List */}
      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Links Ativos ({activeLinks.length})
        </p>
        {activeLinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum link temporário ativo no momento.</p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {activeLinks.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/50 p-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {item.label || "Link temporário"} •{" "}
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.token_preview}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Expira em {new Date(item.expires_at).toLocaleString("pt-BR")} • {item.access_count} visualizações
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevoke(item.id)}
                  title="Revogar link imediatamente"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 cursor-pointer shrink-0"
                >
                  <Trash2 className="size-3" />
                  <span>Revogar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ShareLinkModal({
  isOpen,
  onClose,
  motorcycleId,
  vehicleLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: string;
  vehicleLabel?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Share2 className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-foreground">
                Compartilhar Localização ao Vivo
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Link público com expiração e revogação instantânea
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
          <ShareLinkPanel motorcycleId={motorcycleId} vehicleLabel={vehicleLabel} />
        </div>
      </div>
    </div>
  );
}
