'use client';

import { motion } from 'motion/react';
import { Activity, Clock, ShieldCheck, Wifi } from 'lucide-react';

const stats = [
  {
    icon: Activity,
    value: '99.98%',
    label: 'Uptime do Sistema',
    detail: 'Servidores em nuvem de alta disponibilidade',
  },
  {
    icon: Clock,
    value: '< 1.5s',
    label: 'Envio de Alertas',
    detail: 'Notificação instantânea em caso de violação',
  },
  {
    icon: Wifi,
    value: '4G LTE',
    label: 'Cobertura Nacional',
    detail: 'Multi-operadora com chip M2M dedicado',
  },
  {
    icon: ShieldCheck,
    value: '24 / 7',
    label: 'Monitoramento Ativo',
    detail: 'Proteção ininterrupta onde seu veículo estiver',
  },
];

export function StatsSection() {
  return (
    <section className="relative border-t border-border/80 bg-surface/50 py-16 sm:py-20">
      {/* Background radial accent */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(239,37,27,0.06),transparent)]" />

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -3 }}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="size-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                </div>

                <p className="mt-4 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">
                  {stat.label}
                </p>
                <p className="mt-2 text-[0.75rem] text-muted-foreground leading-normal">
                  {stat.detail}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

