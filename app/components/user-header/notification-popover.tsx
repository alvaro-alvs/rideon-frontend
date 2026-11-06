"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CheckCheck,
  Flame,
  Radio,
  ShieldAlert,
  Trash2,
  Zap,
  ExternalLink,
  Power,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "alert" | "ignition" | "telemetry" | "system";
  unread: boolean;
  link?: string;
  rawType?: string;
  createdAt: string;
};

interface BackendAlert {
  id: string;
  tenant_id?: string;
  motorcycle_id?: string;
  rider_id?: string;
  device_id?: string;
  imei?: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  source?: string;
  read?: boolean;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "Agora";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return dateStr;
  }
}

function resolveAlertCategory(type: string): NotificationItem["type"] {
  if (type === "ignition_on" || type === "ignition_off" || type === "illegal_ignition") {
    return "ignition";
  }
  if (
    type === "speeding" ||
    type === "power_cut" ||
    type === "vibration_shock" ||
    type === "towing" ||
    type === "sos" ||
    type === "possible_crash" ||
    type === "tamper" ||
    type === "fall_down"
  ) {
    return "alert";
  }
  if (type === "geofence_enter" || type === "geofence_exit" || type === "low_battery" || type === "low_external_power") {
    return "telemetry";
  }
  return "system";
}

