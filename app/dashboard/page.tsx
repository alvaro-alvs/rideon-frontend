"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BatteryCharging,
  MapPin,
  Maximize2,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { LiveTelemetryModal } from "@/app/dashboard/components/live-telemetry-modal";
import { useMotorcycle } from "@/hooks/use-motorcycle";

export default function DashboardPage() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const router = useRouter();
  const { motorcycle, isLoading } = useMotorcycle();

  const hasVehicle = !isLoading && Boolean(motorcycle);

  const motorcycleModel = motorcycle
    ? `${motorcycle.brand ?? ""} ${motorcycle.model ?? ""}`.trim() ||
      motorcycle.model ||
      "Motocicleta"
    : "";

  const motorcyclePlate = motorcycle?.license_plate || "";

  const summary = [
    {
      label: "Velocidade",
      value: isLoading ? "..." : hasVehicle ? "0 km/h" : "--",
      icon: Activity,
    },
    {
      label: "Bateria",
      value: isLoading ? "..." : hasVehicle ? "12.6 V" : "--",
      icon: BatteryCharging,
    },
    {
      label: "Ignicao",
      value: isLoading ? "..." : hasVehicle ? "Desligada" : "--",
      icon: ShieldCheck,
    },
  ];

  const handleMapClick = () => {
    if (hasVehicle) {
      setIsMapModalOpen(true);
    } else {
      router.push("/dashboard/vehicles");
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl py-6">
        <p className="section-kicker">Visao geral</p>
        <h1 className="mt-4 text-4xl font-bold uppercase">
          {isLoading
            ? "Carregando..."
            : hasVehicle
              ? "Sua moto esta protegida."
              : "Nenhum veículo cadastrado."}
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

        {/* Hoverable and Clickable Live Telemetry Mini-map */}
        <section
          onClick={handleMapClick}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleMapClick();
            }
          }}
          className="mini-map group relative mt-8 h-[360px] cursor-pointer overflow-hidden border border-border transition-all duration-300 hover:border-primary hover:shadow-xl hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {/* Subtle animated scan grid line on hover */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Central Animated Vehicle / Plus Marker */}
          <div className="absolute left-[55%] top-[45%] grid size-12 place-items-center rounded-full bg-primary shadow-lg shadow-primary/40 transition-transform duration-300 group-hover:scale-110">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50"></span>
            {hasVehicle ? (
              <MapPin className="relative z-10 size-6 text-primary-foreground" />
            ) : (
              <Plus className="relative z-10 size-6 stroke-[3] text-primary-foreground" />
            )}
          </div>

          {/* Top-Right Expand Prompt Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded border border-border/80 bg-background/90 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
            {hasVehicle ? (
              <>
                <Maximize2 className="size-4" />
                <span>Abrir Monitoramento Realtime</span>
              </>
            ) : (
              <>
                <Plus className="size-4" />
                <span>Cadastrar Veículo</span>
              </>
            )}
          </div>

          {/* Bottom Vehicle Info Card / Registration CTA Button */}
          {hasVehicle ? (
            <div className="absolute bottom-5 left-5 border border-border/80 bg-background/90 p-4 backdrop-blur transition-colors group-hover:border-primary/50">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                <p className="text-xs font-bold uppercase tracking-[.1em] text-primary">
                  Localizacao ao vivo
                </p>
              </div>
              <p className="mt-1 text-sm font-semibold">
                {`${motorcycleModel} - ${motorcyclePlate}`}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground group-hover:text-foreground">
                Clique para expandir o mapa com WebSocket
              </p>
            </div>
          ) : (
            <Link
              href="/dashboard/vehicles"
              onClick={(e) => e.stopPropagation()}
              className="group/btn absolute bottom-5 left-5 flex items-center gap-3.5 border border-primary/60 bg-background/95 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-colors group-hover/btn:bg-background group-hover/btn:text-primary">
                <Plus className="size-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.1em] text-primary group-hover/btn:text-primary-foreground">
                  Cadastre seu veículo
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground group-hover/btn:text-primary-foreground/90">
                  Vincule sua moto para ativar o monitoramento ao vivo
                </p>
              </div>
            </Link>
          )}
        </section>
      </div>

      {/* Live Telemetry Modal */}
      {hasVehicle && (
        <LiveTelemetryModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          motorcycleId={motorcycle?.id}
          motorcycleInfo={{
            model: motorcycleModel,
            licensePlate: motorcyclePlate,
          }}
        />
      )}
    </DashboardShell>
  );
}

