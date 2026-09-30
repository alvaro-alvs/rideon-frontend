"use client";

import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

interface GoogleMapViewProps {
  position: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  history?: Array<{ latitude: number; longitude: number }>;
}

export function GoogleMapView({
  position,
  heading = 0,
  history = [],
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const polylineInstance = useRef<google.maps.Polyline | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    setOptions({
      key: apiKey,
      v: "weekly",
    });

    importLibrary("maps")
      .then(() => {
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: position.latitude, lng: position.longitude },
          zoom: 16,
          styles: darkMapStyle,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const marker = new google.maps.Marker({
          position: { lat: position.latitude, lng: position.longitude },
          map,
          title: "Moto em tempo real",
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#ef251b",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            rotation: heading,
          },
        });

        const polyline = new google.maps.Polyline({
          map,
          path: history.map((p) => ({ lat: p.latitude, lng: p.longitude })),
          geodesic: true,
          strokeColor: "#ef251b",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        });

        googleMapInstance.current = map;
        markerInstance.current = marker;
        polylineInstance.current = polyline;
      })
      .catch((err: unknown) => {
        console.error("Erro ao carregar Google Maps API:", err);
      });
  }, [apiKey]);

  // Atualizar o marcador e pan no mapa quando a posição mudar
  useEffect(() => {
    if (!googleMapInstance.current || !markerInstance.current) return;

    const latLng = { lat: position.latitude, lng: position.longitude };
    markerInstance.current.setPosition(latLng);

    // Atualizar rotação
    const icon = markerInstance.current.getIcon() as google.maps.Symbol | null;
    if (icon && typeof icon === "object") {
      markerInstance.current.setIcon({
        ...icon,
        rotation: heading,
      });
    }

    googleMapInstance.current.panTo(latLng);

    if (polylineInstance.current && history.length > 0) {
      polylineInstance.current.setPath(
        history.map((p) => ({ lat: p.latitude, lng: p.longitude })),
      );
    }
  }, [position.latitude, position.longitude, heading, history]);

  if (!apiKey) {
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

  return <div ref={mapRef} className="h-full w-full" />;
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
