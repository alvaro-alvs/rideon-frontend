import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ChartNoAxesCombined,
  LocateFixed,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { PublicHeader } from "@/app/components/public-header";
import { RideOnLogo } from "@/app/components/rideon-logo";

const features = [
  [
    LocateFixed,
    "Localize",
    "Veja sua moto em tempo real, com posicao e status sempre atualizados.",
  ],
  [
    BellRing,
    "Receba alertas",
    "Saiba imediatamente sobre movimentos e eventos fora do padrao.",
  ],
  [
    ShieldCheck,
    "Proteja",
    "Mantenha seus ativos monitorados e suas areas seguras configuradas.",
  ],
  [
    ChartNoAxesCombined,
    "Analise e evolua",
    "Acompanhe trajetos, distancias e o historico completo de uso.",
  ],
] as const;
const platformItems = [
  { icon: MapPin, text: "Posicao precisa dos seus veiculos" },
  { icon: Smartphone, text: "Experiencia simples em qualquer tela" },
  { icon: LockKeyhole, text: "Informacoes organizadas e protegidas" },
];
const vehicleStats = [
  { label: "Velocidade", value: "72 km/h" },
  { label: "Bateria", value: "12.6 V" },
  { label: "Atualizacao", value: "Agora" },
  { label: "Ignicao", value: "Ligada" },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <PublicHeader />
      <main>
        <section className="relative flex min-h-[720px] items-center overflow-hidden pt-20 lg:min-h-[820px]">
          <Image
            src="/rideon-hero.jpg"
            alt="Painel RideOn com motocicleta e aplicacao de rastreamento"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="hero-overlay absolute inset-0" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 lg:px-8">
            <div className="max-w-2xl">
              <p className="section-kicker">Rastreamento e seguranca</p>
              <h1 className="mt-6 text-5xl font-extrabold uppercase leading-[.96] sm:text-6xl lg:text-8xl">
                Sua moto.
                <br />
                <span className="text-primary">Sempre no radar.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Tecnologia em tempo real para voce pilotar com liberdade.
                Localize, proteja e acompanhe tudo em um so lugar.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex min-h-11 items-center gap-2 bg-primary px-5 text-sm font-semibold uppercase tracking-[.08em] text-primary-foreground hover:bg-primary/90"
                >
                  Proteja sua moto <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center border border-border bg-background/40 px-5 text-sm font-semibold uppercase tracking-[.08em] hover:border-primary"
                >
                  Acessar plataforma
                </Link>
              </div>
              <div className="mt-14 grid max-w-xl grid-cols-3 border-t border-border/70 pt-6">
                <div>
                  <strong className="metric">24h</strong>
                  <span className="metric-label">Monitoramento</span>
                </div>
                <div>
                  <strong className="metric">2.4s</strong>
                  <span className="metric-label">Atualizacao</span>
                </div>
                <div>
                  <strong className="metric">100%</strong>
                  <span className="metric-label">Controle</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          id="recursos"
          className="border-y border-border bg-surface py-24 lg:py-32"
        >
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
              <div>
                <p className="section-kicker">Controle total</p>
                <h2 className="section-title mt-5">
                  Tecnologia que acompanha o seu ritmo.
                </h2>
              </div>
              <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
                {features.map(([Icon, title, copy]) => (
                  <article key={title} className="bg-card p-7 lg:p-9">
                    <Icon className="size-7 text-primary" />
                    <h3 className="mt-7 text-lg font-semibold uppercase">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {copy}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section id="plataforma" className="py-24 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="section-kicker">Plataforma RideOn</p>
              <h2 className="section-title mt-5">
                Sua seguranca na palma da mao.
              </h2>
              <p className="mt-6 max-w-lg leading-7 text-muted-foreground">
                Uma central clara e objetiva para acompanhar localizacao,
                bateria, ignicao e alertas sem perder tempo.
              </p>
              <ul className="mt-10 space-y-5">
                {platformItems.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-4 text-sm font-medium"
                  >
                    <span className="grid size-10 place-items-center border border-primary/30 bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative border border-border bg-card p-4">
              <div className="flex items-center justify-between border-b border-border p-4">
                <RideOnLogo compact />
                <span className="text-[.65rem] font-bold uppercase tracking-[.12em] text-primary">
                  Online
                </span>
              </div>
              <div className="mini-map relative mt-4 h-64 overflow-hidden border border-border">
                <span className="absolute left-[58%] top-[38%] grid size-10 place-items-center rounded-full bg-primary">
                  <MapPin className="size-5 text-primary-foreground" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {vehicleStats.map(({ label, value }) => (
                  <div
                    key={label}
                    className="border border-border bg-secondary p-4"
                  >
                    <p className="text-[.62rem] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-primary/30 bg-primary py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 text-primary-foreground md:flex-row md:items-center lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em]">
                Pronto para ir mais longe?
              </p>
              <h2 className="mt-3 text-3xl font-bold uppercase sm:text-4xl">
                Comece a proteger sua moto.
              </h2>
            </div>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center gap-2 bg-background px-5 text-sm font-semibold uppercase tracking-[.08em] text-foreground"
            >
              Criar minha conta <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-9 sm:flex-row lg:px-8">
        <RideOnLogo compact />
        <p className="text-xs text-muted-foreground">
          2026 RideOn. Rastreamento e seguranca.
        </p>
      </footer>
    </div>
  );
}
