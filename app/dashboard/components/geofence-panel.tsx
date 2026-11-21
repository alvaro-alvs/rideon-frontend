"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Lock, Plus, Radar, ShieldCheck } from "lucide-react";
import type { GeofenceEventItem, GeofenceItem } from "@/lib/types/protection";

interface GeofenceQuickPanelProps {
  geofences: GeofenceItem[];
  events: GeofenceEventItem[];
  anchorBusy?: boolean;
  onToggleAnchor: () => void;
  onToggleFenceActive: (fence: GeofenceItem) => void;
}

export function GeofenceQuickPanel({
  geofences,
  events,
  anchorBusy = false,
  onToggleAnchor,
  onToggleFenceActive,
}: GeofenceQuickPanelProps) {
  const activeAnchor = geofences.find((g) => g.kind === "anchor" && g.active);

  return (
    <div className="space-y-4">
      {/* Quick Virtual Anchor Card */}
      <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radar
              className={`size-4 ${activeAnchor ? "text-amber-400 animate-pulse" : "text-muted-foreground"}`}
            />
            <div>
              <p className="text-xs font-bold text-foreground">Âncora Virtual</p>
              <p className="text-[11px] text-muted-foreground">
                {activeAnchor
                  ? `Ativa (${Math.round(activeAnchor.radius_meters || 60)}m)`
                  : "Desarmada"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={anchorBusy}
            onClick={onToggleAnchor}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
              activeAnchor
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Lock className="size-3.5" />
            <span>{activeAnchor ? "Desarmar" : "Armar Agora"}</span>
          </button>
        </div>
      </div>

      {/* Geofence List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Cercas ({geofences.length})
          </span>
          <Link
            href="/dashboard/geofences"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <Plus className="size-3" /> Gerenciar / Desenhar
          </Link>
        </div>

        {geofences.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma cerca cadastrada para este veículo.
          </p>
        ) : (
          <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {geofences.map((fence) => (
              <div
                key={fence.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: fence.color || "#10b981" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{fence.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fence.shape === "circle"
                        ? `Raio ${Math.round(fence.radius_meters || 0)}m`
                        : "Polígono"}{" "}
                      • {fence.trigger_on === "both" ? "Entrada e Saída" : fence.trigger_on === "exit" ? "Saída" : "Entrada"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleFenceActive(fence)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase cursor-pointer ${
                    fence.active
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {fence.active ? "Ativa" : "Inativa"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Entry / Exit Events */}
      <div className="space-y-2 border-t border-border/60 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          Eventos de Entrada / Saída
        </span>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem travessias de cerca registradas.</p>
        ) : (
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {events.slice(0, 12).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/50 px-2.5 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {ev.event_type === "enter" ? (
                    <ArrowDownLeft className="size-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowUpRight className="size-3.5 text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {ev.event_type === "enter" ? "Entrou em" : "Saiu de"} {ev.geofence_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(ev.speed)} km/h • {new Date(ev.occurred_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
