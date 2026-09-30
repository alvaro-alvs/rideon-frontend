"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Check,
  CheckCheck,
  Flame,
  Radio,
  ShieldAlert,
  Trash2,
  Zap,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "alert" | "telemetry" | "system";
  unread: boolean;
  link?: string;
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Ignição Acionada",
    message: "A ignição da sua motocicleta foi ligada em São Paulo, SP.",
    timestamp: "Há 4 min",
    type: "alert",
    unread: true,
    link: "/dashboard",
  },
  {
    id: "notif-2",
    title: "Sinal GPS Sincronizado",
    message: "Dispositivo OBD-II conectou com 18 satélites ativos.",
    timestamp: "Há 25 min",
    type: "telemetry",
    unread: true,
    link: "/admin/devices",
  },
  {
    id: "notif-3",
    title: "Bateria Saudável",
    message: "Tensão da bateria estabilizada em 12.6V.",
    timestamp: "Há 2 horas",
    type: "telemetry",
    unread: false,
    link: "/dashboard",
  },
  {
    id: "notif-4",
    title: "Cerca Virtual Ativa",
    message: "Perímetro de segurança configurado com sucesso.",
    timestamp: "Há 1 dia",
    type: "system",
    unread: false,
  },
];

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "alert" | "telemetry">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (tab === "all") return true;
    return n.type === tab;
  });

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
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

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "alert":
        return <ShieldAlert className="size-4 text-primary" />;
      case "telemetry":
        return <Radio className="size-4 text-amber-400" />;
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
            className="absolute right-0 top-12 z-50 w-[360px] sm:w-[400px] overflow-hidden rounded-xl border border-border/90 bg-[#111111]/95 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/10"
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

            {/* Filter Tabs */}
            <div className="flex border-b border-border/80 bg-[#0d0d0d]/80 px-4 py-1.5 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setTab("all")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  tab === "all"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("alert")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
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
                className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
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
                    Nenhuma notificação
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Seu feed de alertas está atualizado.
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
                      {getIcon(n.type)}
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
