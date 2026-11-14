'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Battery,
  BellRing,
  Bike,
  Car,
  KeyRound,
  Lock,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Unlock,
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
    speed: '54 km/h',
    battery: '12.6 V',
    ignition: true,
    locked: false,
    location: 'Av. Paulista, São Paulo - SP',
  },
];

interface PopSpotConfig {
  id: string;
  anchorClass: string;
  fromX: number;
  fromY: number;
  peakX: number;
  peakY: number;
  toX: number;
  toY: number;
  fromRotate: number;
  peakRotate: number;
}

/**
 * 8 distinct perimeter positions around the simulator component.
 * Each spot starts tucked behind the z-10 card (at zIndex 5), shoots outward
 * past the component border, and settles on the rim (at zIndex 30).
 */
const POP_SPOTS: PopSpotConfig[] = [
  {
    id: 'top-right',
    anchorClass: 'top-0 right-3 sm:right-6',
    fromX: -18,
    fromY: 46,
    peakX: 6,
    peakY: -54,
    toX: 0,
    toY: -38,
    fromRotate: -5,
    peakRotate: 2,
  },
  {
    id: 'left-upper',
    anchorClass: 'top-20 left-2 sm:left-3',
    fromX: 64,
    fromY: 14,
    peakX: -20,
    peakY: -6,
    toX: -10,
    toY: 0,
    fromRotate: 6,
    peakRotate: -2,
  },
  {
    id: 'bottom-right',
    anchorClass: 'bottom-0 right-3 sm:right-7',
    fromX: -18,
    fromY: -46,
    peakX: 6,
    peakY: 54,
    toX: 0,
    toY: 38,
    fromRotate: 5,
    peakRotate: -2,
  },
  {
    id: 'top-left',
    anchorClass: 'top-0 left-3 sm:left-6',
    fromX: 18,
    fromY: 46,
    peakX: -6,
    peakY: -54,
    toX: 0,
    toY: -38,
    fromRotate: 5,
    peakRotate: -2,
  },
  {
    id: 'right-upper',
    anchorClass: 'top-28 right-2 sm:right-3',
    fromX: -64,
    fromY: 14,
    peakX: 20,
    peakY: -6,
    toX: 10,
    toY: 0,
    fromRotate: -6,
    peakRotate: 2,
  },
  {
    id: 'bottom-left',
    anchorClass: 'bottom-0 left-3 sm:left-7',
    fromX: 18,
    fromY: -46,
    peakX: -6,
    peakY: 54,
    toX: 0,
    toY: 38,
    fromRotate: -5,
    peakRotate: 2,
  },
  {
    id: 'top-center',
    anchorClass: 'top-0 left-1/2 -translate-x-1/2',
    fromX: 0,
    fromY: 48,
    peakX: 0,
    peakY: -56,
    toX: 0,
    toY: -40,
    fromRotate: -3,
    peakRotate: 1,
  },
  {
    id: 'left-lower',
    anchorClass: 'bottom-20 left-2 sm:left-3',
    fromX: 64,
    fromY: -12,
    peakX: -20,
    peakY: 5,
    toX: -10,
    toY: 0,
    fromRotate: -5,
    peakRotate: 2,
  },
];

interface BreachNotificationToast {
  id: number;
  spotIndex: number;
  street: string;
}

