"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  History,
  Loader2,
  Radio,
  RefreshCw,
  WifiOff,
  X,
} from "lucide-react";

import type { Device, DeviceAudit, DeviceAuditListResponse } from "@/lib/types/device";

type Props = {
  isOpen: boolean;
  device: Device | null; // null = global broker audit across all devices
  onClose: () => void;
};

function eventBadge(eventType: string) {
  switch (eventType) {
    case "broker_discovered":
      return {
        label: "Novo via Broker",
        className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        Icon: Radio,
      };
    case "broker_login":
      return {
        label: "Login Broker",
        className: "border-sky-500/30 bg-sky-500/15 text-sky-400",
        Icon: Activity,
      };
    case "broker_offline":
      return {
        label: "Desconexão",
        className: "border-amber-500/30 bg-amber-500/15 text-amber-400",
        Icon: WifiOff,
      };
    case "transferred_to_manager":
      return {
        label: "Transferência",
        className: "border-violet-500/30 bg-violet-500/15 text-violet-400",
        Icon: ArrowRightLeft,
      };
    default:
      return {
        label: eventType,
        className: "border-border bg-secondary text-muted-foreground",
        Icon: History,
      };
  }
}

export function DeviceAuditModal({ isOpen, device, onClose }: Props) {
  const [audits, setAudits] = useState<DeviceAudit[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAudits = async () => {
    setIsLoading(true);
    setError(null);
    const url = device
      ? `/api/admin/devices/${device.id}/audits?limit=50`
      : `/api/admin/devices/audits?limit=50`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | (DeviceAuditListResponse & { message?: string })
        | null;
      if (!res.ok) {
        throw new Error(body?.message || "Falha ao carregar registros de auditoria.");
      }
      setAudits(body?.data || []);
      setTotal(body?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar auditoria.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, device?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <History className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {device
                  ? `Auditoria do Equipamento ${device.serial_number}`
                  : "Auditoria de Comunicações via Broker"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Histórico imutável de descobertas, logins no broker e transferências ({total})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAudits()}
              disabled={isLoading}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && audits.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Carregando auditoria...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
              {error}
            </div>
          ) : audits.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum registro de auditoria encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {audits.map((item) => {
                const badge = eventBadge(item.event_type);
                const BadgeIcon = badge.Icon;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/60 bg-background/60 p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold ${badge.className}`}
                        >
                          <BadgeIcon className="size-3" />
                          {badge.label}
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {item.serial_number}
                        </span>
                        {item.protocol && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                            {item.protocol}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    {item.details && (
                      <p className="mt-2 text-foreground/90">{item.details}</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {item.source_ip && (
                        <span>
                          IP: <span className="font-mono text-foreground">{item.source_ip}</span>
                        </span>
                      )}
                      {item.actor_email && (
                        <span>
                          Ator: <span className="text-foreground">{item.actor_email}</span>
                        </span>
                      )}
                      {item.actor_role && (
                        <span>
                          Origem: <span className="font-mono">{item.actor_role}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

