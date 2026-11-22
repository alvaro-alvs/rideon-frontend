"use client";

import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { isValidCoordinate } from "@/lib/geo";
import type { GeofenceItem, LatLngPoint } from "@/lib/types/protection";

export interface GoogleMapViewProps {
  position: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  history?: Array<{ latitude: number; longitude: number }>;
  geofences?: GeofenceItem[];
  draftCircle?: { center: LatLngPoint; radiusMeters: number; color?: string } | null;
  draftPolygon?: LatLngPoint[];
  pulseMode?: "none" | "anchor" | "breach";
  zoom?: number;
  interactive?: boolean;
  markerType?: "arrow" | "pin";
  showCircle?: boolean;
  className?: string;
  onMapClick?: (coords: LatLngPoint) => void;
}

const PIN_SVG_PATH =
  "M 12 2 C 7.58 2 4 5.58 4 10 c 0 5.25 8 13 8 13 s 8 -7.75 8 -13 c 0 -4.42 -3.58 -8 -8 -8 z M 12 13 c -1.66 0 -3 -1.34 -3 -3 s 1.34 -3 3 -3 s 3 1.34 3 3 s -1.34 3 -3 3 z";

export function GoogleMapView({
  position,
  heading = 0,
  history = [],
  geofences = [],
  draftCircle = null,
  draftPolygon = [],
  pulseMode = "none",
  zoom,
  interactive = true,
  markerType = "arrow",
  showCircle = false,
  className,
  onMapClick,
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const circleInstance = useRef<google.maps.Circle | null>(null);
  const pulseCircleInstance = useRef<google.maps.Circle | null>(null);
  const polylineInstance = useRef<google.maps.Polyline | null>(null);
  const fenceOverlaysRef = useRef<Array<google.maps.Circle | google.maps.Polygon>>([]);
  const draftOverlaysRef = useRef<Array<google.maps.Circle | google.maps.Polygon | google.maps.Polyline>>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const getMarkerIcon = (type: "arrow" | "pin", angle: number): google.maps.Symbol => {
    if (type === "pin") {
      return {
        path: PIN_SVG_PATH,
        scale: 1.8,
        anchor: new google.maps.Point(12, 23),
        fillColor: "#ef251b",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      };
    }
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6,
      fillColor: "#ef251b",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      rotation: angle,
    };
  };

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    setOptions({
      key: apiKey,
      v: "weekly",
    });

    let isMounted = true;

    importLibrary("maps")
      .then(() => {
        if (!mapRef.current || !isMounted) return;

        const hasValidInitial = isValidCoordinate(position.latitude, position.longitude);
        const center = hasValidInitial
          ? { lat: position.latitude, lng: position.longitude }
          : { lat: -23.5505, lng: -46.6333 };

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: zoom ?? (hasValidInitial ? 16 : 10),
          styles: darkMapStyle,
          disableDefaultUI: !interactive,
          gestureHandling: interactive ? "auto" : "none",
          keyboardShortcuts: interactive,
          zoomControl: interactive,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });

        const marker = hasValidInitial
          ? new google.maps.Marker({
              position: center,
              map,
              title: markerType === "pin" ? "Última posição do veículo" : "Veículo em tempo real",
              icon: getMarkerIcon(markerType, heading),
            })
          : null;

        const circle =
          showCircle && hasValidInitial
            ? new google.maps.Circle({
                map,
                center,
                radius: 40,
                fillColor: "#ef251b",
                fillOpacity: 0.22,
                strokeColor: "#ef251b",
                strokeOpacity: 0.7,
                strokeWeight: 1.5,
              })
            : null;

        const polyline = new google.maps.Polyline({
          map,
          path: history
            .filter((p) => isValidCoordinate(p.latitude, p.longitude))
            .map((p) => ({ lat: p.latitude, lng: p.longitude })),
          geodesic: true,
          strokeColor: "#ef251b",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        });

        if (interactive) {
          clickListenerRef.current = map.addListener(
            "click",
            (e: google.maps.MapMouseEvent) => {
              if (e.latLng && onMapClickRef.current) {
                onMapClickRef.current({
                  latitude: e.latLng.lat(),
                  longitude: e.latLng.lng(),
                });
              }
            },
          );
        }

        googleMapInstance.current = map;
        markerInstance.current = marker;
        circleInstance.current = circle;
        polylineInstance.current = polyline;
      })
      .catch((err: unknown) => {
        console.error("Erro ao carregar Google Maps API:", err);
      });

    return () => {
      isMounted = false;
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
      fenceOverlaysRef.current.forEach((o) => o.setMap(null));
      fenceOverlaysRef.current = [];
      draftOverlaysRef.current.forEach((o) => o.setMap(null));
      draftOverlaysRef.current = [];
      if (pulseCircleInstance.current) {
        pulseCircleInstance.current.setMap(null);
        pulseCircleInstance.current = null;
      }
      if (markerInstance.current) {
        markerInstance.current.setMap(null);
        markerInstance.current = null;
      }
      if (circleInstance.current) {
        circleInstance.current.setMap(null);
        circleInstance.current = null;
      }
      if (polylineInstance.current) {
        polylineInstance.current.setMap(null);
        polylineInstance.current = null;
      }
      googleMapInstance.current = null;
    };
  }, [apiKey, interactive, markerType, showCircle, zoom]);

  // Update marker, circle, polyline & pan when position changes
  useEffect(() => {
    if (!googleMapInstance.current) return;

    const hasValidPos = isValidCoordinate(position.latitude, position.longitude);
    if (!hasValidPos) return;

    const latLng = { lat: position.latitude, lng: position.longitude };

    if (!markerInstance.current) {
      markerInstance.current = new google.maps.Marker({
        position: latLng,
        map: googleMapInstance.current,
        title: markerType === "pin" ? "Última posição do veículo" : "Veículo em tempo real",
        icon: getMarkerIcon(markerType, heading),
      });
      googleMapInstance.current.setZoom(zoom ?? 16);
    } else {
      markerInstance.current.setPosition(latLng);
      markerInstance.current.setIcon(getMarkerIcon(markerType, heading));
    }

    if (showCircle) {
      if (!circleInstance.current) {
        circleInstance.current = new google.maps.Circle({
          map: googleMapInstance.current,
          center: latLng,
          radius: 40,
          fillColor: "#ef251b",
          fillOpacity: 0.22,
          strokeColor: "#ef251b",
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
        });
      } else {
        circleInstance.current.setCenter(latLng);
      }
    } else if (circleInstance.current) {
      circleInstance.current.setMap(null);
      circleInstance.current = null;
    }

    googleMapInstance.current.panTo(latLng);

    if (polylineInstance.current && history.length > 0) {
      polylineInstance.current.setPath(
        history
          .filter((p) => isValidCoordinate(p.latitude, p.longitude))
          .map((p) => ({ lat: p.latitude, lng: p.longitude })),
      );
    }
  }, [position.latitude, position.longitude, heading, history, markerType, showCircle, zoom]);

  // Render active & inactive geofences
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!map || typeof google === "undefined" || !google.maps) return;

    fenceOverlaysRef.current.forEach((o) => o.setMap(null));
    fenceOverlaysRef.current = [];

    for (const fence of geofences) {
      const baseColor =
        fence.color ||
        (fence.kind === "restricted_zone"
          ? "#ef4444"
          : fence.kind === "anchor"
            ? "#f59e0b"
            : "#10b981");

      if (fence.shape === "circle" && fence.center) {
        const c = new google.maps.Circle({
          map,
          center: { lat: fence.center.latitude, lng: fence.center.longitude },
          radius: fence.radius_meters || 60,
          fillColor: baseColor,
          fillOpacity: fence.active ? 0.16 : 0.05,
          strokeColor: baseColor,
          strokeOpacity: fence.active ? 0.85 : 0.3,
          strokeWeight: fence.kind === "anchor" ? 2.5 : 2,
          clickable: false,
        });
        fenceOverlaysRef.current.push(c);
      } else if (fence.shape === "polygon" && fence.polygon && fence.polygon.length >= 3) {
        const poly = new google.maps.Polygon({
          map,
          paths: fence.polygon.map((p) => ({ lat: p.latitude, lng: p.longitude })),
          fillColor: baseColor,
          fillOpacity: fence.active ? 0.16 : 0.05,
          strokeColor: baseColor,
          strokeOpacity: fence.active ? 0.85 : 0.3,
          strokeWeight: 2,
          clickable: false,
        });
        fenceOverlaysRef.current.push(poly);
      }
    }
  }, [geofences]);

  // Render draft geofence overlays while editing/creating
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!map || typeof google === "undefined" || !google.maps) return;

    draftOverlaysRef.current.forEach((o) => o.setMap(null));
    draftOverlaysRef.current = [];

    if (draftCircle) {
      const c = new google.maps.Circle({
        map,
        center: { lat: draftCircle.center.latitude, lng: draftCircle.center.longitude },
        radius: draftCircle.radiusMeters,
        fillColor: draftCircle.color || "#38bdf8",
        fillOpacity: 0.2,
        strokeColor: draftCircle.color || "#38bdf8",
        strokeOpacity: 0.95,
        strokeWeight: 2.5,
        clickable: false,
      });
      draftOverlaysRef.current.push(c);
    }

    if (draftPolygon.length >= 2) {
      if (draftPolygon.length >= 3) {
        const poly = new google.maps.Polygon({
          map,
          paths: draftPolygon.map((p) => ({ lat: p.latitude, lng: p.longitude })),
          fillColor: "#38bdf8",
          fillOpacity: 0.22,
          strokeColor: "#38bdf8",
          strokeOpacity: 0.95,
          strokeWeight: 2.5,
          clickable: false,
        });
        draftOverlaysRef.current.push(poly);
      } else {
        const line = new google.maps.Polyline({
          map,
          path: draftPolygon.map((p) => ({ lat: p.latitude, lng: p.longitude })),
          strokeColor: "#38bdf8",
          strokeOpacity: 0.95,
          strokeWeight: 2.5,
          clickable: false,
        });
        draftOverlaysRef.current.push(line);
      }
    }
  }, [draftCircle, draftPolygon]);

  // Animated radar pulse for Anchor armed or Geofence breach
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!map || typeof google === "undefined" || !google.maps) return;

    if (pulseMode === "none") {
      if (pulseCircleInstance.current) {
        pulseCircleInstance.current.setMap(null);
        pulseCircleInstance.current = null;
      }
      return;
    }

    const activeAnchor = geofences.find((f) => f.kind === "anchor" && f.active && f.center);
    const center =
      pulseMode === "anchor" && activeAnchor?.center
        ? { lat: activeAnchor.center.latitude, lng: activeAnchor.center.longitude }
        : isValidCoordinate(position.latitude, position.longitude)
          ? { lat: position.latitude, lng: position.longitude }
          : null;

    if (!center) return;

    const baseRadius =
      pulseMode === "anchor" && activeAnchor?.radius_meters ? activeAnchor.radius_meters : 60;
    const color = pulseMode === "breach" ? "#ef4444" : "#f59e0b";

    if (!pulseCircleInstance.current) {
      pulseCircleInstance.current = new google.maps.Circle({
        map,
        center,
        radius: baseRadius,
        fillColor: color,
        fillOpacity: 0.2,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: false,
      });
    } else {
      pulseCircleInstance.current.setCenter(center);
      pulseCircleInstance.current.setOptions({ fillColor: color, strokeColor: color });
    }

    let rafId = 0;
    const start = performance.now();
    const duration = pulseMode === "breach" ? 1300 : 2200;

    const tick = (now: number) => {
      const progress = ((now - start) % duration) / duration;
      const expandedRadius = baseRadius * (0.85 + progress * 0.7);
      const opacity = (1 - progress) * (pulseMode === "breach" ? 0.85 : 0.6);
      pulseCircleInstance.current?.setRadius(expandedRadius);
      pulseCircleInstance.current?.setOptions({
        strokeOpacity: opacity,
        fillOpacity: opacity * 0.28,
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [pulseMode, geofences, position.latitude, position.longitude]);

  if (!apiKey) {
    if (!interactive) {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-card">
          <div className="mini-map absolute inset-0 opacity-40" />
          {pulseMode !== "none" && (
            <div className="relative flex size-16 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${
                  pulseMode === "breach" ? "bg-red-500" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex size-4 rounded-full ${
                  pulseMode === "breach" ? "bg-red-500" : "bg-amber-400"
                }`}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-card p-6 text-center">
        <div className="mini-map absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-md rounded-lg border border-border bg-background/90 p-6 backdrop-blur">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="relative flex size-4">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  pulseMode === "breach" ? "bg-red-500" : pulseMode === "anchor" ? "bg-amber-400" : "bg-primary"
                }`}
              />
              <span
                className={`relative inline-flex size-4 rounded-full ${
                  pulseMode === "breach" ? "bg-red-500" : pulseMode === "anchor" ? "bg-amber-400" : "bg-primary"
                }`}
              />
            </span>
          </div>
          <h3 className="mt-4 text-base font-bold uppercase tracking-wider text-foreground">
            Google Maps API
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Insira <code className="text-primary">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> no seu arquivo <code className="text-primary">.env.local</code> para habilitar os mapas do Google em renderização vetorial 3D.
          </p>
          <div className="mt-4 rounded border border-border bg-secondary/50 p-3 text-left font-mono text-xs">
            <p className="text-muted-foreground">Posição Atual:</p>
            <p className="text-foreground font-semibold">
              Lat: {position.latitude.toFixed(6)} | Lng: {position.longitude.toFixed(6)}
            </p>
            <p className="mt-1 text-muted-foreground">
              Ângulo: {heading}° • Cercas ativas: {geofences.filter((g) => g.active).length}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className ?? "h-full w-full"} />;
}

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#141414" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#141414" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a6a6a6" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#ef251b" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#676767" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#262626" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1c1c1c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#383838" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#242424" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3f1ee" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f2f2f" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#090909" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4e4e4e" }],
  },
];
