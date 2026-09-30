"use client";

import { useState } from "react";
import {
  Activity,
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  Cpu,
  Radio,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export function J16SpecBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card/95 to-secondary/60 p-5 shadow-xl transition-all duration-300">
      {/* Background ambient accents */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-emerald-500/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: J16 Header & Identity */}
        <div className="flex items-start gap-3.5">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-inner">
            <Cpu className="size-6" />
            <span className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/25">
                <Sparkles className="size-3" />
                Hardware Padrão RideOn
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                4G LTE-M / Cat-1
              </span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-400 border border-blue-500/20">
                Protocolo GT06
              </span>
            </div>

            <h3 className="text-base font-black uppercase tracking-tight text-foreground sm:text-lg">
              Rastreador GPS J16 4G LTE
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dispositivo homologado para rastreamento de motocicletas com leitura de pós-chave (ACC), telemetria contínua e corte remoto de ignição.
            </p>
          </div>
        </div>

        {/* Right: Quick Features & Toggle Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Hardware Spec Badges */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/70 px-2.5 py-1.5">
              <Zap className="size-3.5 text-amber-400" />
              <span>9V-90V DC</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/70 px-2.5 py-1.5">
              <BatteryCharging className="size-3.5 text-emerald-400" />
              <span>Bateria 150mAh</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-secondary/90 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-white cursor-pointer"
          >
            <span>{expanded ? "Ocultar Esquema" : "Esquema & Pinagem J16"}</span>
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Technical Diagram / Pinout Details */}
      {expanded && (
        <div className="relative z-10 mt-5 pt-5 border-t border-border/70 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Box 1: Pinagem Chicote 4 Vias */}
          <div className="rounded-xl border border-border/70 bg-card/80 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Zap className="size-4 text-amber-400" />
              <span>Chicote Principal (4 Vias)</span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[11px]">
              <li className="flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="size-2 rounded-full bg-red-500" />
                  Vermelho (VCC)
                </span>
                <span className="text-muted-foreground">+9V a 90V DC</span>
              </li>
              <li className="flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <span className="size-2 rounded-full bg-neutral-400" />
                  Preto (GND)
                </span>
                <span className="text-muted-foreground">Terra / Negativo</span>
              </li>
              <li className="flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5 text-orange-400">
                  <span className="size-2 rounded-full bg-orange-500" />
                  Laranja (ACC)
                </span>
                <span className="text-muted-foreground">Pós-Chave / Ignição</span>
              </li>
              <li className="flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <span className="size-2 rounded-full bg-yellow-500" />
                  Amarelo (Relé)
                </span>
                <span className="text-muted-foreground">Corte de Combustível</span>
              </li>
            </ul>
          </div>

          {/* Box 2: Diagnóstico de LEDs */}
          <div className="rounded-xl border border-border/70 bg-card/80 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Radio className="size-4 text-primary" />
              <span>Diagnóstico de LEDs J16</span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[11px]">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                  LED Azul (GPS)
                </span>
                <span className="text-muted-foreground">Fixo = Satélites Fixados</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <span className="size-2 rounded-full bg-amber-500" />
                  LED Amarelo (GSM)
                </span>
                <span className="text-muted-foreground">Piscando = Rede 4G OK</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <span className="size-2 rounded-full bg-red-500" />
                  LED Vermelho (PWR)
                </span>
                <span className="text-muted-foreground">Fixo = Alimentado</span>
              </li>
            </ul>
          </div>

          {/* Box 3: Especificações de Rede */}
          <div className="rounded-xl border border-border/70 bg-card/80 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Activity className="size-4 text-emerald-400" />
              <span>Conectividade & Protocolo</span>
            </div>
            <div className="mt-2.5 space-y-1 text-[11px] text-muted-foreground">
              <p>
                <b className="text-foreground">Bandas 4G:</b> LTE-FDD B1/B2/B3/B4/B5/B7/B8/B28
              </p>
              <p>
                <b className="text-foreground">Protocolo:</b> GT06 Binary (compatível RideOn BFF)
              </p>
              <p>
                <b className="text-foreground">Sensibilidade GPS:</b> -165 dBm (precisão &lt; 5m)
              </p>
            </div>
          </div>

          {/* Box 4: Recursos de Segurança */}
          <div className="rounded-xl border border-border/70 bg-card/80 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <ShieldCheck className="size-4 text-blue-400" />
              <span>Recursos & Alertas</span>
            </div>
            <div className="mt-2.5 space-y-1 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-1 text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Alerta de corte de energia principal
              </p>
              <p className="flex items-center gap-1 text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Detecção de vibração e reboque
              </p>
              <p className="flex items-center gap-1 text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Bloqueio gradual por velocidade
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
