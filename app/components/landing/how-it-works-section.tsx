'use client';

import { motion } from 'motion/react';
import { Cpu, QrCode, Shield, Wrench } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: Wrench,
    title: 'Instalação Rápida e Discreta',
    description:
      'Dispositivo ultracompacto e resistente à água (IP67), posicionado em local oculto do veículo sem cortes no chicote original.',
    tag: 'Preserva a Garantia',
  },
  {
    step: '02',
    icon: QrCode,
    title: 'Pareamento em 1 Minuto',
    description:
      'Escaneie o código do seu equipamento no app RideOn e veja a telemetria do veículo sincronizada instantaneamente.',
    tag: 'Configuração Guiada',
  },
  {
    step: '03',
    icon: Shield,
    title: 'Monitoramento & Proteção 24h',
    description:
      'Defina cercas virtuais, receba alertas no WhatsApp ou push notification e tenha controle total do veículo onde você estiver.',
    tag: 'Tranquilidade Total',
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">
            <Cpu className="size-3.5" />
            Como Funciona
          </div>
          <h2 className="mt-5 text-3xl font-bold uppercase tracking-tight sm:text-4xl lg:text-5xl">
            Simples de instalar, <br />
            <span className="text-primary">fácil de monitorar</span>.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Sem complicações técnicas ou instalações invasivas. Em 3 etapas simples seu veículo está 100% protegido.
          </p>
        </motion.div>

        <div className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card/60 p-8 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/90"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black italic tracking-tighter text-muted-foreground/30 transition-colors group-hover:text-primary/60">
                      {item.step}
                    </span>
                    <span className="flex size-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-5" />
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-border/50 pt-4">
                  <span className="inline-block rounded-md bg-secondary/80 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground group-hover:border-primary/30 group-hover:text-foreground">
                    {item.tag}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

