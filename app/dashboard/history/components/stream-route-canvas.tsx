"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { GoogleMapView } from "@/app/dashboard/components/google-map-view";
import {
  formatSpeedLabel,
  formatTimeWithSeconds,
  type TripPoint,
} from "@/lib/trip-format";

interface StreamRouteCanvasProps {
  points: TripPoint[];
  focusedPoint: TripPoint | null;
  focusedPointNumber?: number | null;
  isStreaming: boolean;
  hasGoogleMapsKey?: boolean;
}

export function StreamRouteCanvas({
  points,
  focusedPoint,
  focusedPointNumber = null,
  isStreaming,
  hasGoogleMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
}: StreamRouteCanvasProps) {
  const activePoint =
    focusedPoint ??
    (points.length > 0 ? points[points.length - 1] : null);

  const resolvedPointNumber = useMemo(() => {
    if (points.length === 0 || !activePoint) return null;
    if (focusedPointNumber && focusedPointNumber >= 1) return focusedPointNumber;
    const idx = points.findIndex(
      (p) =>
        p.timestamp === activePoint.timestamp &&
        p.latitude === activePoint.latitude &&
        p.longitude === activePoint.longitude,
    );
    return idx >= 0 ? idx + 1 : points.length;
  }, [points, activePoint, focusedPointNumber]);

  const activeMarkerTitle = activePoint
    ? `Ponto #${resolvedPointNumber ?? points.length} • ${formatTimeWithSeconds(activePoint.timestamp)} • ${formatSpeedLabel(activePoint.speed)}`
    : undefined;

  const originPoint = points.length > 1 ? points[0] : null;
  const originMarkerTitle = originPoint
    ? `Ponto #1 • Partida • ${formatTimeWithSeconds(originPoint.timestamp)}`
    : undefined;

  // Normalized SVG path for instant animated vector feedback when Google Maps is not configured
  const svgData = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latSpan = Math.max(maxLat - minLat, 0.0005);
    const lonSpan = Math.max(maxLon - minLon, 0.0005);
    const width = 480;
    const height = 260;
    const pad = 28;

    const project = (p: TripPoint) => {
      const x = pad + ((p.longitude - minLon) / lonSpan) * (width - pad * 2);
      const y = height - pad - ((p.latitude - minLat) / latSpan) * (height - pad * 2);
      return { x, y };
    };

    const projected = points.map(project);
    const pathD = projected
      .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(" ");

    const startPt = projected[0];
    const endPt = projected[projected.length - 1];
    const focusProj = activePoint ? project(activePoint) : endPt;

    return { width, height, pathD, startPt, endPt, focusProj };
  }, [points, activePoint]);

  if (hasGoogleMapsKey && activePoint) {
    return (
      <div className="relative h-64 sm:h-80 overflow-hidden rounded-xl border border-border/70 bg-background">
        <GoogleMapView
          position={{ latitude: activePoint.latitude, longitude: activePoint.longitude }}
          heading={activePoint.heading ?? 0}
          originPosition={
            originPoint
              ? { latitude: originPoint.latitude, longitude: originPoint.longitude }
              : null
          }
          originTitle={originMarkerTitle}
          history={points}
          markerType="pin"
          markerTitle={activeMarkerTitle}
          showCircle={isStreaming}
          zoom={15}
        />
        {isStreaming && (
          <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span>Desenhando rota em tempo real...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-64 sm:h-80 overflow-hidden rounded-xl border border-border/70 bg-[#0d0d10]">
      <div className="mini-map absolute inset-0 opacity-35" />

      {svgData ? (
        <svg
          viewBox={`0 0 ${svgData.width} ${svgData.height}`}
          className="relative z-10 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="rideonTrailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#ef251b" />
            </linearGradient>
          </defs>

          <motion.path
            d={svgData.pathD}
            fill="none"
            stroke="url(#rideonTrailGrad)"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />

          {/* Origin dot */}
          <circle
            cx={svgData.startPt.x}
            cy={svgData.startPt.y}
            r={5}
            fill="#34d399"
            stroke="#09090b"
            strokeWidth={2}
          />

          {/* Leading / focused point with pulse */}
          {isStreaming && (
            <motion.circle
              cx={svgData.focusProj.x}
              cy={svgData.focusProj.y}
              r={12}
              fill="rgba(239, 37, 27, 0.25)"
              animate={{ r: [7, 15, 7], opacity: [0.8, 0.15, 0.8] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
          <circle
            cx={svgData.focusProj.x}
            cy={svgData.focusProj.y}
            r={5.5}
            fill="#ef251b"
            stroke="#ffffff"
            strokeWidth={2}
          />
        </svg>
      ) : (
        <div className="relative z-10 flex h-full items-center justify-center text-xs text-muted-foreground">
          Aguardando pontos do stream...
        </div>
      )}

      {/* Live Point HUD (without raw coordinates) */}
      {activePoint && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-lg border border-border/80 bg-background/90 px-3 py-1.5 backdrop-blur-md">
          <p className="font-mono text-[11px] font-semibold text-foreground">
            Ponto #{resolvedPointNumber ?? points.length} de {points.length}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatTimeWithSeconds(activePoint.timestamp)} • {formatSpeedLabel(activePoint.speed)}
          </p>
        </div>
      )}
    </div>
  );
}
