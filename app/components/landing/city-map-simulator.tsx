'use client';

import { useEffect, useRef, useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, Lock, Compass } from 'lucide-react';

interface CityMapSimulatorProps {
  vehicleType: 'moto' | 'carro';
  vehiclePlate: string;
  isLocked: boolean;
  isGeofenceActive: boolean;
  onLocationChange?: (location: string) => void;
  onSpeedChange?: (speed: string) => void;
  onGeofenceBreachChange?: (isBreached: boolean, street: string) => void;
}

// Seamless closed-loop route following lane centers with continuous bezier turns
// Dimensions: 640 x 360 viewBox
const ROUTE_PATH_D =
  'M 105,169 L 320,169 Q 336,169 336,185 L 336,263 Q 336,279 352,279 L 497,279 Q 513,279 513,263 L 513,167 Q 513,151 497,151 L 105,151 Q 89,151 89,160 Q 89,169 105,169 Z';

const GEOFENCE_CENTER = { x: 320, y: 215 };
const GEOFENCE_RADIUS = 115;

function resolveStreetName(x: number, y: number): string {
  if (y < 162 && x > 115) {
    return 'Av. Paulista (sentido Consolação)';
  }
  if (y >= 162 && y <= 175 && x <= 325) {
    return 'Av. Paulista (sentido Paraíso)';
  }
  if (x >= 325 && x <= 345 && y > 175 && y < 265) {
    return 'Rua Haddock Lobo, Cerqueira César';
  }
  if (y >= 268 && y <= 285) {
    return 'Alameda Santos, Jardins';
  }
  if (x >= 500 && x <= 525 && y < 265) {
    return 'Al. Min. Rocha Azevedo, Jardins';
  }
  if (x <= 110) {
    return 'Rua da Consolação, São Paulo - SP';
  }
  return 'Av. Paulista, São Paulo - SP';
}