export function TelemetrySimulator() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<'moto' | 'carro'>('moto');
  const [isLocked, setIsLocked] = useState(false);
  const [isGeofenceActive, setIsGeofenceActive] = useState(true);
  const [liveLocation, setLiveLocation] = useState('Av. Paulista (sentido Paraíso)');
  const [liveSpeed, setLiveSpeed] = useState('62 km/h');
  const [isGeofenceBreached, setIsGeofenceBreached] = useState(false);
  const [activeToast, setActiveToast] = useState<BreachNotificationToast | null>(null);

  const lastSpotIndexRef = useRef<number>(-1);
  const toastCounterRef = useRef<number>(0);
  const liveLocationRef = useRef<string>(liveLocation);

  useEffect(() => {
    liveLocationRef.current = liveLocation;
  }, [liveLocation]);

  const currentVehicle =
    DEMO_VEHICLES.find((v) => v.id === selectedVehicleId) || DEMO_VEHICLES[0];

  const isVehicleMoving = !isLocked && liveSpeed !== '0 km/h';

  const handleGeofenceBreachChange = useCallback((breached: boolean, street: string) => {
    setIsGeofenceBreached(breached);
    if (street) {
      liveLocationRef.current = street;
    }
    if (!breached) {
      setActiveToast(null);
    }
  }, []);

  // Cycle pop-out notifications from behind different parts of the component while geofence is breached
  useEffect(() => {
    if (!isGeofenceBreached) {
      return;
    }

    let isCancelled = false;
    let hideTimeout: ReturnType<typeof setTimeout>;
    let nextTimeout: ReturnType<typeof setTimeout>;

    const pickNextSpotIndex = () => {
      const prev = lastSpotIndexRef.current;
      // Advance by 1 or 3 steps so it always pops from a different edge/corner
      const step = toastCounterRef.current % 2 === 0 ? 1 : 3;
      const next = (prev + step) % POP_SPOTS.length;
      lastSpotIndexRef.current = next;
      return next;
    };

    const spawnToast = () => {
      if (isCancelled) return;
      toastCounterRef.current += 1;
      const spotIndex = pickNextSpotIndex();

      setActiveToast({
        id: toastCounterRef.current,
        spotIndex,
        street: liveLocationRef.current.split(',')[0] || 'Perímetro Externo',
      });

      // Keep visible for 1.35s, then trigger fast fade-out
      hideTimeout = setTimeout(() => {
        if (isCancelled) return;
        setActiveToast(null);

        // Spawn next alert from another part of the component after fast fade completes
        nextTimeout = setTimeout(() => {
          if (!isCancelled) {
            spawnToast();
          }
        }, 280);
      }, 1350);
    };

    const initialTimeout = setTimeout(spawnToast, 20);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }, [isGeofenceBreached]);

  const toggleLock = () => {
    setIsLocked((prev) => !prev);
  };

  const toggleGeofence = () => {
    setIsGeofenceActive((prev) => {
      const next = !prev;
      if (!next) {
        setActiveToast(null);
      }
      return next;
    });
  };

  const visibleToast = isGeofenceBreached ? activeToast : null;
  const currentSpot = visibleToast ? POP_SPOTS[visibleToast.spotIndex] : null;

  return (
    <div className="relative">
      {/* Ambient Glow behind the mockup (pulses stronger when geofence is breached) */}
      <div
        className={`pointer-events-none absolute -inset-2 z-0 rounded-2xl transition-all duration-300 blur-xl ${
          isGeofenceBreached
            ? 'bg-gradient-to-r from-red-600/35 via-primary/20 to-red-600/35 opacity-95'
            : 'bg-gradient-to-r from-primary/20 via-transparent to-primary/10 opacity-70'
        }`}
      />

      {/* ========================================================
          POP-OUT GEOFENCE BREACH NOTIFICATION (FROM BEHIND COMPONENT)
          Starts at zIndex 5 (behind the z-10 card), shoots outward past
          the component border, locks onto zIndex 30, and fades out fast.
      ======================================================== */}
      <AnimatePresence mode="wait">
        {visibleToast && currentSpot && (
          <motion.div
            key={visibleToast.id}
            className={`pointer-events-none absolute ${currentSpot.anchorClass} w-[238px] sm:w-[264px]`}
            initial={{
              opacity: 0,
              scale: 0.72,
              x: currentSpot.fromX,
              y: currentSpot.fromY,
              rotate: currentSpot.fromRotate,
              zIndex: 5,
            }}
            animate={{
              opacity: [0, 1, 1],
              scale: [0.72, 1.04, 1],
              x: [currentSpot.fromX, currentSpot.peakX, currentSpot.toX],
              y: [currentSpot.fromY, currentSpot.peakY, currentSpot.toY],
              rotate: [currentSpot.fromRotate, currentSpot.peakRotate, 0],
              zIndex: [5, 5, 30],
            }}
            exit={{
              opacity: 0,
              scale: 0.93,
              transition: { duration: 0.16, ease: 'easeIn' },
            }}
            transition={{
              duration: 0.42,
              times: [0, 0.44, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ willChange: 'transform, opacity' }}
            role="status"
            aria-live="polite"
          >
            <div className="relative overflow-hidden rounded-xl border border-red-500/80 bg-[#140709]/95 px-3 py-2.5 shadow-[0_14px_34px_-6px_rgba(239,37,27,0.55)] backdrop-blur-md">
              {/* Top alert laser accent */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 flex-none items-center justify-center rounded-lg border border-red-500/40 bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,37,27,0.4)]">
                  <BellRing className="size-3.5 animate-bounce" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-red-400">
                      <span className="size-1.5 rounded-full bg-red-500 animate-ping" />
                      Alerta • Cerca Violada
                    </span>
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[0.55rem] font-bold text-red-300">
                      {currentVehicle.plate}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-foreground">
                    Fora da zona segura • {visibleToast.street}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Simulator Card (z-10 so notifications at z-5 emerge from behind it) */}
      <div
        className={`relative z-10 overflow-hidden rounded-2xl border bg-card/95 shadow-2xl backdrop-blur-xl transition-colors duration-300 ${
          isGeofenceBreached ? 'border-red-500/70' : 'border-border/80'
        }`}
      >
        {/* Device Simulator Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-surface/90 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <RideOnLogo compact />
            <div className="h-4 w-px bg-border" />
            {/* Vehicle Switcher */}
            <div className="flex items-center gap-1 rounded border border-border/60 bg-secondary/80 p-0.5">
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
            {isGeofenceBreached ? (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-85" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-red-400">
                  Perímetro Violado
                </span>
              </>
            ) : (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-emerald-400">
                  4G LTE • Online
                </span>
              </>
            )}
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
          onGeofenceBreachChange={handleGeofenceBreachChange}
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
            <p className="mt-1 font-mono text-base font-bold text-foreground sm:text-lg">
              {liveSpeed}
            </p>
            <p className="text-[0.6rem] font-medium text-emerald-400">
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
            <p className="mt-1 font-mono text-base font-bold text-foreground sm:text-lg">
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
              {isGeofenceBreached ? (
                <ShieldAlert className="size-3 text-red-400" />
              ) : (
                <ShieldCheck className="size-3 text-primary" />
              )}
            </div>
            <p className="mt-1 text-base font-bold text-foreground sm:text-lg">
              {isLocked ? 'Bloqueado' : 'Liberado'}
            </p>
            <p
              className={`text-[0.6rem] font-medium ${
                isLocked
                  ? 'text-red-400'
                  : isGeofenceBreached
                    ? 'text-red-400'
                    : 'text-emerald-400'
              }`}
            >
              {isLocked
                ? 'Motor cortado'
                : isGeofenceBreached
                  ? 'Alerta de Cerca'
                  : 'Proteção Ativa'}
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
                  ? isGeofenceBreached
                    ? 'border-red-500/70 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,37,27,0.3)]'
                    : 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {isGeofenceBreached ? (
                <ShieldAlert className="size-3.5 text-red-400" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )}
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
    </div>
  );
}

