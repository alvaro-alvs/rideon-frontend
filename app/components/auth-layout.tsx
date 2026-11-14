"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Radio,
  ShieldCheck,
} from "lucide-react";

import { RideOnLogo } from "@/app/components/rideon-logo";
import { TelemetrySimulator } from "@/app/components/telemetry-simulator";
import { useApiHealth } from "@/hooks/use-api-health";
import { useTenant } from "@/app/components/tenant-provider";

interface AuthLayoutProps {
  title: string;
  copy: string;
  activeTab?: "login" | "register";
  children: ReactNode;
}

export function AuthLayout({
  title,
  copy,
  children,
}: AuthLayoutProps) {
  const { branding } = useTenant();
  const brandName = branding.brand_name || "RideOn";
  const {
    status: apiStatus,
    latency,
    isPinging,
    pingCount,
    latencyHistory,
    pingNow,
  } = useApiHealth(5000);
  const isOnline = apiStatus === "online";
  const isChecking = apiStatus === "checking";

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.1fr] xl:grid-cols-[0.95fr_1.15fr]">
      {/* Left Column: Form & Interactions */}
      <section className="relative flex min-h-screen flex-col justify-between overflow-hidden overflow-y-auto px-6 py-8 sm:px-12 lg:px-16">
        {/* Ambient Animated Glows */}
        <motion.div
          aria-hidden="true"
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/15 blur-[130px]"
        />
        <motion.div
          aria-hidden="true"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="pointer-events-none absolute -bottom-32 right-0 size-80 rounded-full bg-primary/10 blur-[140px]"
        />

        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-between"
        >
          <RideOnLogo href="/" />
          <div className="flex items-center gap-4">
            {/* Real API Status Indicator (Top Bar) */}
            <button
              type="button"
              onClick={pingNow}
              title="Clique para testar o ping da API agora"
              className={`hidden cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all hover:brightness-110 sm:inline-flex ${
                isOnline
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : isChecking
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}
            >
              <span
                className={`size-1.5 rounded-full transition-transform ${
                  isPinging ? "scale-150 " : ""
                }${
                  isOnline
                    ? "animate-pulse bg-emerald-400"
                    : isChecking
                      ? "animate-pulse bg-amber-400"
                      : "bg-red-500"
                }`}
              />
              {isOnline
                ? `API Conectada${latency !== null ? ` • ${latency}ms` : ""}`
                : isChecking
                  ? "Checando API..."
                  : "API Indisponível"}
            </button>

            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Voltar</span>
            </Link>
          </div>
        </motion.div>

        {/* Center Container: Auth Card */}
        <div className="relative z-10 mx-auto my-auto w-full max-w-md py-10">
          {/* Heading */}
          <motion.header
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <p className="section-kicker flex items-center gap-2">
              <span className="relative flex size-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Área Segura {brandName}
            </p>
            <h1 className="mt-3 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-extrabold uppercase tracking-tight text-transparent sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {copy}
            </p>
          </motion.header>

          {/* Form Content */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/75 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-7"
          >
            {/* Subtle top highlight accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            />
            {children}
          </motion.div>

          {/* Security & Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-muted-foreground/80"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1">
              <ShieldCheck className="size-3.5 text-primary" />
              Criptografia 256-bit
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Sessão monitorada em tempo real
            </span>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="relative z-10 text-center text-xs text-muted-foreground/60 sm:text-left"
        >
          {brandName} Fleet &bull; Rastreamento, Telemetria &amp; Segurança
        </motion.footer>
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

          {/* Real API Status & Live Ping Monitor (Right Column) */}
          <div className="flex items-center gap-2.5">
            {isOnline && latencyHistory.length > 0 && (
              <div
                className="hidden items-end gap-0.5 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 xl:flex"
                title={`Últimos ${latencyHistory.length} pings: ${latencyHistory.join("ms, ")}ms`}
              >
                {latencyHistory.map((sample, idx) => {
                  const max = Math.max(...latencyHistory, 50);
                  const heightPct = Math.max(25, Math.min(100, Math.round((sample / max) * 100)));
                  return (
                    <span
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        sample < 150
                          ? "bg-emerald-400/80"
                          : sample < 400
                            ? "bg-amber-400/80"
                            : "bg-red-400/80"
                      }`}
                      style={{ height: `${Math.round((heightPct / 100) * 14)}px` }}
                    />
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={pingNow}
              title="Clique para executar ping na API agora"
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all hover:brightness-110 ${
                isOnline
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : isChecking
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              <Activity
                className={`size-3 transition-transform ${
                  isPinging ? "scale-125 animate-pulse" : ""
                }`}
              />
              {isOnline
                ? `API Online${latency !== null ? ` (${latency}ms)` : ""}`
                : isChecking
                  ? "Conectando..."
                  : "API Offline"}
              {isOnline && pingCount > 0 && (
                <span className="ml-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
                  #{pingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Visual Showcase Center: Interactive Telemetry Simulator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 my-auto py-10"
        >
          <TelemetrySimulator />
        </motion.div>

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