export function CityMapSimulator({
  vehicleType,
  vehiclePlate,
  isLocked,
  isGeofenceActive,
  onLocationChange,
  onSpeedChange,
  onGeofenceBreachChange,
}: CityMapSimulatorProps) {
  const filterId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenPathRef = useRef<SVGPathElement>(null);
  const activeTrailRef = useRef<SVGPathElement>(null);
  const glowTrailRef = useRef<SVGPathElement>(null);
  const vehicleGroupRef = useRef<SVGGElement>(null);
  const breachLineRef = useRef<SVGLineElement>(null);
  const breachDotRef = useRef<SVGCircleElement>(null);
  const speedHudTextRef = useRef<HTMLSpanElement>(null);

  const [isInView, setIsInView] = useState(true);
  const [locationLabel, setLocationLabel] = useState('Av. Paulista (sentido Paraíso)');
  const [isOutsideGeofence, setIsOutsideGeofence] = useState(false);
  const [isFullyStopped, setIsFullyStopped] = useState(false);

  // Mutable animation state kept in ref so 60fps loop runs with zero React re-renders
  const animStateRef = useRef({
    distance: 135, // Starts inside safe zone on Av. Paulista heading towards Haddock Lobo
    totalLength: 1000,
    lastTime: 0,
    currentSpeed: 62,
    trailScale: 1,
    lastReportedSpeed: '62 km/h',
    lastSpeedReportTime: 0,
    lastLocation: 'Av. Paulista (sentido Paraíso)',
    lastOutside: false,
    lastStopped: false,
  });

  // Latest callbacks & props in refs to avoid restarting rAF loop on parent renders
  const callbacksRef = useRef({
    onLocationChange,
    onSpeedChange,
    onGeofenceBreachChange,
    isLocked,
    vehicleType,
  });

  useEffect(() => {
    callbacksRef.current = {
      onLocationChange,
      onSpeedChange,
      onGeofenceBreachChange,
      isLocked,
      vehicleType,
    };
  }, [onLocationChange, onSpeedChange, onGeofenceBreachChange, isLocked, vehicleType]);

  // Notify parent when geofence active toggle or outside state changes
  const isGeofenceBreached = isGeofenceActive && isOutsideGeofence;

  useEffect(() => {
    callbacksRef.current.onGeofenceBreachChange?.(isGeofenceBreached, locationLabel);
  }, [isGeofenceBreached, locationLabel]);

  // Pause animation loop when map is scrolled offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initialize total length of the path
  useEffect(() => {
    if (hiddenPathRef.current) {
      animStateRef.current.totalLength = hiddenPathRef.current.getTotalLength();
    }
  }, []);

  // High-performance 60fps animation loop using direct SVG DOM manipulation
  useEffect(() => {
    if (!isInView) {
      animStateRef.current.lastTime = 0;
      return;
    }

    let animId: number;
    const maxTrailLength = 155;

    const animate = (time: number) => {
      const state = animStateRef.current;
      if (!state.lastTime) {
        state.lastTime = time;
      }
      const dt = Math.min((time - state.lastTime) / 1000, 0.08);
      state.lastTime = time;

      const path = hiddenPathRef.current;
      const totalLen = state.totalLength;

      if (!path || totalLen === 0) {
        animId = requestAnimationFrame(animate);
        return;
      }

      const { isLocked: locked, vehicleType: vType } = callbacksRef.current;
      const cruiseSpeed = vType === 'moto' ? 64 : 54;
      const cornerSpeed = vType === 'moto' ? 38 : 32;

      const currentDist = state.distance;
      const p1 = path.getPointAtLength(currentDist % totalLen);
      const pAhead = path.getPointAtLength((currentDist + 14) % totalLen);
      const pNext = path.getPointAtLength((currentDist + 2) % totalLen);

      const tangentCurrent = Math.atan2(pNext.y - p1.y, pNext.x - p1.x);
      const tangentAhead = Math.atan2(pAhead.y - p1.y, pAhead.x - p1.x);
      let angleDiff = Math.abs(tangentAhead - tangentCurrent);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      const isCornering = angleDiff > 0.08;
      const targetSpeed = locked ? 0 : isCornering ? cornerSpeed : cruiseSpeed;
      const accelRate = locked ? 4.2 : isCornering ? 4.5 : 3.0;

      state.currentSpeed += (targetSpeed - state.currentSpeed) * Math.min(dt * accelRate, 1);
      if (locked && state.currentSpeed < 0.6) {
        state.currentSpeed = 0;
      }

      // Smoothly advance position along closed-loop path
      const pxPerSec = (state.currentSpeed / 64) * 66;
      state.distance = (currentDist + pxPerSec * dt) % totalLen;

      const dist = state.distance;
      const pt = path.getPointAtLength(dist % totalLen);
      const ptNext = path.getPointAtLength((dist + 1.5) % totalLen);
      const angleDeg = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI);

      // 1. Direct DOM transform update for vehicle indicator (0 React re-renders)
      if (vehicleGroupRef.current) {
        vehicleGroupRef.current.setAttribute(
          'transform',
          `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) rotate(${angleDeg.toFixed(2)})`
        );
      }

      // 2. Direct DOM update for neon trail
      const targetTrailScale = locked ? 0 : 1;
      state.trailScale += (targetTrailScale - state.trailScale) * Math.min(dt * 4, 1);
      const currentTrailLen = Math.max(maxTrailLength * state.trailScale, 0.5);
      const gapLength = Math.max(totalLen - currentTrailLen, 1);
      const dashOffset = currentTrailLen - (dist % totalLen);

      if (activeTrailRef.current && glowTrailRef.current) {
        const trailOpacity = state.trailScale > 0.03 ? state.trailScale.toFixed(2) : '0';
        activeTrailRef.current.style.opacity = trailOpacity;
        glowTrailRef.current.style.opacity = trailOpacity;

        const dashArrayStr = `${currentTrailLen.toFixed(1)} ${gapLength.toFixed(1)}`;
        const dashOffsetStr = dashOffset.toFixed(1);

        activeTrailRef.current.setAttribute('stroke-dasharray', dashArrayStr);
        activeTrailRef.current.setAttribute('stroke-dashoffset', dashOffsetStr);

        glowTrailRef.current.setAttribute('stroke-dasharray', dashArrayStr);
        glowTrailRef.current.setAttribute('stroke-dashoffset', dashOffsetStr);
      }

      // 3. Geofence distance & breach vector line calculation
      const dx = pt.x - GEOFENCE_CENTER.x;
      const dy = pt.y - GEOFENCE_CENTER.y;
      const distFromGeofenceCenter = Math.hypot(dx, dy);
      const outsideNow = distFromGeofenceCenter > GEOFENCE_RADIUS;

      if (breachLineRef.current && breachDotRef.current) {
        if (outsideNow && distFromGeofenceCenter > 0) {
          const ux = dx / distFromGeofenceCenter;
          const uy = dy / distFromGeofenceCenter;
          const edgeX = GEOFENCE_CENTER.x + ux * GEOFENCE_RADIUS;
          const edgeY = GEOFENCE_CENTER.y + uy * GEOFENCE_RADIUS;

          breachLineRef.current.setAttribute('x1', edgeX.toFixed(1));
          breachLineRef.current.setAttribute('y1', edgeY.toFixed(1));
          breachLineRef.current.setAttribute('x2', pt.x.toFixed(1));
          breachLineRef.current.setAttribute('y2', pt.y.toFixed(1));

          breachDotRef.current.setAttribute('cx', edgeX.toFixed(1));
          breachDotRef.current.setAttribute('cy', edgeY.toFixed(1));
        }
      }

      if (outsideNow !== state.lastOutside) {
        state.lastOutside = outsideNow;
        setIsOutsideGeofence(outsideNow);
      }

      const stoppedNow = state.currentSpeed === 0;
      if (stoppedNow !== state.lastStopped) {
        state.lastStopped = stoppedNow;
        setIsFullyStopped(stoppedNow);
      }

      // 4. Update HUD speed text directly and throttle parent React callback
      const displaySpeed = Math.round(state.currentSpeed);
      if (speedHudTextRef.current) {
        speedHudTextRef.current.textContent =
          displaySpeed > 0 ? `${displaySpeed} km/h` : 'Bloqueado (0 km/h)';
      }

      const formattedSpeed = `${displaySpeed} km/h`;
      if (
        formattedSpeed !== state.lastReportedSpeed &&
        (displaySpeed === 0 || time - state.lastSpeedReportTime > 180)
      ) {
        state.lastReportedSpeed = formattedSpeed;
        state.lastSpeedReportTime = time;
        callbacksRef.current.onSpeedChange?.(formattedSpeed);
      }

      // 5. Update street name only when crossing into a new street segment
      const street = resolveStreetName(pt.x, pt.y);
      if (street !== state.lastLocation) {
        state.lastLocation = street;
        setLocationLabel(street);
        callbacksRef.current.onLocationChange?.(street);
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isInView]);

  return (
    <div
      ref={containerRef}
      className={`relative h-64 sm:h-72 lg:h-80 w-full overflow-hidden select-none bg-[#080c14] transition-colors duration-300 ${
        isGeofenceBreached ? 'ring-2 ring-inset ring-red-500/90' : ''
      }`}
    >
      {/* SVG City Map Canvas */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle grid pattern for ground texture */}
          <pattern id={`map-grid-${filterId}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#121824" strokeWidth="0.5" />
          </pattern>

          {/* Neon Trail Glow Filter */}
          <filter id={`neon-glow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radar Radial Gradient for Geofence */}
          <radialGradient id={`geofence-glow-${filterId}`} cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor="#ef251b"
              stopOpacity={isGeofenceBreached ? '0.26' : '0.15'}
            />
            <stop
              offset="70%"
              stopColor="#ef251b"
              stopOpacity={isGeofenceBreached ? '0.12' : '0.06'}
            />
            <stop offset="100%" stopColor="#ef251b" stopOpacity="0" />
          </radialGradient>

          {/* Headlight Beam Cone Gradient */}
          <linearGradient id={`headlight-${filterId}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ff4d40" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#ff7a70" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffb3ad" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Map Background Base */}
        <rect width="640" height="360" fill="#080c14" />
        <rect width="640" height="360" fill={`url(#map-grid-${filterId})`} />

        {/* ========================================================
            CITY BLOCKS (QUADRAS & URBAN BUILDINGS)
        ======================================================== */}
        <g id="city-blocks">
          {/* Row 0: Top Edge Blocks */}
          <rect x="14" y="-10" width="60" height="46" rx="3" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="104" y="-10" width="90" height="46" rx="3" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="224" y="-10" width="90" height="46" rx="3" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="346" y="-10" width="68" height="46" rx="3" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="444" y="-10" width="60" height="46" rx="3" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="534" y="-10" width="92" height="46" rx="3" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />

          {/* Row 1: Between Al. Rio Claro & Av. Paulista (y: 54 to 138) */}
          <rect x="14" y="56" width="60" height="80" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="24" y="66" width="40" height="30" rx="2" fill="#131c2c" />
          <rect x="24" y="104" width="40" height="22" rx="2" fill="#131c2c" />

          <rect x="104" y="56" width="90" height="80" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="114" y="66" width="70" height="36" rx="2" fill="#131c2c" />
          <rect x="114" y="108" width="30" height="20" rx="2" fill="#152033" />
          <rect x="150" y="108" width="34" height="20" rx="2" fill="#131c2c" />

          {/* Shopping & Commercial Towers Block */}
          <rect x="224" y="56" width="90" height="80" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="234" y="66" width="70" height="42" rx="2" fill="#141f30" stroke="#223048" strokeWidth="0.8" />
          <rect x="234" y="114" width="70" height="14" rx="1.5" fill="#131c2c" />

          <rect x="346" y="56" width="68" height="80" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="356" y="66" width="48" height="60" rx="2" fill="#131c2c" />

          <rect x="444" y="56" width="60" height="80" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="454" y="66" width="40" height="60" rx="2" fill="#131c2c" />

          <rect x="534" y="56" width="92" height="80" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="544" y="66" width="72" height="34" rx="2" fill="#131c2c" />
          <rect x="544" y="106" width="72" height="22" rx="2" fill="#152033" />

          {/* Row 2: Between Av. Paulista & Al. Santos (y: 182 to 256) */}
          <rect x="14" y="184" width="60" height="70" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="24" y="194" width="40" height="50" rx="2" fill="#131c2c" />

          <rect x="104" y="184" width="90" height="70" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="114" y="194" width="70" height="28" rx="2" fill="#131c2c" />
          <rect x="114" y="228" width="70" height="18" rx="2" fill="#152033" />

          {/* PARQUE TRIANON (Green Space) & MASP Landmark */}
          <g id="parque-trianon">
            <rect x="224" y="184" width="90" height="70" rx="4" fill="#0b1b16" stroke="#16382a" strokeWidth="1.2" />
            <circle cx="242" cy="202" r="8" fill="#102b21" />
            <circle cx="260" cy="214" r="10" fill="#14362a" />
            <circle cx="282" cy="204" r="9" fill="#102b21" />
            <circle cx="250" cy="232" r="9" fill="#123024" />
            <circle cx="274" cy="230" r="11" fill="#14362a" />
            <circle cx="295" cy="222" r="7" fill="#0f291f" />
            <text x="269" y="246" fill="#296b52" fontSize="5.5" fontWeight="700" letterSpacing="0.8" textAnchor="middle">
              PARQUE TRIANON
            </text>
          </g>

          {/* MASP Landmark Building on Paulista */}
          <g id="masp-landmark">
            <rect x="238" y="169" width="48" height="14" rx="2" fill="#151e2e" stroke="#25354d" strokeWidth="1" />
            <line x1="240" y1="168" x2="240" y2="184" stroke="#ef251b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="284" y1="168" x2="284" y2="184" stroke="#ef251b" strokeWidth="2.5" strokeLinecap="round" />
            <text x="262" y="179" fill="#94a3b8" fontSize="5.5" fontWeight="800" letterSpacing="1" textAnchor="middle">
              MASP
            </text>
          </g>

          <rect x="346" y="184" width="68" height="70" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="356" y="194" width="48" height="50" rx="2" fill="#131c2c" />

          <rect x="444" y="184" width="60" height="70" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="454" y="194" width="40" height="50" rx="2" fill="#131c2c" />

          <rect x="534" y="184" width="92" height="70" rx="4" fill="#0e1522" stroke="#182335" strokeWidth="1" />
          <rect x="544" y="194" width="72" height="50" rx="2" fill="#131c2c" />

          {/* Row 3: South of Al. Santos (y: 290 to 360) */}
          <rect x="14" y="292" width="60" height="70" rx="4" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="104" y="292" width="90" height="70" rx="4" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="224" y="292" width="90" height="70" rx="4" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="346" y="292" width="68" height="70" rx="4" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="444" y="292" width="60" height="70" rx="4" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
          <rect x="534" y="292" width="92" height="70" rx="4" fill="#0d131d" stroke="#161f2e" strokeWidth="1" />
        </g>

        {/* ========================================================
            STREET NETWORK (ROADS, LANES & INTERSECTIONS)
        ======================================================== */}
        <g id="streets">
          {/* Secondary Horizontal Street (Al. Rio Claro, y: 45) */}
          <rect x="-10" y="38" width="660" height="16" fill="#111722" />
          <line x1="-10" y1="46" x2="650" y2="46" stroke="#1c2637" strokeWidth="1" strokeDasharray="3 5" />

          {/* Secondary Horizontal Street (Al. Santos, y: 272) */}
          <rect x="-10" y="260" width="660" height="26" fill="#121824" />
          <line x1="-10" y1="260" x2="650" y2="260" stroke="#1d273a" strokeWidth="1" />
          <line x1="-10" y1="286" x2="650" y2="286" stroke="#1d273a" strokeWidth="1" />
          <line x1="-10" y1="273" x2="650" y2="273" stroke="#25334c" strokeWidth="1" strokeDasharray="5 7" />

          {/* Vertical Cross Streets */}
          {/* R. da Consolação (x: 89) */}
          <rect x="76" y="-10" width="26" height="380" fill="#121824" />
          <line x1="76" y1="-10" x2="76" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="102" y1="-10" x2="102" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="89" y1="-10" x2="89" y2="380" stroke="#25334c" strokeWidth="1" strokeDasharray="4 6" />

          {/* R. Bela Cintra (x: 209) */}
          <rect x="196" y="-10" width="26" height="380" fill="#121824" />
          <line x1="196" y1="-10" x2="196" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="222" y1="-10" x2="222" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="209" y1="-10" x2="209" y2="380" stroke="#25334c" strokeWidth="1" strokeDasharray="4 6" />

          {/* R. Haddock Lobo (x: 330) */}
          <rect x="316" y="-10" width="28" height="380" fill="#121824" />
          <line x1="316" y1="-10" x2="316" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="344" y1="-10" x2="344" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="330" y1="-10" x2="330" y2="380" stroke="#25334c" strokeWidth="1" strokeDasharray="4 6" />

          {/* R. Augusta (x: 429) */}
          <rect x="416" y="-10" width="26" height="380" fill="#121824" />
          <line x1="416" y1="-10" x2="416" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="442" y1="-10" x2="442" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="429" y1="-10" x2="429" y2="380" stroke="#25334c" strokeWidth="1" strokeDasharray="4 6" />

          {/* Al. Min. Rocha Azevedo (x: 519) */}
          <rect x="506" y="-10" width="26" height="380" fill="#121824" />
          <line x1="506" y1="-10" x2="506" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="532" y1="-10" x2="532" y2="380" stroke="#1d273a" strokeWidth="1" />
          <line x1="519" y1="-10" x2="519" y2="380" stroke="#25334c" strokeWidth="1" strokeDasharray="4 6" />

          {/* MAIN ARTERY: AVENIDA PAULISTA (y: 142 to 178) */}
          <rect x="-10" y="140" width="660" height="40" fill="#151c29" />
          <line x1="-10" y1="140" x2="650" y2="140" stroke="#26344b" strokeWidth="1.2" />
          <line x1="-10" y1="180" x2="650" y2="180" stroke="#26344b" strokeWidth="1.2" />

          {/* Av. Paulista Center Median Strip */}
          <rect x="-10" y="159" width="660" height="2" fill="#090d14" />
          <line x1="-10" y1="151" x2="650" y2="151" stroke="#2a3952" strokeWidth="0.8" strokeDasharray="6 8" />
          <line x1="-10" y1="169" x2="650" y2="169" stroke="#2a3952" strokeWidth="0.8" strokeDasharray="6 8" />

          {/* Pedestrian Crosswalks (Faixas de Pedestres) at Intersections */}
          {[89, 209, 330, 429, 519].map((crossX) => (
            <g key={`crosswalk-${crossX}`} opacity="0.35">
              <line x1={crossX - 8} y1="142" x2={crossX - 8} y2="158" stroke="#fff" strokeWidth="1.5" strokeDasharray="2.5 2" />
              <line x1={crossX + 8} y1="142" x2={crossX + 8} y2="158" stroke="#fff" strokeWidth="1.5" strokeDasharray="2.5 2" />
              <line x1={crossX - 8} y1="162" x2={crossX - 8} y2="178" stroke="#fff" strokeWidth="1.5" strokeDasharray="2.5 2" />
              <line x1={crossX + 8} y1="162" x2={crossX + 8} y2="178" stroke="#fff" strokeWidth="1.5" strokeDasharray="2.5 2" />
            </g>
          ))}
        </g>

        {/* ========================================================
            STREET LABELS & METRO STATIONS
        ======================================================== */}
        <g id="street-labels" pointerEvents="none">
          <text
            x="385"
            y="161.5"
            fill="#7e91ac"
            fontSize="7"
            fontWeight="700"
            letterSpacing="2.5"
            textAnchor="middle"
            opacity="0.7"
          >
            AVENIDA PAULISTA
          </text>
          <text
            x="150"
            y="161.5"
            fill="#7e91ac"
            fontSize="6.5"
            fontWeight="700"
            letterSpacing="2"
            textAnchor="middle"
            opacity="0.6"
          >
            AV. PAULISTA
          </text>

          <text
            x="385"
            y="274.5"
            fill="#62738d"
            fontSize="6"
            fontWeight="600"
            letterSpacing="1.8"
            textAnchor="middle"
            opacity="0.6"
          >
            ALAMEDA SANTOS
          </text>

          <text
            x="331"
            y="225"
            fill="#62738d"
            fontSize="5.5"
            fontWeight="600"
            letterSpacing="1.2"
            textAnchor="middle"
            transform="rotate(90 331 225)"
            opacity="0.6"
          >
            R. HADDOCK LOBO
          </text>

          <text
            x="430"
            y="225"
            fill="#62738d"
            fontSize="5.5"
            fontWeight="600"
            letterSpacing="1.2"
            textAnchor="middle"
            transform="rotate(90 430 225)"
            opacity="0.6"
          >
            RUA AUGUSTA
          </text>

          <text
            x="210"
            y="95"
            fill="#62738d"
            fontSize="5.5"
            fontWeight="600"
            letterSpacing="1.2"
            textAnchor="middle"
            transform="rotate(90 210 95)"
            opacity="0.6"
          >
            R. BELA CINTRA
          </text>

          <text
            x="520"
            y="225"
            fill="#62738d"
            fontSize="5"
            fontWeight="600"
            letterSpacing="1"
            textAnchor="middle"
            transform="rotate(90 520 225)"
            opacity="0.6"
          >
            AL. MIN. ROCHA AZEVEDO
          </text>

          {/* Metro Stations Icons */}
          <g transform="translate(192, 148)" opacity="0.85">
            <circle cx="0" cy="0" r="4.5" fill="#ef251b" />
            <text x="0" y="2.2" fill="#fff" fontSize="5" fontWeight="900" textAnchor="middle">
              M
            </text>
            <text x="7" y="2" fill="#94a3b8" fontSize="4.5" fontWeight="600">
              Consolação
            </text>
          </g>

          <g transform="translate(305, 148)" opacity="0.85">
            <circle cx="0" cy="0" r="4.5" fill="#ef251b" />
            <text x="0" y="2.2" fill="#fff" fontSize="5" fontWeight="900" textAnchor="middle">
              M
            </text>
            <text x="7" y="2" fill="#94a3b8" fontSize="4.5" fontWeight="600">
              Trianon-MASP
            </text>
          </g>
        </g>

        {/* ========================================================
            GEOFENCE (CERCA SEGURA VIRTUAL)
        ======================================================== */}
        <AnimatePresence>
          {isGeofenceActive && (
            <motion.g
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35 }}
            >
              {/* Radial Safe Perimeter Area */}
              <circle
                cx={GEOFENCE_CENTER.x}
                cy={GEOFENCE_CENTER.y}
                r={GEOFENCE_RADIUS}
                fill={`url(#geofence-glow-${filterId})`}
                stroke={isGeofenceBreached ? '#ff3b30' : '#ef251b'}
                strokeWidth={isGeofenceBreached ? '2.2' : '1.5'}
                strokeDasharray="6 4"
                opacity={isGeofenceBreached ? '0.95' : '0.75'}
              />
              <circle
                cx={GEOFENCE_CENTER.x}
                cy={GEOFENCE_CENTER.y}
                r={GEOFENCE_RADIUS}
                fill="none"
                stroke="#ef251b"
                strokeWidth={isGeofenceBreached ? '1.4' : '0.8'}
                opacity={isGeofenceBreached ? '0.6' : '0.3'}
              />

              {/* Pulsing outer shockwave ring when geofence is breached */}
              {isGeofenceBreached && (
                <circle
                  cx={GEOFENCE_CENTER.x}
                  cy={GEOFENCE_CENTER.y}
                  r={GEOFENCE_RADIUS}
                  fill="none"
                  stroke="#ff3b30"
                  strokeWidth="2"
                >
                  <animate
                    attributeName="r"
                    values={`${GEOFENCE_RADIUS};${GEOFENCE_RADIUS + 18}`}
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.7;0"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Tactical Breach Vector Line (connects perimeter exit point to vehicle when breached) */}
        <g
          style={{
            opacity: isGeofenceBreached ? 1 : 0,
            transition: 'opacity 180ms ease',
          }}
          pointerEvents="none"
        >
          <line
            ref={breachLineRef}
            x1={GEOFENCE_CENTER.x}
            y1={GEOFENCE_CENTER.y}
            x2={GEOFENCE_CENTER.x}
            y2={GEOFENCE_CENTER.y}
            stroke="#ff3b30"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.85"
          />
          <circle
            ref={breachDotRef}
            cx={GEOFENCE_CENTER.x}
            cy={GEOFENCE_CENTER.y}
            r="3.5"
            fill="#ff3b30"
            stroke="#ffffff"
            strokeWidth="1"
          />
        </g>

        {/* ========================================================
            VEHICLE ROUTE NAVIGATION & ANIMATED TRAIL
        ======================================================== */}
        {/* Hidden Reference Path used for exact mathematical length & sampling */}
        <path
          ref={hiddenPathRef}
          d={ROUTE_PATH_D}
          fill="none"
          stroke="transparent"
          strokeWidth="1"
        />

        {/* Planned GPS Route (Ahead) - subtle dashed guide along the streets */}
        <path
          d={ROUTE_PATH_D}
          fill="none"
          stroke={isGeofenceBreached ? 'rgba(255, 59, 48, 0.28)' : 'rgba(239, 37, 27, 0.2)'}
          strokeWidth="2.5"
          strokeDasharray="5 5"
        />

        {/* Traveled Route Glow Layer (Behind Indicator) */}
        <path
          ref={glowTrailRef}
          d={ROUTE_PATH_D}
          fill="none"
          stroke="#ef251b"
          strokeWidth="6"
          strokeLinecap="round"
          filter={`url(#neon-glow-${filterId})`}
          opacity="0"
        />

        {/* Traveled Route Sharp Core Layer (Behind Indicator) */}
        <path
          ref={activeTrailRef}
          d={ROUTE_PATH_D}
          fill="none"
          stroke="#ff4d40"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0"
        />

        {/* ========================================================
            ANIMATED VEHICLE INDICATOR (UPDATED AT 60FPS VIA DOM REF)
        ======================================================== */}
        <g
          ref={vehicleGroupRef}
          transform="translate(240, 169) rotate(0)"
          style={{ willChange: 'transform' }}
        >
          {!isFullyStopped && (
            <polygon
              points="0,-3 36,-14 36,14 0,3"
              fill={`url(#headlight-${filterId})`}
            />
          )}

          {/* Pulsing Radar Ring around Vehicle */}
          <circle
            cx="0"
            cy="0"
            r="14"
            fill={isGeofenceBreached ? '#ff2a1f' : '#ef251b'}
            opacity="0.25"
          >
            <animate
              attributeName="r"
              values={isGeofenceBreached ? '8;26' : '8;22'}
              dur={isGeofenceBreached ? '0.85s' : '1.4s'}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={isGeofenceBreached ? '0.65;0' : '0.5;0'}
              dur={isGeofenceBreached ? '0.85s' : '1.4s'}
              repeatCount="indefinite"
            />
          </circle>

          {/* Vehicle Outer Red Halo */}
          <circle
            cx="0"
            cy="0"
            r="8.5"
            fill={isLocked ? '#1e293b' : '#ef251b'}
            stroke={isLocked ? '#ef251b' : '#ffffff'}
            strokeWidth="1.6"
            filter={`url(#neon-glow-${filterId})`}
          />

          {/* Directional Navigation Arrow Tip or Lock Center Dot */}
          {isFullyStopped ? (
            <circle cx="0" cy="0" r="3" fill="#ef251b" />
          ) : (
            <path d="M 5,0 L -4,-4 L -2,0 L -4,4 Z" fill="#ffffff" />
          )}
        </g>
      </svg>

      {/* ========================================================
          RED FLASHING MAP BORDER OVERLAY (WHEN GEOFENCE BREACHED)
      ======================================================== */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-200 ${
          isGeofenceBreached ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        {/* Flashing Red Border + Inner Emergency Vignette */}
        <div className="animate-map-alert-pulse absolute inset-0 border-[2.5px] border-red-500 shadow-[inset_0_0_34px_rgba(239,37,27,0.58)]" />

        {/* Tactical Corner Brackets */}
        <span className="absolute left-1.5 top-1.5 size-3.5 border-l-2 border-t-2 border-red-500" />
        <span className="absolute right-1.5 top-1.5 size-3.5 border-r-2 border-t-2 border-red-500" />
        <span className="absolute bottom-1.5 left-1.5 size-3.5 border-b-2 border-l-2 border-red-500" />
        <span className="absolute bottom-1.5 right-1.5 size-3.5 border-b-2 border-r-2 border-red-500" />
      </div>

      {/* High-Tech HUD Overlays in Corners */}
      {/* Geofence Active / Breached Indicator Pill */}
      {isGeofenceActive && (
        <div
          className={`pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-200 ${
            isGeofenceBreached
              ? 'border-red-500 bg-red-950/90 text-red-200 shadow-[0_0_20px_rgba(239,37,27,0.5)]'
              : 'border-primary/40 bg-background/80 text-primary shadow-lg shadow-primary/10'
          }`}
        >
          {isGeofenceBreached ? (
            <>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-90" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              <ShieldAlert className="size-3 text-red-400" />
              <span>Cerca Violada • Alerta</span>
            </>
          ) : (
            <>
              <ShieldCheck className="size-3" />
              <span>Cerca Segura Ativa</span>
            </>
          )}
        </div>
      )}

      {/* Vehicle Status Beacon (Top Right) */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded border border-border/60 bg-background/80 px-2.5 py-1 text-[0.62rem] font-medium text-muted-foreground backdrop-blur-md">
        <Compass className="size-3 text-primary animate-spin [animation-duration:12s]" />
        <span ref={speedHudTextRef} className="font-mono text-[0.6rem] text-foreground">
          62 km/h
        </span>
      </div>

      {/* Floating Info Pill at the Bottom of the Map */}
      <div
        className={`absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between rounded-lg border px-3 py-2 backdrop-blur-md shadow-xl transition-colors duration-200 ${
          isGeofenceBreached
            ? 'border-red-500/60 bg-[#14080a]/90'
            : 'border-border/80 bg-background/85'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex size-2 flex-none">
            {!isLocked ? (
              <>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </>
            ) : (
              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
            )}
          </span>
          <span className="truncate text-xs font-semibold text-foreground">
            {locationLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-none">
          {isGeofenceBreached && (
            <span className="hidden sm:flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-red-300 border border-red-500/40">
              Fora da Zona
            </span>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-red-400 border border-red-500/20">
              <Lock className="size-2.5" />
              Bloqueado
            </span>
          )}
          <span className="rounded bg-secondary px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            {vehiclePlate}
          </span>
        </div>
      </div>
    </div>
  );
}
