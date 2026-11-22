"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Bell,
  Bike,
  Check,
  Clock,
  Copy,
  History,
  MapPin,
  Navigation,
  Power,
  Radio,
  RefreshCw,
  Route,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { StreamRouteCanvas } from "@/app/dashboard/history/components/stream-route-canvas";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMotorcycle } from "@/hooks/use-motorcycle";
import {
  getHistoryAlertMeta,
  isRelevantHistoryAlert,
  type HistoryAlertItem,
} from "@/lib/alert-meta";
import { isPlatformOrTenantAdmin } from "@/lib/auth";
import { isValidCoordinate } from "@/lib/geo";
import { formatVehicleDisplayName } from "@/lib/vehicle-display";
import { consumeNdjsonStream } from "@/lib/ndjson-stream";
import {
  formatConciseDate,
  formatCoordinatePair,
  formatPlaceLabel,
  formatTimeShort,
  formatTripTimeRange,
  type TripItem,
  type TripPoint,
} from "@/lib/trip-format";

const INITIAL_VISIBLE_ROWS = 120;
const LOAD_MORE_STEP = 150;

type HistoryTab = "trips" | "events";
type EventCategoryFilter = "all" | "ignition" | "alert" | "telemetry";

export default function HistoryPage() {
  const currentUser = useCurrentUser();
  const userRole = currentUser.status === "authenticated" ? currentUser.user.role : "rider";
  const isAdmin = isPlatformOrTenantAdmin(userRole);

  const { motorcycles, selectedVehicleId, setSelectedVehicleId, isLoading: loadingMotos } =
    useMotorcycle();

  const [activeTab, setActiveTab] = useState<HistoryTab>("trips");
  const [eventFilter, setEventFilter] = useState<EventCategoryFilter>("all");
  const [filterMotoId, setFilterMotoId] = useState<string>("all");
  const [refreshTick, setRefreshTick] = useState(0);

  // Trips state
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tripsError, setTripsError] = useState("");

  // Ignition & Alerts state
  const [events, setEvents] = useState<HistoryAlertItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  // Selected trip, event location, or raw telemetry stream modal state
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const [streamModeTitle, setStreamModeTitle] = useState<string | null>(null);
  const [streamCoords, setStreamCoords] = useState<TripPoint[]>([]);
  const [streamStatus, setStreamStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [streamProgress, setStreamProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: 0,
  });
  const [streamError, setStreamError] = useState("");
  const [focusedPoint, setFocusedPoint] = useState<TripPoint | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);

  const streamAbortRef = useRef<AbortController | null>(null);
  const userFocusedRef = useRef(false);

  const effectiveMotoId =
    motorcycles.length === 1 && motorcycles[0]?.id ? motorcycles[0].id : filterMotoId;

  // Fetch Trips
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ limit: "30" });
    if (effectiveMotoId && effectiveMotoId !== "all") {
      qs.set("motorcycle_id", effectiveMotoId);
    }

    fetch(`/api/trips?${qs.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || "Erro ao carregar trajetos.");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.data) ? (data.data as TripItem[]) : [];
        setTrips(list);
        setTripsError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setTripsError(err instanceof Error ? err.message : "Erro ao carregar trajetos.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTrips(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveMotoId, refreshTick]);

  // Fetch Ignition & Alerts events
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ limit: "60" });
    if (effectiveMotoId && effectiveMotoId !== "all") {
      qs.set("motorcycle_id", effectiveMotoId);
    } else if (isAdmin) {
      qs.set("all_vehicles", "true");
    }

    fetch(`/api/notifications?${qs.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || "Erro ao carregar eventos de ignição e alertas.");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const rawList = Array.isArray(data?.data) ? (data.data as HistoryAlertItem[]) : [];
        setEvents(rawList.filter(isRelevantHistoryAlert));
        setEventsError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setEventsError(
          err instanceof Error ? err.message : "Erro ao carregar eventos de ignição e alertas.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEvents(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveMotoId, isAdmin, refreshTick]);

  // Abort any in-flight stream on unmount
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const closeModal = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setSelectedTrip(null);
    setStreamModeTitle(null);
    setStreamCoords([]);
    setStreamStatus("idle");
    setStreamError("");
    setFocusedPoint(null);
  }, []);

  const runProgressiveStream = useCallback(
    async (url: string, initialTrip: TripItem | null, titleLabel: string | null) => {
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      userFocusedRef.current = false;

      setSelectedTrip(initialTrip);
      setStreamModeTitle(titleLabel);
      setStreamCoords([]);
      setStreamStatus("streaming");
      setStreamProgress({ loaded: 0, total: initialTrip?.point_count ?? 0 });
      setStreamError("");
      setVisibleRows(INITIAL_VISIBLE_ROWS);
      setFocusedPoint(initialTrip?.origin ?? null);

      try {
        await consumeNdjsonStream(url, {
          signal: controller.signal,
          frameDelayMs: 32,
          onFrame: (frame) => {
            if (frame.type === "meta") {
              if (frame.trip) {
                setSelectedTrip(frame.trip);
              }
              setStreamProgress((prev) => ({
                loaded: prev.loaded,
                total: frame.total ?? prev.total,
              }));
              return;
            }

            if (frame.type === "chunk" && Array.isArray(frame.points) && frame.points.length > 0) {
              const incoming = frame.points;
              setStreamCoords((prev) => [...prev, ...incoming]);
              setStreamProgress((prev) => ({
                loaded: frame.loaded ?? prev.loaded + incoming.length,
                total: Math.max(frame.total ?? prev.total, frame.loaded ?? 0),
              }));
              if (!userFocusedRef.current) {
                setFocusedPoint(incoming[incoming.length - 1]);
              }
              return;
            }

            if (frame.type === "done") {
              setStreamStatus("done");
              setStreamProgress((prev) => ({
                loaded: frame.loaded ?? prev.loaded,
                total: frame.total ?? prev.total,
              }));
              return;
            }

            if (frame.type === "error") {
              setStreamError(frame.message || "Falha durante o streaming.");
              setStreamStatus("error");
            }
          },
        });

        if (!controller.signal.aborted) {
          setStreamStatus((prev) => (prev === "streaming" ? "done" : prev));
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setStreamError(
          err instanceof Error ? err.message : "Não foi possível carregar os dados por streaming.",
        );
        setStreamStatus("error");
      }
    },
    [],
  );

  const handleCardClick = (trip: TripItem) => {
    void runProgressiveStream(
      `/api/trips/${encodeURIComponent(trip.id)}/stream?batch_size=25`,
      trip,
      null,
    );
  };

  const handleEventClick = (ev: HistoryAlertItem) => {
    if (!ev.location || !isValidCoordinate(ev.location.latitude, ev.location.longitude)) {
      return;
    }
    streamAbortRef.current?.abort();
    const meta = getHistoryAlertMeta(ev);
    const pt: TripPoint = {
      latitude: ev.location.latitude,
      longitude: ev.location.longitude,
      speed: ev.location.speed ?? 0,
      heading: ev.location.heading ?? 0,
      timestamp: ev.created_at,
    };
    const plate = ev.vehicle_plate ? ` • ${ev.vehicle_plate}` : "";
    setSelectedTrip(null);
    setStreamModeTitle(`${meta.title}${plate}`);
    setStreamCoords([pt]);
    setStreamProgress({ loaded: 1, total: 1 });
    setStreamStatus("done");
    setStreamError("");
    setVisibleRows(INITIAL_VISIBLE_ROWS);
    setFocusedPoint(pt);
  };

  const handleOpenRawTelemetryStream = () => {
    const targetId =
      effectiveMotoId !== "all" ? effectiveMotoId : motorcycles[0]?.id;
    if (!targetId) return;

    const moto = motorcycles.find((m) => m.id === targetId);
    const label = moto
      ? `Stream de Posições • ${moto.nickname?.trim() || moto.license_plate || formatVehicleDisplayName(moto)}`
      : "Stream de Posições do Veículo";

    void runProgressiveStream(
      `/api/motorcycles/${encodeURIComponent(targetId)}/telemetry/stream?limit=5000&batch_size=35`,
      null,
      label,
    );
  };

  const handleRefresh = useCallback(() => {
    setLoadingTrips(true);
    setLoadingEvents(true);
    setRefreshTick((t) => t + 1);
  }, []);

  const handleCopy = (key: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSelectVehicleFilter = (id: string) => {
    setLoadingTrips(true);
    setLoadingEvents(true);
    setFilterMotoId(id);
    if (id !== "all") {
      setSelectedVehicleId(id);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (eventFilter === "all") return true;
    return getHistoryAlertMeta(ev).category === eventFilter;
  });

  const isLoadingCurrent = activeTab === "trips" ? loadingTrips : loadingEvents;
  const isModalOpen = Boolean(selectedTrip || streamModeTitle);
  const progressPct =
    streamProgress.total > 0
      ? Math.min(100, Math.round((streamProgress.loaded / streamProgress.total) * 100))
      : streamStatus === "done"
        ? 100
        : 0;

  const displayOrigin =
    selectedTrip?.origin ?? (streamCoords.length > 0 ? streamCoords[0] : null);
  const displayDest =
    selectedTrip?.destination ??
    (streamCoords.length > 0 ? streamCoords[streamCoords.length - 1] : null);

  const renderedCoords = streamCoords.slice(0, visibleRows);

  return (
    <DashboardShell>
      <div className="w-full space-y-4">
        <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-kicker">HISTÓRICO DE POSIÇÕES & EVENTOS</p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {activeTab === "trips" ? "Trajetos Recentes" : "Ignição & Alertas"}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {motorcycles.length > 0 && activeTab === "trips" && (
                <button
                  type="button"
                  onClick={handleOpenRawTelemetryStream}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 cursor-pointer"
                >
                  <Activity className="size-3.5" />
                  <span>Stream de Posições</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoadingCurrent}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoadingCurrent ? "animate-spin text-primary" : ""}`}
                />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Primary Tabs: Trajetos vs Ignição & Alertas */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-background/70 p-1 border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("trips")}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  activeTab === "trips"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Route className="size-3.5" />
                <span>Trajetos</span>
                {trips.length > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                      activeTab === "trips"
                        ? "bg-black/25 text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {trips.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("events")}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  activeTab === "events"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="size-3.5" />
                <span>Ignição & Alertas</span>
                {events.length > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                      activeTab === "events"
                        ? "bg-black/25 text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {events.length}
                  </span>
                )}
              </button>
            </div>

            {/* Event Sub-Filters when on Ignição & Alertas tab */}
            {activeTab === "events" && (
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "ignition", label: "Ignição" },
                    { id: "alert", label: "Alertas" },
                    { id: "telemetry", label: "Telemetria" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEventFilter(cat.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                      eventFilter === cat.id
                        ? "bg-secondary text-foreground ring-1 ring-primary/40"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Filter Chips (only shown when > 1 vehicle) */}
          {!loadingMotos && motorcycles.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectVehicleFilter("all")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  effectiveMotoId === "all"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
                }`}
              >
                <Route className="size-3.5" />
                <span>Todos</span>
              </button>
              {motorcycles.map((bike) => {
                if (!bike.id) return null;
                const active =
                  effectiveMotoId === bike.id ||
                  (selectedVehicleId === bike.id && effectiveMotoId === bike.id);
                return (
                  <button
                    key={bike.id}
                    type="button"
                    onClick={() => handleSelectVehicleFilter(bike.id!)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
                    }`}
                  >
                    <Bike className="size-3.5" />
                    <span className="font-mono">
                      {bike.nickname?.trim() || bike.license_plate || bike.model}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 1: TRAJETOS */}
          {activeTab === "trips" && (
            <>
              {tripsError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400">
                  {tripsError}
                </div>
              )}

              {loadingTrips ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-24 animate-pulse rounded-xl border border-border/50 bg-background/40"
                    />
                  ))}
                </div>
              ) : trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/30 py-14 px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <History className="size-6" />
                  </div>
                  <h2 className="mt-4 font-display text-base font-bold text-foreground">
                    Nenhum trajeto registrado
                  </h2>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    Quando o veículo se deslocar e parar por completo (3–5 minutos), o trajeto será salvo automaticamente aqui.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {trips.map((trip, index) => {
                    const originLabel = formatPlaceLabel(trip.origin_address, trip.origin);
                    const destLabel = formatPlaceLabel(trip.destination_address, trip.destination);
                    const timeRange = formatTripTimeRange(trip.started_at, trip.ended_at);
                    const conciseDate = formatConciseDate(trip.ended_at || trip.started_at);

                    return (
                      <motion.button
                        key={trip.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
                        onClick={() => handleCardClick(trip)}
                        className="group flex flex-col justify-between gap-3 rounded-xl border border-border/70 bg-background/50 p-4 text-left transition-all hover:border-primary/60 hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 text-sm font-semibold text-foreground">
                            <span className="truncate" title={originLabel}>
                              {originLabel}
                            </span>
                            <ArrowRight className="size-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                            <span className="truncate" title={destLabel}>
                              {destLabel}
                            </span>
                          </div>
                          {motorcycles.length > 1 && trip.vehicle_plate && (
                            <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                              {trip.vehicle_plate}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground w-full">
                          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                            <Clock className="size-3.5 text-muted-foreground/80" />
                            {timeRange}
                          </span>
                          <span className="font-semibold text-foreground/90">
                            {conciseDate}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: IGNIÇÃO & ALERTAS */}
          {activeTab === "events" && (
            <>
              {eventsError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400">
                  {eventsError}
                </div>
              )}

              {loadingEvents ? (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="h-20 animate-pulse rounded-xl border border-border/50 bg-background/40"
                    />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/30 py-14 px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Bell className="size-6" />
                  </div>
                  <h2 className="mt-4 font-display text-base font-bold text-foreground">
                    Nenhum evento registrado
                  </h2>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    Eventos de ignição ligada/desligada, paradas completas e alertas de segurança aparecerão nesta linha do tempo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredEvents.map((ev, index) => {
                    const meta = getHistoryAlertMeta(ev);
                    const hasLoc =
                      ev.location &&
                      isValidCoordinate(ev.location.latitude, ev.location.longitude);
                    const isIgnitionOn = ev.type === "ignition_on";
                    const isIgnitionOff = ev.type === "ignition_off";

                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.25) }}
                        onClick={() => hasLoc && handleEventClick(ev)}
                        className={`flex items-start gap-3.5 rounded-xl border border-border/70 bg-background/50 p-4 transition-all ${
                          hasLoc
                            ? "cursor-pointer hover:border-primary/50 hover:bg-background/80"
                            : ""
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border ${
                            isIgnitionOn
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : isIgnitionOff
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                : meta.category === "alert"
                                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                                  : "border-sky-500/30 bg-sky-500/10 text-sky-400"
                          }`}
                        >
                          {meta.category === "ignition" ? (
                            isIgnitionOff ? (
                              <Power className="size-4" />
                            ) : (
                              <Zap className="size-4" />
                            )
                          ) : meta.category === "alert" ? (
                            <ShieldAlert className="size-4" />
                          ) : (
                            <Radio className="size-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="font-display text-sm font-bold text-foreground">
                                {meta.title}
                              </span>
                              {ev.vehicle_plate && (
                                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                                  {ev.vehicle_plate}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground shrink-0">
                              <span>{formatTimeShort(ev.created_at)}</span>
                              <span className="font-semibold text-foreground/90">
                                {formatConciseDate(ev.created_at)}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {ev.message}
                          </p>

                          {hasLoc && ev.location && (
                            <div className="inline-flex items-center gap-1.5 pt-0.5 font-mono text-[11px] text-emerald-400">
                              <MapPin className="size-3" />
                              <span>
                                {formatCoordinatePair(
                                  ev.location.latitude,
                                  ev.location.longitude,
                                  5,
                                )}
                                {ev.location.speed
                                  ? ` • ${Math.round(ev.location.speed)} km/h`
                                  : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progressive Streaming Coordinates Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  {selectedTrip ? (
                    <>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span>
                          {formatConciseDate(selectedTrip.ended_at || selectedTrip.started_at)}
                        </span>
                        <span>•</span>
                        <span className="font-mono">
                          {formatTripTimeRange(selectedTrip.started_at, selectedTrip.ended_at)}
                        </span>
                        {selectedTrip.vehicle_plate && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-foreground">
                              {selectedTrip.vehicle_plate}
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="mt-1 flex items-center gap-2 truncate font-display text-base sm:text-lg font-bold text-foreground">
                        <span className="truncate">
                          {formatPlaceLabel(selectedTrip.origin_address, selectedTrip.origin)}
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-primary" />
                        <span className="truncate">
                          {formatPlaceLabel(
                            selectedTrip.destination_address,
                            selectedTrip.destination,
                          )}
                        </span>
                      </h2>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        POSIÇÕES & TELEMETRIA
                      </p>
                      <h2 className="mt-0.5 truncate font-display text-base sm:text-lg font-bold text-foreground">
                        {streamModeTitle}
                      </h2>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Fechar coordenadas"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Progressive Streaming Status & Animated Progress Bar */}
              <div className="border-b border-border/60 bg-background/40 px-5 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {streamStatus === "streaming" ? (
                      <>
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>
                        <span className="font-medium text-foreground">
                          Carregando telemetria por streaming...
                        </span>
                      </>
                    ) : streamStatus === "error" ? (
                      <span className="font-medium text-red-400">
                        {streamError || "Erro no stream de telemetria"}
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-400">
                        {streamCoords.length.toLocaleString("pt-BR")}{" "}
                        {streamCoords.length === 1
                          ? "coordenada carregada"
                          : "coordenadas carregadas"}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {streamProgress.total > 0
                      ? `${streamCoords.length.toLocaleString("pt-BR")} / ${streamProgress.total.toLocaleString("pt-BR")} (${progressPct}%)`
                      : `${streamCoords.length.toLocaleString("pt-BR")} pts`}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/70">
                  <motion.div
                    className={`h-full rounded-full ${
                      streamStatus === "error"
                        ? "bg-red-500"
                        : streamStatus === "done"
                          ? "bg-emerald-500"
                          : "bg-primary"
                    }`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ ease: "easeOut", duration: 0.2 }}
                  />
                </div>
              </div>

              {/* Modal Body */}
              <div className="grid flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-12">
                {/* Animated Map / Route Trace + Origin/Destination Coordinates */}
                <div className="space-y-3 lg:col-span-7">
                  <StreamRouteCanvas
                    points={streamCoords}
                    focusedPoint={focusedPoint}
                    isStreaming={streamStatus === "streaming"}
                  />

                  {/* Origin & Destination Coordinates */}
                  {(displayOrigin || displayDest) && (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {displayOrigin && (
                        <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                              <Navigation className="size-3.5" />
                              {selectedTrip ? "Origem (De)" : "Posição Inicial"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  "origin",
                                  formatCoordinatePair(
                                    displayOrigin.latitude,
                                    displayOrigin.longitude,
                                  ),
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {copiedKey === "origin" ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                          <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                            {formatCoordinatePair(displayOrigin.latitude, displayOrigin.longitude)}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {formatPlaceLabel(selectedTrip?.origin_address, displayOrigin)}
                          </p>
                        </div>
                      )}

                      {displayDest && (
                        <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                              <MapPin className="size-3.5" />
                              {selectedTrip ? "Destino (Para)" : "Posição Final"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  "dest",
                                  formatCoordinatePair(displayDest.latitude, displayDest.longitude),
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {copiedKey === "dest" ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                          <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                            {formatCoordinatePair(displayDest.latitude, displayDest.longitude)}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {formatPlaceLabel(selectedTrip?.destination_address, displayDest)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Animated Coordinates List */}
                <div className="flex flex-col rounded-xl border border-border/70 bg-background/50 lg:col-span-5">
                  <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Coordenadas ({streamCoords.length.toLocaleString("pt-BR")})
                    </span>
                    {streamStatus === "streaming" && (
                      <span className="text-[11px] font-medium text-primary animate-pulse">
                        Ao vivo...
                      </span>
                    )}
                  </div>

                  <div className="max-h-80 lg:max-h-[410px] divide-y divide-border/50 overflow-y-auto">
                    {renderedCoords.length === 0 && streamStatus === "streaming" ? (
                      <div className="p-4 space-y-2.5">
                        {[1, 2, 3, 4].map((s) => (
                          <div
                            key={s}
                            className="h-10 animate-pulse rounded-lg bg-secondary/40"
                          />
                        ))}
                      </div>
                    ) : renderedCoords.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        Nenhuma coordenada registrada neste intervalo.
                      </div>
                    ) : (
                      renderedCoords.map((pt, idx) => {
                        const isFocused =
                          focusedPoint &&
                          focusedPoint.latitude === pt.latitude &&
                          focusedPoint.longitude === pt.longitude &&
                          focusedPoint.timestamp === pt.timestamp;

                        return (
                          <motion.button
                            key={`${pt.timestamp}-${idx}`}
                            type="button"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.16 }}
                            onClick={() => {
                              userFocusedRef.current = true;
                              setFocusedPoint(pt);
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition cursor-pointer ${
                              isFocused
                                ? "bg-primary/15 text-foreground"
                                : "hover:bg-secondary/40 text-muted-foreground"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-semibold text-foreground">
                                {formatCoordinatePair(pt.latitude, pt.longitude)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatTimeShort(pt.timestamp)} • {Math.round(pt.speed)} km/h
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              #{idx + 1}
                            </span>
                          </motion.button>
                        );
                      })
                    )}

                    {streamCoords.length > visibleRows && (
                      <div className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setVisibleRows((v) => v + LOAD_MORE_STEP)}
                          className="rounded-lg bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
                        >
                          Mostrar mais ({(streamCoords.length - visibleRows).toLocaleString("pt-BR")} restantes)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
