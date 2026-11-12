'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Battery,
  Bike,
  Car,
  CheckCircle2,
  KeyRound,
  Lock,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Smartphone,
  Unlock,
  Zap,
} from 'lucide-react';

import { RideOnLogo } from '@/app/components/rideon-logo';
import { CityMapSimulator } from '@/app/components/landing/city-map-simulator';

interface DemoVehicle {
  id: string;
  name: string;
  type: 'moto' | 'carro';
  plate: string;
  speed: string;
  battery: string;
  ignition: boolean;
  locked: boolean;
  location: string;
}

const DEMO_VEHICLES: DemoVehicle[] = [
  {
    id: 'moto',
    name: 'Honda CB 650R Neo',
    type: 'moto',
    plate: 'RID-9926',
    speed: '64 km/h',
    battery: '12.8 V',
    ignition: true,
    locked: false,
    location: 'Av. Paulista, São Paulo - SP',
  },
  {
    id: 'carro',
    name: 'Toyota Corolla Cross',
    type: 'carro',
    plate: 'ONR-4812',
    speed: '0 km/h',
    battery: '12.6 V',
    ignition: false,
    locked: true,
    location: 'Moema, São Paulo - SP',
  },
];

export function PlatformSection() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<'moto' | 'carro'>('moto');
  const [isLocked, setIsLocked] = useState(false);
  const [isGeofenceActive, setIsGeofenceActive] = useState(true);
  const [liveLocation, setLiveLocation] = useState('Av. Paulista, São Paulo - SP');
  const [liveSpeed, setLiveSpeed] = useState('64 km/h');

  const currentVehicle =
    DEMO_VEHICLES.find((v) => v.id === selectedVehicleId) || DEMO_VEHICLES[0];

  const isVehicleMoving = !isLocked;

  const toggleLock = () => {
    setIsLocked((prev) => !prev);
  };

  const toggleGeofence = () => {
    setIsGeofenceActive((prev) => !prev);
  };

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
            className="relative"
          >
            {/* Ambient Glow behind the mockup */}
            <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/10 opacity-70 blur-xl" />

            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl">
              {/* Device Simulator Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-surface/90 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <RideOnLogo compact />
                  <div className="h-4 w-px bg-border" />
                  {/* Vehicle Switcher */}
                  <div className="flex items-center gap-1 rounded bg-secondary/80 p-0.5 border border-border/60">
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId('moto')}
                      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition-all ${
                        selectedVehicleId === 'moto'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Bike className="size-3" />
                      <span>Moto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId('carro')}
                      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition-all ${
                        selectedVehicleId === 'carro'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Car className="size-3" />
                      <span>Carro</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-emerald-400">
                    4G LTE • Online
                  </span>
                </div>
              </div>

              {/* High-Tech Dynamic City Map Simulation Viewport */}
              <CityMapSimulator
                vehicleType={selectedVehicleId}
                vehiclePlate={currentVehicle.plate}
                isLocked={isLocked}
                isGeofenceActive={isGeofenceActive}
                onLocationChange={setLiveLocation}
                onSpeedChange={setLiveSpeed}
              />

              {/* Real-time Telemetry Stats Row */}
              <div className="grid grid-cols-2 gap-px border-y border-border/80 bg-border/60 sm:grid-cols-4">
                {/* Speed Metric */}
                <div className="bg-card p-3.5 sm:p-4">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]">
                      Velocidade
                    </span>
                    <Radio className="size-3 text-primary" />
                  </div>
                  <p className="mt-1 text-base font-bold text-foreground sm:text-lg font-mono">
                    {isVehicleMoving ? liveSpeed : '0 km/h'}
                  </p>
                  <p className="text-[0.6rem] text-emerald-400 font-medium">
                    {isVehicleMoving ? 'Em deslocamento' : 'Estacionado'}
                  </p>
                </div>

                {/* Battery Metric */}
                <div className="bg-card p-3.5 sm:p-4">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]">
                      Bateria
                    </span>
                    <Battery className="size-3 text-emerald-400" />
                  </div>
                  <p className="mt-1 text-base font-bold text-foreground sm:text-lg font-mono">
                    {currentVehicle.battery}
                  </p>
                  <p className="text-[0.6rem] text-muted-foreground">100% Carga Ideal</p>
                </div>

                {/* Ignition Metric */}
                <div className="bg-card p-3.5 sm:p-4">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]">
                      Ignição
                    </span>
                    <KeyRound className="size-3 text-primary" />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        isVehicleMoving ? 'bg-emerald-400 animate-pulse' : 'bg-muted'
                      }`}
                    />
                    <p className="text-base font-bold text-foreground sm:text-lg">
                      {isVehicleMoving ? 'Ligada' : 'Desligada'}
                    </p>
                  </div>
                  <p className="text-[0.6rem] text-muted-foreground">
                    {isVehicleMoving ? 'Chave detectada' : 'Sem ignição'}
                  </p>
                </div>

                {/* Status / Lock Metric */}
                <div className="bg-card p-3.5 sm:p-4">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]">
                      Bloqueio
                    </span>
                    <ShieldCheck className="size-3 text-primary" />
                  </div>
                  <p className="mt-1 text-base font-bold text-foreground sm:text-lg">
                    {isLocked ? 'Bloqueado' : 'Liberado'}
                  </p>
                  <p
                    className={`text-[0.6rem] font-medium ${
                      isLocked ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {isLocked ? 'Motor cortado' : 'Proteção Ativa'}
                  </p>
                </div>
              </div>

              {/* Quick Interactive Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/90 px-4 py-3">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Comandos Rápidos:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleGeofence}
                    className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider transition-all ${
                      isGeofenceActive
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>Cerca {isGeofenceActive ? 'Ativada' : 'Desativada'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleLock}
                    className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider transition-all ${
                      isLocked
                        ? 'border-red-500 bg-red-500/20 text-red-400 shadow-sm'
                        : 'border-border bg-secondary text-foreground hover:border-primary/40'
                    }`}
                  >
                    {isLocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                    <span>{isLocked ? 'Desbloquear Motor' : 'Bloqueio Remoto'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

