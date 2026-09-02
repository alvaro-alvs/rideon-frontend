import { Activity, BatteryCharging, MapPin, ShieldCheck } from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";

const summary = [
  { label: "Velocidade", value: "72 km/h", icon: Activity },
  { label: "Bateria", value: "12.6 V", icon: BatteryCharging },
  { label: "Ignicao", value: "Ligada", icon: ShieldCheck },
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl py-6">
        <p className="section-kicker">Visao geral</p>
        <h1 className="mt-4 text-4xl font-bold uppercase">
          Sua moto esta protegida.
        </h1>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {summary.map(({ label, value, icon: Icon }) => (
            <article key={label} className="border border-border bg-card p-6">
              <Icon className="size-6 text-primary" />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </article>
          ))}
        </div>
        <section className="mini-map relative mt-8 h-[360px] overflow-hidden border border-border">
          <div className="absolute left-[55%] top-[45%] grid size-12 place-items-center rounded-full bg-primary shadow-lg shadow-primary/30">
            <MapPin className="size-6 text-primary-foreground" />
          </div>
          <div className="absolute bottom-5 left-5 bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-[.1em] text-primary">
              Localizacao ao vivo
            </p>
            <p className="mt-1 text-sm">Honda CG 160 - ABC1234</p>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
