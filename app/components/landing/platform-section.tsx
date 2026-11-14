'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';

import { TelemetrySimulator } from '@/app/components/telemetry-simulator';

export function PlatformSection() {
  return (
    <section id="plataforma" className="relative overflow-hidden border-t border-border/80 py-24 lg:py-32">
      {/* Subtle background ambient gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/4 h-[600px] w-[600px] rounded-full bg-primary/6 blur-[140px]" />
        <div className="absolute bottom-10 left-10 h-[450px] w-[450px] rounded-full bg-primary/4 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* Left Column: Information */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">
              <Smartphone className="size-3.5" />
              Plataforma RideOn
            </div>

            <h2 className="mt-5 text-3xl font-bold uppercase tracking-tight sm:text-4xl lg:text-5xl">
              Sua segurança <br />
              <span className="text-primary">na palma da mão</span>.
            </h2>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Uma central clara, objetiva e ultrarrápida. Acompanhe a telemetria completa,
              status do motor, carga da bateria e histórico sem perder tempo com menus complicados.
            </p>

            {/* Platform Feature Checklist */}
            <ul className="mt-8 space-y-4">
              {[
                {
                  title: 'Posicionamento Satelital em Tempo Real',
                  desc: 'Acompanhe a movimentação contínua no mapa com precisão de metros.',
                },
                {
                  title: 'Bloqueio Remoto Antifurto',
                  desc: 'Acione o corte de ignição de forma segura direto pelo aplicativo.',
                },
                {
                  title: 'Gestão Inteligente Multi-Veículos',
                  desc: 'Monitore motos, carros e frotas completas em uma interface única.',
                },
                {
                  title: 'Cerca Virtual com Disparo Automático',
                  desc: 'Alertas no celular caso o veículo se mova para fora da área segura.',
                },
              ].map((item, index) => (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="flex items-start gap-3.5"
                >
                  <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
                    <CheckCircle2 className="size-3.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground sm:text-sm">
                      {item.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center gap-2 rounded bg-primary px-6 text-xs font-bold uppercase tracking-[0.09em] text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40"
              >
                <span>Proteger Meu Veículo</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded border border-border bg-card/60 px-5 text-xs font-semibold uppercase tracking-[0.09em] text-foreground backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-card"
              >
                <span>Acessar Demonstração</span>
              </Link>
            </div>
          </motion.div>

          {/* Right Column: High-Tech Interactive Dashboard Simulator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="relative my-6 sm:my-8"
          >
            <TelemetrySimulator />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
