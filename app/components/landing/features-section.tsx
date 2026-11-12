'use client';

import { useRef } from 'react';
import { motion, type Variants } from 'motion/react';
import {
  Activity,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Compass,
  Gauge,
  Lock,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Radio,
    badge: 'Tempo Real',
    title: 'Rastreamento Contínuo',
    description:
      'Posição precisa por satélite GPS/4G atualizada a cada 10 segundos, com alta acurácia mesmo em túneis ou garagens subterrâneas.',
    highlight: 'Latência < 1s',
    spec: 'GPS • GLONASS • 4G LTE',
  },
  {
    icon: ShieldAlert,
    badge: 'Segurança Ativa',
    title: 'Cerca Virtual & Geofence',
    description:
      'Demarque perímetros seguros para casa, trabalho ou garagem. Receba alertas imediatos no primeiro metro que o veículo sair da zona demarcada.',
    highlight: 'Disparo Imediato',
    spec: 'Perímetro ajustável ±1m',
  },
  {
    icon: Lock,
    badge: 'Proteção Antifurto',
    title: 'Bloqueio Remoto Instantâneo',
    description:
      'Em caso de suspeita ou emergência, corte a alimentação do motor diretamente pelo aplicativo com confirmação criptografada em tempo real.',
    highlight: 'Ação Emergencial',
    spec: 'Corte Seguro via 2FA',
  },
  {
    icon: BellRing,
    badge: 'Alertas Inteligentes',
    title: 'Notificações de Ignição e Vibração',
    description:
      'Sensor de vibração (G-sensor) detecta tentativas de arrombamento, tombamento ou reboque não autorizado antes mesmo da partida.',
    highlight: 'Push & WhatsApp',
    spec: 'Sensor G 3 Eixos',
  },
  {
    icon: Gauge,
    badge: 'Telemetria do Motor',
    title: 'Monitor de Bateria & Ignição',
    description:
      'Acompanhe a voltagem da bateria em tempo real e previna panes elétricas. Saiba imediatamente quando a chave de ignição for virada.',
    highlight: 'Diagnóstico Ativo',
    spec: 'Faixa 9V a 36V Contínua',
  },
  {
    icon: Compass,
    badge: 'Histórico & Rotas',
    title: 'Relatório Completo de Viagens',
    description:
      'Revise trajetos percorridos, tempos de parada, velocidades médias e máximas alcançadas com reprodução fluida no mapa.',
    highlight: 'Histórico Ilimitado',
    spec: 'Exportação GPX / PDF',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.15,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: 'easeOut',
    },
  },
};

function FeatureCard({ feature }: { feature: (typeof features)[number] }) {
  const spotlightRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const spotlight = spotlightRef.current;
    if (!spotlight) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spotlight.style.background = `radial-gradient(360px circle at ${x}px ${y}px, rgba(239, 37, 27, 0.14), transparent 75%)`;
  }

  const Icon = feature.icon;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
      onMouseMove={handleMouseMove}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-card/50 p-7 sm:p-8 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:bg-card/80 hover:shadow-[0_20px_45px_-15px_rgba(239,37,27,0.18)]"
    >
      {/* Interactive Cursor Spotlight (DOM ref update — zero React re-renders) */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Top ambient glow line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Subtle inner top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.06]" />

      <div className="relative z-10">
        {/* Header row: Icon & Status Badge */}
        <div className="flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
            transition={{ duration: 0.3 }}
            className="flex size-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-foreground/90 transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-[0_0_25px_rgba(239,37,27,0.25)]"
          >
            <Icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
          </motion.div>

          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground transition-colors duration-300 group-hover:border-primary/30 group-hover:text-foreground">
            <span className="size-1.5 rounded-full bg-primary/70 group-hover:bg-primary group-hover:animate-ping" />
            {feature.badge}
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          <h3 className="text-lg font-bold uppercase tracking-tight text-foreground transition-colors duration-300 group-hover:text-white">
            {feature.title}
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground/90 sm:text-sm">
            {feature.description}
          </p>
        </div>
      </div>

      {/* Minimalist Telemetry / Specs Footer */}
      <div className="relative z-10 mt-8 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs font-semibold uppercase tracking-[0.08em] transition-colors">
        <div className="flex items-center gap-2 text-muted-foreground transition-colors duration-300 group-hover:text-primary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span>{feature.highlight}</span>
        </div>

        <div className="flex items-center gap-1 text-[0.68rem] font-mono tracking-wider text-muted-foreground/60 transition-colors duration-300 group-hover:text-muted-foreground">
          <span>{feature.spec}</span>
          <ArrowUpRight className="size-3.5 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 text-primary" />
        </div>
      </div>
    </motion.article>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="recursos"
      className="relative overflow-hidden border-t border-border/80 bg-surface/80 py-24 lg:py-32"
    >
      {/* Background glow and subtle dot grid with radial fade */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[550px] w-[850px] -translate-x-1/2 rounded-full bg-primary/8 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/3 h-[400px] w-[600px] rounded-full bg-primary/4 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_90%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary shadow-[0_0_20px_rgba(239,37,27,0.15)]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <Zap className="size-3.5" />
            Recursos Avançados
          </div>

          <h2 className="mt-5 text-3xl font-bold uppercase tracking-tight sm:text-4xl lg:text-5xl">
            Tecnologia que protege <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary via-red-500 to-rose-400 bg-clip-text text-transparent">
              a cada quilômetro
            </span>.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Equipado com os mais avançados sensores e algoritmos de rastreamento para garantir que seu veículo esteja sempre seguro e sob seu controle absoluto.
          </p>
        </motion.div>

        {/* Features Staggered Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>

        {/* Minimalist Trust & Certification Badges Strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-6 border-t border-white/[0.06] pt-10 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            <span>Hardware Homologado Anatel</span>
          </div>
          <span className="hidden size-1 rounded-full bg-white/20 sm:inline" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>Criptografia de Ponta a Ponta AES-256</span>
          </div>
          <span className="hidden size-1 rounded-full bg-white/20 sm:inline" />
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>99.98% de Uptime e Conexão 4G Multi-Operadora</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


