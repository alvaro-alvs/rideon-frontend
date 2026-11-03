'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';

export function CTASection() {
  return (
    <section className="relative overflow-hidden border-t border-border/80 py-20 lg:py-28">
      {/* Background radial ambient lights */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[450px] w-[750px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 via-card/60 to-surface/90 p-8 sm:p-12 lg:p-16 backdrop-blur-xl shadow-2xl"
        >
          {/* Subtle top red glow line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Ambient inner glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-3.5" />
              Comece Hoje Mesmo
            </div>

            <h2 className="mt-6 text-3xl font-black uppercase tracking-tight sm:text-4xl lg:text-5xl">
              Pronto para ter total controle <br />
              <span className="text-primary">do seu veículo?</span>
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Cadastre-se na plataforma RideOn e tenha a segurança que você merece. Instalação rápida, suporte especializado e a tecnologia mais avançada do mercado.
            </p>

            {/* Benefit badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-muted-foreground sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Check className="size-3" />
                </span>
                <span>Sem Fidelidade Abusiva</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Check className="size-3" />
                </span>
                <span>Cobertura em Todo o Brasil</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Check className="size-3" />
                </span>
                <span>Suporte Técnico 24/7</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="group inline-flex min-h-12 items-center gap-2 rounded bg-primary px-7 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/50"
              >
                <span>Criar Minha Conta Grátis</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded border border-border bg-card/80 px-6 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary/50 hover:bg-card"
              >
                <ShieldCheck className="size-4 text-primary" />
                <span>Já Sou Cliente</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

