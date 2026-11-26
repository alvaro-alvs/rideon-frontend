"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Radio,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { GoogleMapView } from "@/app/dashboard/components/google-map-view";
import { isValidCoordinate } from "@/lib/geo";
import { formatVehicleDisplayName } from "@/lib/vehicle-display";
import type { PublicShareSnapshot } from "@/lib/types/protection";

export default function PublicShareTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [snapshot, setSnapshot] = useState<PublicShareSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let firstLoad = true;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(
          `/api/public/share/${encodeURIComponent(token)}${firstLoad ? "" : "?poll=1"}`,
          { cache: "no-store" },
        );
        firstLoad = false;
        if (!active) return;

        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
          setError(errBody?.message || "Link de rastreamento inválido, revogado ou expirado.");
          setSnapshot(null);
          return;
        }
        const data = (await res.json()) as PublicShareSnapshot;
        setSnapshot(data);
        setError(null);
      } catch {
        if (active) setError("Não foi possível atualizar a localização.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchSnapshot();
    const timer = setInterval(() => void fetchSnapshot(), 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Carregando rastreamento ao vivo...
        </p>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xl">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="font-display text-lg font-bold text-foreground">
            Link Indisponível
          </h1>
          <p className="text-xs text-muted-foreground">
            {error || "Este link de compartilhamento expirou ou foi revogado pelo proprietário."}
          </p>
        </div>
      </main>
    );
  }

  const brandName = snapshot.brand?.brand_name || "RideOn";
  const hasLoc =
    snapshot.location &&
    isValidCoordinate(snapshot.location.latitude, snapshot.location.longitude);

  const mapsUrl = hasLoc
    ? `https://www.google.com/maps/search/?api=1&query=${snapshot.location!.latitude},${snapshot.location!.longitude}`
    : null;
  const wazeUrl = hasLoc
    ? `https://waze.com/ul?ll=${snapshot.location!.latitude},${snapshot.location!.longitude}&navigate=yes`
    : null;

  return (
    <main className="flex h-screen w-screen flex-col bg-background overflow-hidden">
      {/* Public Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Radio className="size-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                {brandName} • Rastreio Compartilhado
              </span>
              {snapshot.label && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                  {snapshot.label}
                </span>
              )}
            </div>
            <h1 className="font-display text-sm sm:text-base font-bold text-foreground">
              {formatVehicleDisplayName(snapshot.vehicle)}
              {snapshot.vehicle.license_plate && (
                <span className="ml-2 rounded bg-secondary px-2 py-0.5 font-mono text-xs text-foreground">
                  {snapshot.vehicle.license_plate}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-muted-foreground">
            <Clock className="size-3.5 text-amber-400" />
            <span>Expira às {new Date(snapshot.expires_at).toLocaleTimeString("pt-BR")}</span>
          </span>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Navigation className="size-3.5" />
              <span>Abrir no Maps</span>
            </a>
          )}
          {wazeUrl && (
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 font-semibold text-foreground hover:bg-secondary/80"
            >
              <ExternalLink className="size-3.5" />
              <span>Waze</span>
            </a>
          )}
        </div>
      </header>

      {/* Live Map */}
      <div className="relative flex-1 bg-black">
        {hasLoc ? (
          <>
            <GoogleMapView
              position={{
                latitude: snapshot.location!.latitude,
                longitude: snapshot.location!.longitude,
              }}
              heading={snapshot.location!.heading ?? 0}
              history={snapshot.recent_path ?? []}
              zoom={16}
            />

            {/* Vertical RideOn CTA FAB */}
            <Link
              href="/#plataforma"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Conheça a RideOn e seus produtos"
              title="Conheça a RideOn e seus produtos"
              className="rideon-fab-idle group absolute bottom-40 right-3.5 sm:bottom-36 sm:right-5 z-20 flex w-[132px] flex-col items-center gap-2 rounded-3xl border border-white/15 bg-card/95 p-3 text-center backdrop-blur-xl shadow-[0_14px_34px_rgba(0,0,0,0.65),0_0_0_1px_rgba(239,37,27,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_18px_40px_rgba(239,37,27,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
              >
                <span className="rideon-fab-sheen block h-16 w-full bg-gradient-to-b from-transparent via-white/12 to-transparent" />
              </span>

              <span className="relative flex items-center justify-center gap-1.5">
                <span className="relative flex size-7 items-center justify-center rounded-full border border-primary/35 bg-primary/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logomark-icon.svg"
                    alt=""
                    className="size-4 object-contain"
                  />
                  <span className="absolute -right-0.5 -top-0.5 flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-65" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                </span>
                <span className="font-display text-xs font-black italic tracking-wide text-foreground">
                  RIDE<span className="text-primary">ON</span>
                </span>
              </span>

              <span className="text-[11px] font-medium leading-snug text-zinc-200">
                Conheça nossos produtos
              </span>

              <span className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-md shadow-primary/30 transition-transform duration-300 group-hover:scale-[1.03]">
                <span>Conhecer</span>
                <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>

            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur-md shadow-xl text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {snapshot.location?.speed != null && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    <Activity className="size-4 text-primary" />
                    {Math.round(snapshot.location.speed)} km/h
                  </span>
                )}
                {snapshot.location?.ignition != null && (
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${
                      snapshot.location.ignition ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    <Zap className="size-4" />
                    Ignição {snapshot.location.ignition ? "Ligada" : "Desligada"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-muted-foreground max-w-md truncate">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <span className="truncate text-foreground/90" title={snapshot.location!.address || undefined}>
                    {snapshot.location!.address ||
                      `${snapshot.location!.latitude.toFixed(6)}, ${snapshot.location!.longitude.toFixed(6)}`}
                  </span>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Último ponto:{" "}
                <strong className="text-foreground">
                  {new Date(snapshot.location!.timestamp).toLocaleTimeString("pt-BR")}
                </strong>
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            Veículo ainda sem coordenadas GPS válidas registradas.
          </div>
        )}
      </div>
    </main>
  );
}
