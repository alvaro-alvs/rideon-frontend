"use client";

import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { isValidCoordinate } from "@/lib/geo";

export interface GoogleMapViewProps {
  position: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  history?: Array<{ latitude: number; longitude: number }>;
  zoom?: number;
  interactive?: boolean;
  markerType?: "arrow" | "pin";
  showCircle?: boolean;
  className?: string;
}

const PIN_SVG_PATH =
  "M 12 2 C 7.58 2 4 5.58 4 10 c 0 5.25 8 13 8 13 s 8 -7.75 8 -13 c 0 -4.42 -3.58 -8 -8 -8 z M 12 13 c -1.66 0 -3 -1.34 -3 -3 s 1.34 -3 3 -3 s 3 1.34 3 3 s -1.34 3 -3 3 z";

export function GoogleMapView({
  position,
  heading = 0,
  history = [],
  zoom,
  interactive = true,
  markerType = "arrow",
  showCircle = false,
  className,
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const circleInstance = useRef<google.maps.Circle | null>(null);
  const polylineInstance = useRef<google.maps.Polyline | null>(null);

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
          : { lat: -23.5505, lng: -46.6333 }; // Default neutro (São Paulo)

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
              title: markerType === "pin" ? "Última posição do veículo" : "Moto em tempo real",
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

  // Atualizar o marcador, círculo e pan no mapa quando a posição mudar
  useEffect(() => {
    if (!googleMapInstance.current) return;

    const hasValidPos = isValidCoordinate(position.latitude, position.longitude);
    if (!hasValidPos) return;

    const latLng = { lat: position.latitude, lng: position.longitude };

    if (!markerInstance.current) {
      markerInstance.current = new google.maps.Marker({
        position: latLng,
        map: googleMapInstance.current,
        title: markerType === "pin" ? "Última posição do veículo" : "Moto em tempo real",
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

  if (!apiKey) {
    if (!interactive) {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-card">
          <div className="mini-map absolute inset-0 opacity-40" />
        </div>
      );
    }
    // Renderização visual de fallback responsiva caso a chave não esteja configurada
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-card p-6 text-center">
        <div className="mini-map absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-md rounded-lg border border-border bg-background/90 p-6 backdrop-blur">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="relative flex size-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex size-4 rounded-full bg-primary"></span>
            </span>
          </div>
          <h3 className="mt-4 text-base font-bold uppercase tracking-wider text-foreground">
            Google Maps API
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Insira <code className="text-primary">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> no seu arquivo <code className="text-primary">.env.local</code> para habilitar os mapas do Google em renderização vetorial 3D.
          </p>
          <div className="mt-4 rounded border border-border bg-secondary/50 p-3 text-left font-mono text-xs">
            <p className="text-muted-foreground">Posicao Atual:</p>
            <p className="text-foreground font-semibold">
              Lat: {position.latitude.toFixed(6)} | Lng: {position.longitude.toFixed(6)}
            </p>
            <p className="mt-1 text-muted-foreground">Angulo (Heading): {heading}°</p>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className ?? "h-full w-full"} />;
}

// Estilo Dark personalizado para o Google Maps
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
