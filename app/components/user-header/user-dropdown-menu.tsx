"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bike,
  ChevronDown,
  Cpu,
  History,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import { useCurrentUser } from "@/hooks/use-current-user";

export function UserDropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [antiTheftActive, setAntiTheftActive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const currentUser = useCurrentUser();

  const user = currentUser.status === "authenticated" ? currentUser.user : null;
  const isAdmin = user?.role === "admin";

  const email = user?.email || "piloto@rideon.com";
  const userInitials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      setLoggingOut(false);
      setIsOpen(false);
    }
  };

  // Close when clicking outside or pressing Escape
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

  return (
    <div ref={containerRef} className="relative">
      {/* User Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Menu do usuário"
        aria-expanded={isOpen}
        className={`group flex items-center gap-2.5 rounded-xl border p-1.5 pr-3 transition-all duration-200 ${
          isOpen
            ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/10"
            : "border-border/70 bg-card/60 hover:border-border hover:bg-secondary/70"
        }`}
      >
        {/* Avatar with Status Ring */}
        <div className="relative">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-rose-500 font-bold text-xs text-white shadow-md shadow-primary/30">
            {userInitials || "RO"}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </span>
        </div>

        {/* User Info (Desktop) */}
        <div className="hidden text-left sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {email.split("@")[0]}
            </span>
            <span
              className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-widest ${
                isAdmin
                  ? "bg-primary text-white"
                  : "bg-secondary text-primary border border-primary/30"
              }`}
            >
              {isAdmin ? "ADMIN" : "PILOTO"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
            {email}
          </p>
        </div>

        {/* Animated Chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground group-hover:text-foreground"
        >
          <ChevronDown className="size-4" />
        </motion.div>
      </button>

      {/* Dropdown Menu Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 380 }}
            className="absolute right-0 top-12 z-50 w-[300px] sm:w-[320px] overflow-hidden rounded-xl border border-border/90 bg-[#121212]/95 shadow-2xl shadow-black/85 backdrop-blur-2xl ring-1 ring-white/10"
          >
            {/* Top Red Glow Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

            {/* Profile Overview Banner */}
            <div className="border-b border-border/80 bg-gradient-to-b from-[#181818] to-[#121212] p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-red-600 to-rose-700 text-sm font-bold text-white shadow-lg shadow-primary/30 ring-2 ring-primary/20">
                  {userInitials || "RO"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold uppercase tracking-wide text-foreground">
                      {email.split("@")[0]}
                    </p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                        isAdmin
                          ? "bg-primary text-white"
                          : "bg-primary/20 text-primary border border-primary/30"
                      }`}
                    >
                      {isAdmin ? "Admin" : "Piloto"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground font-mono">
                    {email}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  Rastreamento 24/7 Ativo
                </span>
                <span className="font-mono text-[10px] text-emerald-500/80 uppercase">
                  Protegido
                </span>
              </div>
            </div>

            {/* Quick Toggle: Modo Anti-furto */}
            <div className="border-b border-border/80 bg-[#0e0e0e]/90 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-primary" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                      Modo Anti-Furto
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      Alerta instantâneo de movimento
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAntiTheftActive((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    antiTheftActive ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      antiTheftActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="p-2 space-y-0.5">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                Navegação
              </p>

              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-6 items-center justify-center rounded bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    <LayoutDashboard className="size-3.5" />
                  </div>
                  <span>Visão Geral</span>
                </div>
                <span className="text-[10px] text-muted font-mono group-hover:text-primary transition-colors">
                  LIVE
                </span>
              </Link>

              <Link
                href="/dashboard/vehicles"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-6 items-center justify-center rounded bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    <Bike className="size-3.5" />
                  </div>
                  <span>Meus Veículos</span>
                </div>
                <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                  Garagem
                </span>
              </Link>

              <Link
                href="/dashboard/devices"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-6 items-center justify-center rounded bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    <Cpu className="size-3.5" />
                  </div>
                  <span>Dispositivos & GPS</span>
                </div>
                {isAdmin ? (
                  <span className="rounded bg-primary px-1.5 py-0.2 text-[9px] font-black uppercase text-white">
                    Admin
                  </span>
                ) : (
                  <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                    GPS
                  </span>
                )}
              </Link>

              <Link
                href="/dashboard/history"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-6 items-center justify-center rounded bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    <History className="size-3.5" />
                  </div>
                  <span>Histórico de Trajetos</span>
                </div>
              </Link>

              <div className="my-1 border-t border-border/60" />

              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                Configurações & Conta
              </p>

              <Link
                href="/dashboard/settings"
                onClick={() => setIsOpen(false)}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <div className="flex size-6 items-center justify-center rounded bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                  <Settings className="size-3.5" />
                </div>
                <span>Configurações</span>
              </Link>

              <Link
                href="/dashboard/settings#seguranca"
                onClick={() => setIsOpen(false)}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <div className="flex size-6 items-center justify-center rounded bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                  <Shield className="size-3.5" />
                </div>
                <span>Segurança & 2FA</span>
              </Link>
            </div>

            {/* Logout Footer Button */}
            <div className="border-t border-border/80 bg-[#0a0a0a] p-2">
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="size-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>{loggingOut ? "Encerrando sessão..." : "Sair da Conta"}</span>
                </div>
                {loggingOut && (
                  <span className="size-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