function resolveAlertTitle(item: BackendAlert): string {
  switch (item.type) {
    case "ignition_on":
      return "Ignição Ligada";
    case "ignition_off":
      return "Ignição Desligada";
    case "illegal_ignition":
      return "Alerta de Partida Indevida";
    case "power_cut":
      return "Cabo de Bateria Cortado";
    case "vibration_shock":
      return "Vibração Suspeita";
    case "towing":
      return "Possível Guincho / Reboque";
    case "sos":
      return "Botão de Pânico / SOS";
    case "speeding":
      return "Excesso de Velocidade";
    case "geofence_enter":
      return "Entrada em Cerca Virtual";
    case "geofence_exit":
      return "Saída de Cerca Virtual";
    case "low_battery":
      return "Bateria do Rastreador Fraca";
    case "low_external_power":
      return "Bateria da Moto Fraca";
    case "fall_down":
      return "Queda da Motocicleta";
    default:
      return item.message ? item.message.split(":")[0] : "Notificação";
  }
}

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "alert" | "ignition" | "telemetry">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const currentUserState = useCurrentUser();
  const userRole = currentUserState.status === "authenticated" ? currentUserState.user.role : "rider";
  const isAdmin = isPlatformOrTenantAdmin(userRole);

  // Admins do not see all vehicles by default. Option starts false (disabled by default) and can be enabled.
  const [allVehicles, setAllVehicles] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("rideon_admin_all_vehicles_notif") === "true";
    }
    return false;
  });

  const toggleAllVehicles = () => {
    setAllVehicles((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("rideon_admin_all_vehicles_notif", String(next));
      }
      return next;
    });
  };

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (isAdmin && allVehicles) {
        params.set("all_vehicles", "true");
      }
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data: BackendAlert[] = Array.isArray(json.data) ? json.data : [];
        const items: NotificationItem[] = data.map((d) => ({
          id: d.id,
          title: resolveAlertTitle(d),
          message: d.message,
          timestamp: formatRelativeTime(d.created_at),
          type: resolveAlertCategory(d.type),
          unread: !d.read && d.status !== "acknowledged" && d.status !== "resolved",
          link: d.motorcycle_id ? `/dashboard?vehicle=${d.motorcycle_id}` : undefined,
          rawType: d.type,
          createdAt: d.created_at,
        }));
        setNotifications(items);
      }
    } catch (err) {
      console.warn("Falha ao carregar notificacoes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, allVehicles]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // WebSocket Live Updates
  useEffect(() => {
    let isMounted = true;

    async function connectWs() {
      try {
        const tokenRes = await fetch("/api/auth/token");
        if (!tokenRes.ok) return;
        const { token } = await tokenRes.json();
        if (!token || !isMounted) return;

        const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
        const proto = isHttps ? "wss:" : "ws:";
        const host = (typeof window !== "undefined" && window.location.hostname) || "localhost";
        const envWs = process.env.NEXT_PUBLIC_WS_URL;

        let wsUrl = `${proto}//${host}:8080/ws?token=${encodeURIComponent(token)}`;
        if (envWs) {
          try {
            const parsed = new URL(envWs, window.location.origin);
            if (isHttps && parsed.protocol === "ws:") parsed.protocol = "wss:";
            parsed.searchParams.set("token", token);
            if (isAdmin && allVehicles) parsed.searchParams.set("all_vehicles", "true");
            wsUrl = parsed.toString();
          } catch {
            // fallback
          }
        } else if (isAdmin && allVehicles) {
          wsUrl += "&all_vehicles=true";
        }

        if (wsRef.current) {
          wsRef.current.close();
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Verify if payload is an alert / notification event
            if (data.type || data.severity || data.message) {
              const newAlert: BackendAlert = {
                id: data.id || `ws-${Date.now()}`,
                type: data.type || "system",
                severity: data.severity || "info",
                status: data.status || "pending",
                message: data.message || "Novo alerta detectado",
                motorcycle_id: data.motorcycle_id || data.MotorcycleID,
                read: false,
                created_at: data.created_at || new Date().toISOString(),
              };

              const newItem: NotificationItem = {
                id: newAlert.id,
                title: resolveAlertTitle(newAlert),
                message: newAlert.message,
                timestamp: "Agora",
                type: resolveAlertCategory(newAlert.type),
                unread: true,
                link: newAlert.motorcycle_id ? `/dashboard?vehicle=${newAlert.motorcycle_id}` : undefined,
                rawType: newAlert.type,
                createdAt: newAlert.created_at,
              };

              setNotifications((prev) => [newItem, ...prev.filter((item) => item.id !== newItem.id)]);
            }
          } catch {
            // Ignore non-alert messages
          }
        };
      } catch (err) {
        console.warn("[WS] Erro ao conectar websocket de notificações:", err);
      }
    }

    connectWs();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAdmin, allVehicles]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (tab === "all") return true;
    return n.type === tab;
  });

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      console.warn("Falha ao marcar todas como lidas:", err);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch (err) {
      console.warn("Falha ao marcar como lida:", err);
    }
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const getIcon = (type: NotificationItem["type"], rawType?: string) => {
    switch (type) {
      case "ignition":
        if (rawType === "ignition_off") {
          return <Power className="size-4 text-zinc-400" />;
        }
        return <Flame className="size-4 text-amber-500 animate-pulse" />;
      case "alert":
        return <ShieldAlert className="size-4 text-primary" />;
      case "telemetry":
        return <Radio className="size-4 text-cyan-400" />;
      case "system":
        return <Zap className="size-4 text-emerald-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Abrir notificações"
        aria-expanded={isOpen}
        className={`relative flex size-10 items-center justify-center rounded-lg border transition-all duration-200 ${
          isOpen
            ? "border-primary/60 bg-primary/10 text-primary shadow-lg shadow-primary/10"
            : "border-border/70 bg-card/60 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
        }`}
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground shadow-md shadow-primary/50">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative">{unreadCount}</span>
          </span>
        )}
      </button>

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 380 }}
            className="absolute right-0 top-12 z-50 w-[360px] sm:w-[420px] overflow-hidden rounded-xl border border-border/90 bg-[#111111]/95 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/10"
          >
            {/* Red Accent Header Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 p-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/20 text-primary">
                  <Flame className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Notificações & Alertas
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {unreadCount > 0
                      ? `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`
                      : "Todas as notificações lidas"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchNotifications}
                  title="Atualizar"
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
                </button>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                  >
                    <CheckCheck className="size-3.5" />
                    Marcar lidas
                  </button>
                )}
              </div>
            </div>

            {/* Admin Toggle: View all vehicles (Disabled by default, toggleable) */}
            {isAdmin && (
              <div className="flex items-center justify-between border-b border-border/70 bg-secondary/30 px-4 py-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    Modo Frota Completa
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono font-normal">
                      Admin
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {allVehicles
                      ? "Visualizando notificações de todos os veículos"
                      : "Apenas seus veículos atribuídos (padrão)"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleAllVehicles}
                  role="switch"
                  aria-checked={allVehicles}
                  aria-label="Habilitar notificações de todos os veículos"
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allVehicles ? "bg-primary" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      allVehicles ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex border-b border-border/80 bg-[#0d0d0d]/80 px-4 py-1.5 gap-1.5 text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setTab("all")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                  tab === "all"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("ignition")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                  tab === "ignition"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Ignição ({notifications.filter((n) => n.type === "ignition").length})
              </button>
              <button
                type="button"
                onClick={() => setTab("alert")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                  tab === "alert"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Alertas ({notifications.filter((n) => n.type === "alert").length})
              </button>
              <button
                type="button"
                onClick={() => setTab("telemetry")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                  tab === "telemetry"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Telemetria ({notifications.filter((n) => n.type === "telemetry").length})
              </button>
            </div>

            {/* List */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40">
              {filteredNotifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="mx-auto size-7 text-muted-foreground/40" />
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    Nenhuma notificação encontrada
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAdmin && !allVehicles
                      ? "Para visualizar toda a frota, ative a opção acima."
                      : "Seu feed de alertas está atualizado."}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      n.unread
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary border border-border/80">
                      {getIcon(n.type, n.rawType)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {n.message}
                      </p>

                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setIsOpen(false)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                        >
                          Ver detalhes
                          <ExternalLink className="size-2.5" />
                        </Link>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {n.unread && (
                        <span className="size-2 rounded-full bg-primary ring-2 ring-primary/20" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => removeNotification(n.id, e)}
                        title="Remover notificação"
                        className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-400 transition-all"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/80 bg-[#0d0d0d]/80 px-4 py-2.5 text-[11px] text-muted-foreground">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sentinel
              </span>
              <Link
                href="/dashboard/settings"
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Gerenciar Alertas
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
