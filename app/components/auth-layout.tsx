"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Globe,
  LockKeyhole,
  MapPin,
  Radio,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { RideOnLogo } from "@/app/components/rideon-logo";
import { useApiHealth } from "@/hooks/use-api-health";

interface AuthLayoutProps {
  title: string;
  copy: string;
  activeTab?: "login" | "register";
  children: ReactNode;
}

export function AuthLayout({
  title,
  copy,
  activeTab = "login",
  children,
}: AuthLayoutProps) {
  const { status: apiStatus, latency } = useApiHealth();
  const isOnline = apiStatus === "online";
  const isChecking = apiStatus === "checking";

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.1fr] xl:grid-cols-[0.95fr_1.15fr]">
      {/* Left Column: Form & Interactions */}
      <section className="relative flex min-h-screen flex-col justify-between overflow-y-auto px-6 py-8 sm:px-12 lg:px-16">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-32 -left-32 size-80 rounded-full bg-primary/10 blur-[120px]" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <RideOnLogo href="/" />
          <div className="flex items-center gap-4">
            {/* Real API Status Indicator (Top Bar) */}
            <span
              className={`hidden items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider sm:inline-flex ${
                isOnline
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : isChecking
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isOnline
                    ? "animate-pulse bg-emerald-400"
                    : isChecking
                      ? "animate-pulse bg-amber-400"
                      : "bg-red-500"
                }`}
              />
              {isOnline
                ? `API Conectada${latency ? ` • ${latency}ms` : ""}`
                : isChecking
                  ? "Checando API..."
                  : "API Indisponível"}
            </span>

            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Voltar</span>
            </Link>
          </div>
        </div>

        {/* Center Container: Auth Card */}
        <div className="relative z-10 mx-auto my-auto w-full max-w-md py-10">
          {/* Segmented Mode Switcher */}
          <div className="mb-8 grid grid-cols-2 rounded-lg border border-border/70 bg-secondary/50 p-1 backdrop-blur">
            <Link
              href="/login"
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === "login"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LockKeyhole className="size-3.5" />
              Entrar
            </Link>
            <Link
              href="/register"
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === "register"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="size-3.5" />
              Criar Conta
            </Link>
          </div>

          {/* Heading */}
          <header className="mb-8">
            <p className="section-kicker flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Área Segura RideOn
            </p>
            <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {copy}
            </p>
          </header>

          {/* Form Content */}
          <div className="rounded-xl border border-border/80 bg-card/60 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            {children}
          </div>

          {/* Security & Trust Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              Criptografia 256-bit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Sessão monitorada em tempo real
            </span>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 text-center text-xs text-muted-foreground/60 sm:text-left">
          RideOn Fleet &bull; Rastreamento, Telemetria &amp; Segurança
        </footer>
      </section>

      {/* Right Column: Clean, High-Performance Telemetry Map */}
      <aside className="auth-visual relative hidden flex-col justify-between overflow-hidden border-l border-border/70 p-10 lg:flex xl:p-14">
        {/* Ambient Dark Gradients */}
        <div className="absolute inset-0 bg-gradient-to-tr from-background/95 via-black/50 to-transparent" />
        <div className="pointer-events-none absolute top-1/4 right-1/4 size-96 rounded-full bg-primary/10 blur-[150px]" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
              <Radio className="size-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                Central de Rastreamento &amp; Telemetria
              </p>
              <p className="text-[11px] text-muted-foreground">
                Monitoramento Ativo &bull; Baixa Latência
              </p>
            </div>
          </div>

          {/* Real API Status Indicator (Right Column) */}
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
              isOnline
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : isChecking
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                isOnline
                  ? "animate-pulse bg-emerald-400"
                  : isChecking
                    ? "animate-pulse bg-amber-400"
                    : "bg-red-500"
              }`}
            />
            {isOnline
              ? `API Online${latency ? ` (${latency}ms)` : ""}`
              : isChecking
                ? "Conectando..."
                : "API Offline"}
          </span>
        </div>

        {/* Visual Showcase Center: Clean High-Performance Map */}
        <div className="relative z-10 my-auto py-6">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-card/75 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <span className="font-bold uppercase tracking-wider text-foreground">
                  Monitoramento Geoespacial
                </span>
              </div>
              <span className="flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Sinal GNSS
              </span>
            </div>

            {/* Simple, High-Performance Stylized Map Canvas */}
            <div className="relative h-[320px] w-full overflow-hidden rounded-lg border border-white/5 bg-[#0e0e0e]">
              <svg
                viewBox="0 0 500 320"
                className="size-full"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Subtle Grid Pattern */}
                  <pattern
                    id="map-grid"
                    width="32"
                    height="32"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 32 0 L 0 0 0 32"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.04)"
                      strokeWidth="1"
                    />
                  </pattern>

                  {/* Route Gradient */}
                  <linearGradient id="route-line" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef251b" stopOpacity="0.2" />
                    <stop offset="60%" stopColor="#ef251b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ef251b" stopOpacity="1" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                <rect width="100%" height="100%" fill="url(#map-grid)" />

                {/* Road / Sector Arteries */}
                <path
                  d="M 0,100 Q 150,80 260,160 T 500,140"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="2"
                />
                <path
                  d="M 120,320 L 220,0"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1.5"
                />
                <path
                  d="M 340,320 L 440,0"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1.5"
                />
                <path
                  d="M 0,220 C 180,240 320,180 500,260"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="1.5"
                />

                {/* Perimeter Geofence Zone */}
                <circle
                  cx="350"
                  cy="150"
                  r="65"
                  fill="rgba(239, 37, 27, 0.03)"
                  stroke="#ef251b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  strokeOpacity="0.35"
                />

                {/* Telemetry Trajectory Route */}
                <path
                  d="M 80,240 C 140,230 180,160 250,170 C 290,175 320,155 350,150"
                  fill="none"
                  stroke="url(#route-line)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Route Waypoints */}
                <circle cx="80" cy="240" r="4" fill="#a6a6a6" opacity="0.6" />
                <circle cx="170" cy="180" r="4" fill="#a6a6a6" opacity="0.6" />
                <circle cx="250" cy="170" r="4" fill="#a6a6a6" opacity="0.6" />

                {/* Active Target Pin with Glow Ring */}
                <circle
                  cx="350"
                  cy="150"
                  r="18"
                  fill="rgba(239, 37, 27, 0.2)"
                  stroke="#ef251b"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />
                <circle cx="350" cy="150" r="6" fill="#ef251b" />
                <circle cx="350" cy="150" r="2.5" fill="#ffffff" />
              </svg>

              {/* Bottom HUD Overlay with Real API Status */}
              <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between rounded-md border border-white/10 bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  Rastreamento em Tempo Real
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                  <span
                    className={`size-1.5 rounded-full ${
                      isOnline
                        ? "bg-emerald-400"
                        : isChecking
                          ? "bg-amber-400"
                          : "bg-red-500"
                    }`}
                  />
                  <span
                    className={
                      isOnline
                        ? "text-emerald-400"
                        : isChecking
                          ? "text-amber-400"
                          : "text-red-400"
                    }
                  >
                    {isOnline ? "API Online" : isChecking ? "Verificando..." : "API Offline"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="relative z-10 border-t border-white/10 pt-5">
          <div className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground">
              <Globe className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                Plataforma Unificada de Telemetria
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Posicionamento contínuo, rotas e alertas de segurança em tempo real.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
