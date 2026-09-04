'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Bike, Car } from 'lucide-react';

import RotatingText, { type RotatingTextRef } from '@/app/components/ui/rotating-text';

interface VehicleSlide {
  id: string;
  type: 'moto' | 'carro';
  tabLabel: string;
  tagline: string;
  title: string;
  ctaText: string;
  image: string;
  alt: string;
}

const VEHICLES: VehicleSlide[] = [
  {
    id: 'moto',
    type: 'moto',
    tabLabel: 'Moto',
    tagline: 'Rastreamento & Proteção Antifurto',
    title: 'Sua moto.',
    ctaText: 'Proteger minha moto',
    image: '/rideon-hero.jpg',
    alt: 'Painel RideOn com motocicleta e aplicação de rastreamento em tempo real',
  },
  {
    id: 'carro',
    type: 'carro',
    tabLabel: 'Carro',
    tagline: 'Gestão Inteligente & Segurança 24h',
    title: 'Seu carro.',
    ctaText: 'Proteger meu carro',
    image: '/rideon-hero-car.jpeg',
    alt: 'Painel RideOn com automóvel e aplicação de rastreamento em tempo real',
  },
];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const rotatingTextRef = useRef<RotatingTextRef>(null);

  const currentVehicle = VEHICLES[currentIndex];

  const handleNextFromRotation = (newIndex: number) => {
    setDirection(1);
    setCurrentIndex(newIndex);
  };

  const handleManualSelect = (index: number) => {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    rotatingTextRef.current?.jumpTo(index);
  };

  return (
    <section className="relative flex min-h-[720px] items-center overflow-hidden pt-24 pb-16 lg:min-h-[820px]">
      {/* Background Slides with Horizontal Sliding Animation */}
      <div className="absolute inset-0 overflow-hidden bg-background">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentVehicle.id}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: dir >= 0 ? '100%' : '-100%',
                opacity: 0.4,
                scale: 1.05,
              }),
              center: {
                x: '0%',
                opacity: 1,
                scale: 1,
                transition: {
                  x: { type: 'spring', stiffness: 220, damping: 28 },
                  opacity: { duration: 0.5, ease: 'easeOut' },
                  scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                },
              },
              exit: (dir: number) => ({
                x: dir >= 0 ? '-100%' : '100%',
                opacity: 0.3,
                scale: 0.96,
                transition: {
                  x: { type: 'spring', stiffness: 220, damping: 28 },
                  opacity: { duration: 0.4, ease: 'easeIn' },
                  scale: { duration: 0.7, ease: 'easeInOut' },
                },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 size-full"
          >
            <Image
              src={currentVehicle.image}
              alt={currentVehicle.alt}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Enhanced High-Contrast Overlays */}
        <div className="hero-overlay absolute inset-0 z-[2]" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-background via-transparent to-background/60" />
        <div className="absolute inset-0 z-[2] bg-radial-[circle_at_20%_40%] from-transparent via-background/40 to-background/90" />
        <div className="pointer-events-none absolute inset-0 z-[2] opacity-10 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            {VEHICLES.map((vehicle, index) => {
              const isActive = index === currentIndex;
              const Icon = vehicle.type === 'moto' ? Bike : Car;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => handleManualSelect(index)}
                  className={`group relative flex items-center gap-2 border px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${isActive
                      ? 'border-primary bg-primary/15 text-primary shadow-[0_0_15px_rgba(239,37,27,0.25)]'
                      : 'border-border/80 bg-background/50 text-muted hover:border-border hover:text-foreground'
                    }`}
                >
                  <Icon className="size-3.5" />
                  <span>{vehicle.tabLabel}</span>
                  {isActive && (
                    <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary" />
                  )}
                </button>
              );
            })}
            <div className="hidden sm:flex items-center gap-2 pl-3 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentVehicle.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="font-mono text-[0.7rem] uppercase tracking-wider"
                >
                  {currentVehicle.tagline}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Rotating Hero Title */}
          <h1 className="mt-7 text-5xl font-extrabold uppercase leading-[.92] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <div className="flex items-center">
              <RotatingText
                ref={rotatingTextRef}
                texts={['Sua moto.', 'Seu carro.']}
                mainClassName="text-foreground inline-flex overflow-hidden"
                staggerFrom="last"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-120%' }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-1 sm:pb-2"
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                rotationInterval={4200}
                splitBy="characters"
                onNext={handleNextFromRotation}
                auto
                loop
              />
            </div>
            <span className="mt-1 block text-primary">Sempre no radar.</span>
          </h1>

          {/* Hero Copy */}
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Tecnologia de rastreamento em tempo real para você pilotar ou
            dirigir com total liberdade. Localize, proteja e monitore tudo
            em um só lugar.
          </p>

          {/* Action Buttons */}
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Link
              href="/register"
              className="group relative inline-flex min-h-12 items-center gap-2 overflow-hidden bg-primary px-6 text-sm font-semibold uppercase tracking-[.08em] text-primary-foreground shadow-[0_0_20px_rgba(239,37,27,0.35)] transition-all hover:bg-primary/90 hover:shadow-[0_0_28px_rgba(239,37,27,0.5)]"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentVehicle.ctaText}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2"
                >
                  {currentVehicle.ctaText}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </motion.span>
              </AnimatePresence>
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center border border-border bg-background/60 backdrop-blur-md px-6 text-sm font-semibold uppercase tracking-[.08em] text-foreground transition-all hover:border-primary hover:bg-background/80"
            >
              Acessar plataforma
            </Link>
          </div>

          {/* Metric Counters */}
          <div className="mt-14 grid max-w-xl grid-cols-3 border-t border-border/70 pt-6">
            <div>
              <strong className="metric">24h</strong>
              <span className="metric-label">Monitoramento</span>
            </div>
            <div>
              <strong className="metric">2.4s</strong>
              <span className="metric-label">Atualização</span>
            </div>
            <div>
              <strong className="metric">100%</strong>
              <span className="metric-label">Controle</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
