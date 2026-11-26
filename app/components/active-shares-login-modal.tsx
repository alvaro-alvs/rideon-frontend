"use client";

import { useEffect, useState } from "react";
import { Bike, Clock, Eye, Loader2, Radio, Trash2, User, X } from "lucide-react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";
import type { ActiveShareLinkItem } from "@/lib/types/protection";

const DISMISSED_SESSION_KEY = "rideon_active_shares_popup_dismissed";

export function ActiveSharesLoginModal() {
  const currentUser = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ActiveShareLinkItem[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const user = currentUser.status === "authenticated" ? currentUser.user : null;
  const canAudit = Boolean(user && isPlatformOrTenantAdmin(user.role));

  useEffect(() => {
    if (!canAudit || typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISSED_SESSION_KEY) === "true") return;

    let active = true;
    const loadActiveShares = async () => {
      try {
        const res = await fetch("/api/share-links/active", { cache: "no-store" });
        if (!res.ok || !active) return;
        const body = (await res.json()) as { data?: ActiveShareLinkItem[] };
        const list = Array.isArray(body.data) ? body.data : [];
        if (active && list.length > 0) {
          setItems(list);
          setIsOpen(true);
        }
      } catch {
        // Silent fail — non-blocking login notification
      }
    };

    void loadActiveShares();
    return () => {
      active = false;
    };
  }, [canAudit]);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISSED_SESSION_KEY, "true");
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/share-links/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => {
          const next = prev.filter((item) => item.id !== id);
          if (next.length === 0) {
            handleClose();
          }
          return next;
        });
      }
    } finally {
      setRevokingId(null);
    }
  };

  if (!isOpen || items.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-shares-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Radio className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="active-shares-modal-title"
                  className="font-display text-sm sm:text-base font-bold text-foreground"
                >
                  Compartilhamentos Ativos
                </h2>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {items.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Links temporários de rastreamento ativos dos seus clientes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-2.5 overflow-y-auto p-5">
          {items.map((item) => {
            const vehicleTitle =
              item.vehicle_nickname ||
              [item.vehicle_brand, item.vehicle_model].filter(Boolean).join(" ") ||
              "Veículo";

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <User className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{item.rider_name || "Cliente"}</span>
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="inline-flex items-center gap-1 text-foreground/90">
                      <Bike className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{vehicleTitle}</span>
                    </span>
                    {item.vehicle_plate && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                        {item.vehicle_plate}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      {item.label || "Link temporário"}{" "}
                      {item.token_preview && (
                        <span className="font-mono text-foreground/80">({item.token_preview})</span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3 text-amber-400" />
                      Expira {new Date(item.expires_at).toLocaleString("pt-BR")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" />
                      {item.access_count} {item.access_count === 1 ? "acesso" : "acessos"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRevoke(item.id)}
                  disabled={revokingId === item.id}
                  title="Revogar link imediatamente"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {revokingId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  <span>Revogar</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end border-t border-border bg-secondary/30 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
