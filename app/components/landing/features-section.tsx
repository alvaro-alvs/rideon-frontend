'use client';

import { motion } from 'motion/react';
import {
  BellRing,
  Compass,
  Gauge,
  Lock,
  Radio,
  ShieldAlert,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Radio,
    badge: 'Tempo Real',
    title: 'Rastreamento Contínuo',
    description:
      'Posição precisa por satélite GPS/4G atualizada a cada 10 segundos, com alta acurácia mesmo em túneis ou garagens.',
    highlight: 'Latência < 1s',
  },
  {
    icon: ShieldAlert,
    badge: 'Segurança Ativa',
    title: 'Cerca Virtual & Geofence',
    description:
      'Defina perímetros de segurança para sua casa ou trabalho. Seja notificado no primeiro metro que o veículo sair da zona demarcada.',
    highlight: 'Disparo Imediato',
  },
  {
    icon: Lock,
    badge: 'Proteção Antifurto',
    title: 'Bloqueio Remoto Instantâneo',
    description:
      'Em caso de suspeita ou emergência, corte a alimentação do motor diretamente pelo aplicativo com confirmação em tempo real.',
    highlight: 'Ação Emergencial',
  },
  {
    icon: BellRing,
    badge: 'Alertas Inteligentes',
    title: 'Notificações de Ignição e Vibração',
    description:
      'Sensor de vibração (G-sensor) detecta tentativas de arrombamento, tombamento ou reboque não autorizado antes mesmo da partida.',
    highlight: 'Aviso Push e WhatsApp',
  },
  {
    icon: Gauge,
    badge: 'Telemetria do Motor',
    title: 'Monitor de Bateria & Ignição',
    description:
      'Acompanhe a voltagem da bateria em tempo real e previna panes elétricas. Saiba imediatamente se a chave foi virada.',
    highlight: 'Alerta de Bateria Fraca',
  },
  {
    icon: Compass,
    badge: 'Histórico & Rotas',
    title: 'Relatório Completo de Viagens',
    description:
      'Revise trajetos percorridos, tempos de parada, velocidades médias e máximas alcançadas com visualização fluida no mapa.',
    highlight: 'Histórico Ilimitado',
  },
];

export function FeaturesSection() {
  return (
    <section
      id="recursos"
      className="relative overflow-hidden border-b border-border/80 bg-surface/80 py-24 lg:py-32"
    >
      {/* Subtle background glow and grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">
            <Zap className="size-3.5" />
            Recursos Avançados
          </div>
          <h2 className="mt-5 text-3xl font-bold uppercase tracking-tight sm:text-4xl lg:text-5xl">
            Tecnologia que protege <br className="hidden sm:inline" />
            <span className="text-primary">a cada quilômetro</span>.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Equipado com os mais avançados sensores e algoritmos de rastreamento para garantir que seu veículo esteja sempre seguro e sob seu controle.
          </p>
        </motion.div>

        {/* Features Bento Grid */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/90 hover:shadow-[0_8px_30px_-8px_rgba(239,37,27,0.18)]"
              >
                {/* Subtle top card glow line on hover */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_rgba(239,37,27,0.4)]">
                      <Icon className="size-5" />
                    </div>
                    <span className="rounded-full border border-border bg-secondary/80 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground group-hover:border-primary/30 group-hover:text-foreground">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold uppercase tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-border/50 pt-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors group-hover:text-primary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span>{feature.highlight}</span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

