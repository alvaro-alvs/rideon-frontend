"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FileSearch,
  History,
  Plus,
  Radar,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { GoogleMapView } from "@/app/dashboard/components/google-map-view";
import { useMotorcycle } from "@/hooks/use-motorcycle";
import { useMotorcycleLocation } from "@/hooks/use-motorcycle-location";
import { isValidCoordinate } from "@/lib/geo";
import type {
  CommandAuditItem,
  GeofenceAuditItem,
  GeofenceEventItem,
  GeofenceItem,
  GeofenceKind,
  GeofenceShape,
  GeofenceTrigger,
  LatLngPoint,
} from "@/lib/types/protection";

export default function GeofencesPage() {
  const { motorcycle, motorcycles, selectedVehicleId, setSelectedVehicleId } = useMotorcycle();
  const locationState = useMotorcycleLocation(motorcycle?.id);

  const [tab, setTab] = useState<"fences" | "events" | "gf_audits" | "cmd_audits">("fences");
  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);
  const [events, setEvents] = useState<GeofenceEventItem[]>([]);
  const [gfAudits, setGfAudits] = useState<GeofenceAuditItem[]>([]);
  const [cmdAudits, setCmdAudits] = useState<CommandAuditItem[]>([]);

  // Builder State
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GeofenceKind>("safe_zone");
  const [shape, setShape] = useState<GeofenceShape>("circle");
  const [triggerOn, setTriggerOn] = useState<GeofenceTrigger>("both");
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [draftCenter, setDraftCenter] = useState<LatLngPoint | null>(null);
  const [draftPolygon, setDraftPolygon] = useState<LatLngPoint[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [startTime, setStartTime] = useState("22:00");
  const [endTime, setEndTime] = useState("06:00");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!motorcycle?.id) return;
    const [gfRes, evRes, gfaRes, cmdaRes] = await Promise.all([
      fetch(`/api/geofences?motorcycle_id=${motorcycle.id}`, { cache: "no-store" }),
      fetch(`/api/geofences/events?motorcycle_id=${motorcycle.id}&limit=50`, { cache: "no-store" }),
      fetch(`/api/geofences/audits?motorcycle_id=${motorcycle.id}&limit=50`, { cache: "no-store" }),
      fetch(`/api/commands/audits?motorcycle_id=${motorcycle.id}&limit=50`, { cache: "no-store" }),
    ]);

    if (gfRes.ok) {
      const b = (await gfRes.json()) as { data?: GeofenceItem[] };
      setGeofences(Array.isArray(b.data) ? b.data : []);
    }
    if (evRes.ok) {
      const b = (await evRes.json()) as { data?: GeofenceEventItem[] };
      setEvents(Array.isArray(b.data) ? b.data : []);
    }
    if (gfaRes.ok) {
      const b = (await gfaRes.json()) as { data?: GeofenceAuditItem[] };
      setGfAudits(Array.isArray(b.data) ? b.data : []);
    }
    if (cmdaRes.ok) {
      const b = (await cmdaRes.json()) as { data?: CommandAuditItem[] };
      setCmdAudits(Array.isArray(b.data) ? b.data : []);
    }
  }, [motorcycle?.id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const mapCenter =
    locationState.status === "ok" &&
    isValidCoordinate(locationState.data.position.latitude, locationState.data.position.longitude)
      ? locationState.data.position
      : isValidCoordinate(motorcycle?.last_position?.latitude, motorcycle?.last_position?.longitude)
        ? {
            latitude: motorcycle!.last_position!.latitude,
            longitude: motorcycle!.last_position!.longitude,
          }
        : { latitude: -23.55052, longitude: -46.633308 };

  useEffect(() => {
    if (!draftCenter && isValidCoordinate(mapCenter.latitude, mapCenter.longitude)) {
      setDraftCenter(mapCenter);
    }
  }, [draftCenter, mapCenter]);

  const handleMapClick = (coords: LatLngPoint) => {
    if (shape === "circle") {
      setDraftCenter(coords);
    } else {
      setDraftPolygon((prev) => [...prev, coords]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorcycle?.id || !name.trim()) return;
    setFeedback(null);

    if (shape === "circle" && !draftCenter) {
      setFeedback("Clique no mapa para definir o centro da cerca circular.");
      return;
    }
    if (shape === "polygon" && draftPolygon.length < 3) {
      setFeedback("Clique em pelo menos 3 pontos no mapa para formar o polígono.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motorcycle_id: motorcycle.id,
          name: name.trim(),
          kind,
          shape,
          center: shape === "circle" ? draftCenter : undefined,
          radius_meters: shape === "circle" ? radiusMeters : undefined,
          polygon: shape === "polygon" ? draftPolygon : undefined,
          trigger_on: triggerOn,
          alert_severity: kind === "restricted_zone" || kind === "anchor" ? "critical" : "warning",
          schedule: scheduleEnabled
            ? {
                enabled: true,
                start_time: startTime,
                end_time: endTime,
                timezone: "America/Sao_Paulo",
              }
            : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setFeedback(body.message || "Falha ao criar cerca virtual.");
        return;
      }
      setName("");
      setDraftPolygon([]);
      setFeedback("Cerca criada com sucesso e monitorada em tempo real!");
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (fence: GeofenceItem) => {
    await fetch(`/api/geofences/${fence.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !fence.active }),
    });
    await loadAll();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/geofences/${id}`, { method: "DELETE" });
    await loadAll();
  };

  const hasAnchor = geofences.some((g) => g.kind === "anchor" && g.active);

  return (
    <DashboardShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">PERÍMETROS & EVENTOS</p>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Cercas Virtuais, Alertas & Auditoria
            </h1>
          </div>

          {motorcycles.length > 1 && (
            <select
              value={selectedVehicleId ?? ""}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground"
            >
              {motorcycles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.model} ({m.license_plate || "sem placa"})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Map + Builder Grid */}
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-2">
                <Radar className="size-4 text-primary" />
                {shape === "circle"
                  ? "Clique no mapa para posicionar o centro do círculo"
                  : `Clique no mapa para adicionar vértices (${draftPolygon.length} pontos)`}
              </span>
              {shape === "polygon" && draftPolygon.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftPolygon([])}
                  className="text-red-400 hover:underline font-semibold cursor-pointer"
                >
                  Limpar pontos
                </button>
              )}
            </div>
            <div className="h-[420px]">
              <GoogleMapView
                position={mapCenter}
                geofences={geofences}
                draftCircle={
                  shape === "circle" && draftCenter
                    ? { center: draftCenter, radiusMeters }
                    : null
                }
                draftPolygon={shape === "polygon" ? draftPolygon : []}
                pulseMode={hasAnchor ? "anchor" : "none"}
                onMapClick={handleMapClick}
                zoom={15}
              />
            </div>
          </div>

          <form
            onSubmit={handleCreate}
            className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">
                Nova Cerca Virtual
              </h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nome da Cerca</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Garagem Casa, Zona Proibida Centro"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Geometria</label>
                <select
                  value={shape}
                  onChange={(e) => setShape(e.target.value as GeofenceShape)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="circle">Circular (Raio)</option>
                  <option value="polygon">Polígono Livre</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Finalidade</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as GeofenceKind)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="safe_zone">Zona Segura</option>
                  <option value="restricted_zone">Área Restrita</option>
                  <option value="checkpoint">Ponto de Controle</option>
                  <option value="anchor">Âncora</option>
                </select>
              </div>
            </div>

            {shape === "circle" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Raio de Proteção</span>
                  <strong className="text-primary">{radiusMeters} metros</strong>
                </div>
                <input
                  type="range"
                  min={25}
                  max={5000}
                  step={25}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Disparar Alerta ao</label>
              <select
                value={triggerOn}
                onChange={(e) => setTriggerOn(e.target.value as GeofenceTrigger)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
              >
                <option value="both">Entrar e Sair (Entrada + Saída)</option>
                <option value="exit">Somente ao Sair</option>
                <option value="enter">Somente ao Entrar</option>
              </select>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/40 p-3 space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
                <Clock className="size-3.5 text-primary" />
                <span>Restringir por janela de horário</span>
              </label>
              {scheduleEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                  />
                </div>
              )}
            </div>

            {feedback && (
              <p className="text-xs font-medium text-primary">{feedback}</p>
            )}

            <button
              type="submit"
              disabled={saving || !motorcycle?.id}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Salvando cerca..." : "Criar Cerca Virtual"}
            </button>
          </form>
        </div>

        {/* Bottom Tabs: Fences | Entry/Exit Events | Geofence Audits | Command Audits */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap border-b border-border bg-background/40 p-2 gap-1.5">
            {(
              [
                { id: "fences", label: `Cercas (${geofences.length})`, icon: ShieldCheck },
                { id: "events", label: `Entradas & Saídas (${events.length})`, icon: History },
                { id: "gf_audits", label: `Auditoria de Cercas (${gfAudits.length})`, icon: FileSearch },
                { id: "cmd_audits", label: `Auditoria de Comandos (${cmdAudits.length})`, icon: Terminal },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  tab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "fences" && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {geofences.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma cerca configurada para este veículo.</p>
                ) : (
                  geofences.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">{f.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {f.kind} • {f.shape === "circle" ? `${Math.round(f.radius_meters || 0)}m` : `${f.polygon?.length || 0} vértices`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleToggle(f)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase cursor-pointer ${
                            f.active
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {f.active ? "Ativa" : "Pausada"}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Regra: {f.trigger_on}</span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(f.id)}
                          className="inline-flex items-center gap-1 text-red-400 hover:underline cursor-pointer"
                        >
                          <Trash2 className="size-3" /> Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "events" && (
              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum evento de entrada ou saída registrado ainda.</p>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {ev.event_type === "enter" ? (
                          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                            <ArrowDownLeft className="size-4" />
                          </span>
                        ) : (
                          <span className="flex size-7 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                            <ArrowUpRight className="size-4" />
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">
                            {ev.event_type === "enter" ? "Entrada em" : "Saída de"} {ev.geofence_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {Math.round(ev.speed)} km/h •{" "}
                            {ev.dwell_seconds != null ? `Permanência: ${Math.round(ev.dwell_seconds / 60)} min • ` : ""}
                            ({ev.latitude.toFixed(5)}, {ev.longitude.toFixed(5)})
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(ev.occurred_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "gf_audits" && (
              <div className="space-y-2">
                {gfAudits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum registro de auditoria de cercas.</p>
                ) : (
                  gfAudits.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-foreground mr-2">
                          {a.action}
                        </span>
                        <span className="text-foreground">{a.details}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {a.actor_role || "system"} • {new Date(a.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "cmd_audits" && (
              <div className="space-y-2">
                {cmdAudits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum registro de auditoria de comandos.</p>
                ) : (
                  cmdAudits.map((a) => (
                    <div
                      key={a.id}
                      className="space-y-1 rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-primary mr-2">
                            {a.command_type} • {a.action}
                          </span>
                          <span className="text-foreground">{a.details}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {a.actor_role || "system"} • {new Date(a.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {a.encoded_hex && (
                        <p className="font-mono text-[10px] text-muted-foreground truncate">
                          HEX: {a.encoded_hex}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
