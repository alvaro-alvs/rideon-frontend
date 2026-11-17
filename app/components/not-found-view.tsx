"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Home,
  LayoutDashboard,
  MapPinOff,
} from "lucide-react";

import { useTenant } from "@/app/components/tenant-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";

export function NotFoundView() {
  const router = useRouter();
  const { branding } = useTenant();
  const currentUser = useCurrentUser();

  const brandName = branding.brand_name || "RideOn";
  const isAuthenticated = currentUser.status === "authenticated";
  const dashboardHref =
    isAuthenticated && isPlatformOrTenantAdmin(currentUser.user.role)
      ? "/admin"
      : "/dashboard";

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const quickLinks = [
    {
      href: "/",
      title: "Página Inicial",
      desc: "Voltar para a vitrine principal",
      icon: Home,
    },
    {
      href: isAuthenticated ? dashboardHref : "/login",
      title: isAuthenticated ? "Meu Painel" : "Acessar Conta",
      desc: isAuthenticated ? "Acompanhar seus veículos" : "Entrar na plataforma",
      icon: LayoutDashboard,
    },
    {
      href: "/#recursos",
      title: "Recursos",
      desc: "Conheça nossa tecnologia",
      icon: Compass,
    },
  ];

  return (
    <main className="relative flex flex-1 items-center overflow-hidden pt-28 pb-20 lg:pt-32 lg:pb-24">
      {/* Subtle Ambient Background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="mini-map absolute inset-0 opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.42, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 size-[460px] rounded-full bg-primary/14 blur-[140px]"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.15, 0.28, 0.15] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute right-0 bottom-0 size-[420px] rounded-full bg-primary/10 blur-[150px]"
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left Column: Clean Messaging & Actions */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Fora de rota</span>
            </div>

            <div className="mt-5">
              <span
                aria-hidden="true"
                className="font-display block bg-gradient-to-b from-foreground via-foreground/85 to-foreground/25 bg-clip-text text-7xl font-black leading-none tracking-tighter text-transparent sm:text-8xl lg:text-[7.5rem]"
              >
                404
              </span>

              <h1 className="mt-2 text-3xl font-extrabold uppercase leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
                Página não{" "}
                <span className="text-primary">encontrada.</span>
              </h1>
            </div>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              O caminho que você procurou não existe ou mudou de endereço. Volte
              ao início ou acesse sua conta{" "}
              <span className="font-semibold text-foreground">{brandName}</span>{" "}
              para continuar navegando.
            </p>

            {/* Primary & Secondary Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              {isAuthenticated ? (
                <Link
                  href={dashboardHref}
                  className="group inline-flex min-h-12 items-center gap-2.5 rounded bg-primary px-6 text-xs font-bold uppercase tracking-[0.09em] text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/45"
                >
                  <LayoutDashboard className="size-4" />
                  <span>Acessar Meu Painel</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link
                  href="/"
                  className="group inline-flex min-h-12 items-center gap-2.5 rounded bg-primary px-6 text-xs font-bold uppercase tracking-[0.09em] text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/45"
                >
                  <Home className="size-4" />
                  <span>Voltar ao Início</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleGoBack}
                className="group inline-flex min-h-12 cursor-pointer items-center gap-2 rounded border border-border bg-card/70 px-5 text-xs font-semibold uppercase tracking-[0.09em] text-foreground backdrop-blur-md transition-all hover:border-primary/60 hover:bg-secondary"
              >
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                <span>Página Anterior</span>
              </button>
            </div>

            {/* Clean Quick Links */}
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group rounded-xl border border-border/75 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-primary/45 hover:bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-8 place-items-center rounded-lg border border-border/80 bg-secondary text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                        <Icon className="size-4" />
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <h2 className="mt-3 text-xs font-bold uppercase tracking-wider text-foreground">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column: Minimalist Radar Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
            className="relative mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08] bg-card/60 p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
          >
            {/* Subtle top accent line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="mini-map pointer-events-none absolute inset-0 opacity-45" />

            {/* Concentric Radar Rings */}
            <div className="relative flex size-64 items-center justify-center sm:size-72">
              <div className="absolute inset-0 rounded-full border border-border/75" />
              <div className="absolute inset-8 rounded-full border border-dashed border-border/65" />
              <div className="absolute inset-16 rounded-full border border-primary/25" />
              <div className="absolute inset-24 rounded-full border border-primary/20 bg-primary/[0.04]" />

              {/* Subtle Crosshair */}
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/50" />
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/50" />

              {/* Smooth Radar Sweep */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, color-mix(in srgb, var(--primary) 26%, transparent) 0deg, transparent 68deg, transparent 360deg)",
                }}
              />

              {/* Center Pin Emblem */}
              <div className="relative z-10 flex size-16 items-center justify-center rounded-full border border-primary/40 bg-background/90 shadow-xl shadow-primary/20">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <MapPinOff className="relative size-7 text-primary" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
