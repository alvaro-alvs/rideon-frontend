"use client";

import { memo, useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { calculateDistanceMeters, isValidCoordinate } from "@/lib/geo";
import type { GeofenceItem, LatLngPoint } from "@/lib/types/protection";

export interface GoogleMapViewProps {
  position: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  originPosition?: {
    latitude: number;
    longitude: number;
  } | null;
  originTitle?: string;
  history?: ReadonlyArray<{ latitude: number; longitude: number }>;
  geofences?: ReadonlyArray<GeofenceItem>;
  draftCircle?: { center: LatLngPoint; radiusMeters: number; color?: string } | null;
  draftPolygon?: ReadonlyArray<LatLngPoint>;
  pulseMode?: "none" | "anchor" | "breach";
  zoom?: number;
  interactive?: boolean;
  markerType?: "arrow" | "pin" | "modern-pin";
  markerTitle?: string;
  /** Permite ocultar o marcador mantendo a instância do mapa montada (ex.: veículo sem GPS). */
  pinVisible?: boolean;
  /** Identificador do alvo monitorado (ex.: selectedVehicleId) para animar voo de câmera sem recarregar o mapa. */
  transitionKey?: string | number;
  /** Contador incremental para disparar animação momentânea do Pin + varredura de radar. */
  radarScanTrigger?: number;
  showCircle?: boolean;
  className?: string;
  onMapClick?: (coords: LatLngPoint) => void;
}

const EMPTY_HISTORY: ReadonlyArray<{ latitude: number; longitude: number }> = [];
const EMPTY_GEOFENCES: ReadonlyArray<GeofenceItem> = [];
const EMPTY_POLYGON: ReadonlyArray<LatLngPoint> = [];

const PIN_SVG_PATH =
  "M 12 2 C 7.58 2 4 5.58 4 10 c 0 5.25 8 13 8 13 s 8 -7.75 8 -13 c 0 -4.42 -3.58 -8 -8 -8 z M 12 13 c -1.66 0 -3 -1.34 -3 -3 s 1.34 -3 3 -3 s 3 1.34 3 3 s -1.34 3 -3 3 z";

// Singleton loader para evitar múltiplas chamadas a setOptions / recarregamento do script
let mapsPromise: Promise<unknown> | null = null;
let configuredApiKey: string | null = null;

function ensureGoogleMapsLoaded(apiKey: string): Promise<unknown> {
  if (!mapsPromise || configuredApiKey !== apiKey) {
    configuredApiKey = apiKey;
    setOptions({
      key: apiKey,
      v: "weekly",
    });
    mapsPromise = importLibrary("maps");
  }
  return mapsPromise;
}

let modernPinGradSeq = 0;

interface ModernPinOverlayHandle {
  setMap: (map: google.maps.Map | null) => void;
  update: (pos: google.maps.LatLngLiteral, visible: boolean, title?: string) => void;
  triggerBurst: () => void;
}

function createModernPinOverlay(
  initialPos: google.maps.LatLngLiteral,
  initialVisible: boolean,
  initialTitle?: string,
): ModernPinOverlayHandle {
  const gradId = `rideon-pin-grad-${++modernPinGradSeq}`;

  class RideOnModernPinOverlay extends google.maps.OverlayView {
    private pos: google.maps.LatLngLiteral = initialPos;
    private visible: boolean = initialVisible;
    private titleText: string = initialTitle ?? "Veículo monitorado";
    private rootEl: HTMLDivElement | null = null;
    private burstVariant = false;
    private pendingBurst = false;

    onAdd() {
      const root = document.createElement("div");
      root.className = "rideon-pin-stage";
      root.setAttribute("aria-label", this.titleText);

      // Pin 2D clean sem borda branca: 100% vermelho em degradê suave com vazado central
      root.innerHTML = `
        <div class="rideon-radar-2d">
          <div class="rideon-radar-sweep"></div>
          <div class="rideon-radar-ring rideon-radar-ring-1"></div>
          <div class="rideon-radar-ring rideon-radar-ring-2"></div>
        </div>
        <div class="rideon-pin-shadow"></div>
        <div class="rideon-pin-wrap">
          <svg class="rideon-pin-svg" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="${gradId}" x1="17" y1="2" x2="17" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ff4d42"/>
                <stop offset="48%" stop-color="#ef251b"/>
                <stop offset="100%" stop-color="#990d07"/>
              </linearGradient>
            </defs>
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M17 2C9.268 2 3 8.268 3 16C3 25.8 15.1 38.2 16.32 39.42C16.7 39.8 17.3 39.8 17.68 39.42C18.9 38.2 31 25.8 31 16C31 8.268 24.732 2 17 2ZM17 20.75C14.377 20.75 12.25 18.623 12.25 16C12.25 13.377 14.377 11.25 17 11.25C19.623 11.25 21.75 13.377 21.75 16C21.75 18.623 19.623 20.75 17 20.75Z"
              fill="url(#${gradId})"
            />
          </svg>
        </div>
      `;

      this.rootEl = root;
      const panes = this.getPanes();
      panes?.floatPane.appendChild(root);

      if (this.pendingBurst && this.visible) {
        this.pendingBurst = false;
        this.playBurstClass();
      }
    }

    draw() {
      if (!this.rootEl) return;
      if (!this.visible) {
        this.rootEl.style.display = "none";
        return;
      }
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(this.pos.lat, this.pos.lng),
      );
      if (!point) return;

      this.rootEl.style.display = "block";
      this.rootEl.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`;
    }

    onRemove() {
      if (this.rootEl && this.rootEl.parentNode) {
        this.rootEl.parentNode.removeChild(this.rootEl);
      }
      this.rootEl = null;
    }

    update(pos: google.maps.LatLngLiteral, visible: boolean, title?: string) {
      this.pos = pos;
      this.visible = visible;
      if (title && title !== this.titleText) {
        this.titleText = title;
        this.rootEl?.setAttribute("aria-label", title);
      }
      this.draw();
    }

    private playBurstClass() {
      if (!this.rootEl) return;
      this.burstVariant = !this.burstVariant;
      if (this.burstVariant) {
        this.rootEl.classList.remove("burst-b");
        this.rootEl.classList.add("burst-a");
      } else {
        this.rootEl.classList.remove("burst-a");
        this.rootEl.classList.add("burst-b");
      }
    }

    triggerBurst() {
      if (!this.rootEl) {
        this.pendingBurst = true;
        return;
      }
      if (!this.visible) return;
      this.playBurstClass();
    }
  }

  return new RideOnModernPinOverlay();
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function GoogleMapViewInner({
  position,
  heading = 0,
  originPosition = null,
  originTitle = "Ponto de partida",
  history = EMPTY_HISTORY,
  geofences = EMPTY_GEOFENCES,
  draftCircle = null,
  draftPolygon = EMPTY_POLYGON,
  pulseMode = "none",
  zoom,
  interactive = true,
  markerType = "arrow",
  markerTitle,
  pinVisible = true,
  transitionKey,
  radarScanTrigger,
  showCircle = false,
  className,
  onMapClick,
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [fallbackBurstToggle, setFallbackBurstToggle] = useState<"burst-a" | "burst-b">("burst-a");

  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const modernPinOverlayRef = useRef<ModernPinOverlayHandle | null>(null);
  const originMarkerInstance = useRef<google.maps.Marker | null>(null);
  const circleInstance = useRef<google.maps.Circle | null>(null);
  const pulseCircleInstance = useRef<google.maps.Circle | null>(null);
  const polylineInstance = useRef<google.maps.Polyline | null>(null);
  const fenceOverlaysRef = useRef<Array<google.maps.Circle | google.maps.Polygon>>([]);
  const draftOverlaysRef = useRef<Array<google.maps.Circle | google.maps.Polygon | google.maps.Polyline>>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const cameraRafRef = useRef<number>(0);
  const arrivalBurstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedCameraRef = useRef(false);
  const pendingSwitchAnimRef = useRef(false);
  const prevTransitionKeyRef = useRef<string | number | undefined>(transitionKey);
  const prevRadarTriggerRef = useRef<number | undefined>(radarScanTrigger);

  const onMapClickRef = useRef(onMapClick);
  const initialPropsRef = useRef({ position, zoom, interactive });

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    initialPropsRef.current = { position, zoom, interactive };
  }, [onMapClick, position, zoom, interactive]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const getOriginPinIcon = (): google.maps.Symbol => ({
    path: PIN_SVG_PATH,
    scale: 1.65,
    anchor: new google.maps.Point(12, 23),
    fillColor: "#10b981",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  });

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

  // Inicializa o Google Map UMA ÚNICA VEZ por montagem — nunca recarrega ao trocar de veículo ou props
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let isMounted = true;

    ensureGoogleMapsLoaded(apiKey)
      .then(() => {
        if (!mapRef.current || !isMounted) return;

        const { position: initPos, zoom: initZoom, interactive: initInteractive } =
          initialPropsRef.current;
        const hasValidInitial = isValidCoordinate(initPos.latitude, initPos.longitude);
        const center = hasValidInitial
          ? { lat: initPos.latitude, lng: initPos.longitude }
          : { lat: -23.5505, lng: -46.6333 };

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: initZoom ?? (hasValidInitial ? 16 : 11),
          backgroundColor: "#0f0f12",
          styles: darkMapStyle,
          disableDefaultUI: !initInteractive,
          gestureHandling: initInteractive ? "auto" : "none",
          keyboardShortcuts: initInteractive,
          zoomControl: initInteractive,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });

        const polyline = new google.maps.Polyline({
          map,
          path: [],
          geodesic: true,
          strokeColor: "#ef251b",
          strokeOpacity: 0.8,
          strokeWeight: 4,
          clickable: false,
        });

        googleMapInstance.current = map;
        polylineInstance.current = polyline;
        hasInitializedCameraRef.current = hasValidInitial;
        setMapReady(true);
      })
      .catch((err: unknown) => {
        console.error("Erro ao carregar Google Maps API:", err);
      });

    return () => {
      isMounted = false;
      setMapReady(false);
      if (cameraRafRef.current) {
        cancelAnimationFrame(cameraRafRef.current);
        cameraRafRef.current = 0;
      }
      if (arrivalBurstTimeoutRef.current) {
        clearTimeout(arrivalBurstTimeoutRef.current);
        arrivalBurstTimeoutRef.current = null;
      }
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
      if (modernPinOverlayRef.current) {
        modernPinOverlayRef.current.setMap(null);
        modernPinOverlayRef.current = null;
      }
      if (markerInstance.current) {
        markerInstance.current.setMap(null);
        markerInstance.current = null;
      }
      if (originMarkerInstance.current) {
        originMarkerInstance.current.setMap(null);
        originMarkerInstance.current = null;
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
  }, [apiKey]);

  // Atualiza interatividade e listener de clique in-place sem recriar o mapa
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapReady || !map) return;

    map.setOptions({
      disableDefaultUI: !interactive,
      gestureHandling: interactive ? "auto" : "none",
      keyboardShortcuts: interactive,
      zoomControl: interactive,
    });

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }

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
  }, [mapReady, interactive]);

  // Sincroniza Pin (3D ou 2D), círculo base e animação cinematográfica de câmera + radar momentâneo
  useEffect(() => {
    // Modo fallback sem chave do Google Maps: ainda alterna animação 3D + radar ao trocar de veículo
    if (!apiKey) {
      const isSwitch =
        transitionKey !== undefined && transitionKey !== prevTransitionKeyRef.current;
      const isScan =
        radarScanTrigger !== undefined && radarScanTrigger !== prevRadarTriggerRef.current;
      prevTransitionKeyRef.current = transitionKey;
      prevRadarTriggerRef.current = radarScanTrigger;
      if (isSwitch || isScan) {
        setFallbackBurstToggle((prev) => (prev === "burst-a" ? "burst-b" : "burst-a"));
      }
      return;
    }

    const map = googleMapInstance.current;
    if (!mapReady || !map || typeof google === "undefined" || !google.maps) return;

    const isVehicleSwitch =
      transitionKey !== undefined && transitionKey !== prevTransitionKeyRef.current;
    const isManualRadarScan =
      radarScanTrigger !== undefined && radarScanTrigger !== prevRadarTriggerRef.current;

    prevTransitionKeyRef.current = transitionKey;
    prevRadarTriggerRef.current = radarScanTrigger;

    if (isVehicleSwitch || isManualRadarScan) {
      pendingSwitchAnimRef.current = true;
    }

    const hasValidPos =
      pinVisible && isValidCoordinate(position.latitude, position.longitude);

    if (!hasValidPos) {
      modernPinOverlayRef.current?.update({ lat: 0, lng: 0 }, false);
      markerInstance.current?.setVisible(false);
      if (circleInstance.current) {
        circleInstance.current.setMap(null);
        circleInstance.current = null;
      }
      return;
    }

    const shouldAnimateSwitch = pendingSwitchAnimRef.current;
    pendingSwitchAnimRef.current = false;

    const targetLatLng = { lat: position.latitude, lng: position.longitude };
    const targetZoom = zoom ?? 16;
    const resolvedTitle =
      markerTitle ??
      (markerType === "arrow" ? "Veículo em tempo real" : "Posição do veículo");

    // Renderização do marcador: Pin 2D clean moderno (GPU OverlayView) vs Marker 2D clássico
    if (markerType === "modern-pin") {
      if (markerInstance.current) {
        markerInstance.current.setMap(null);
        markerInstance.current = null;
      }
      if (!modernPinOverlayRef.current) {
        const overlay = createModernPinOverlay(targetLatLng, true, resolvedTitle);
        overlay.setMap(map);
        overlay.triggerBurst();
        modernPinOverlayRef.current = overlay;
      } else {
        modernPinOverlayRef.current.update(targetLatLng, true, resolvedTitle);
      }
    } else {
      if (modernPinOverlayRef.current) {
        modernPinOverlayRef.current.setMap(null);
        modernPinOverlayRef.current = null;
      }
      if (!markerInstance.current) {
        markerInstance.current = new google.maps.Marker({
          position: targetLatLng,
          map,
          title: resolvedTitle,
          icon: getMarkerIcon(markerType, heading),
          zIndex: 2,
        });
      } else {
        markerInstance.current.setVisible(true);
        markerInstance.current.setPosition(targetLatLng);
        markerInstance.current.setIcon(getMarkerIcon(markerType, heading));
        if (markerTitle !== undefined) {
          markerInstance.current.setTitle(markerTitle);
        }
      }
    }

    // Círculo estático de precisão ao redor do ponto
    if (showCircle) {
      if (!circleInstance.current) {
        circleInstance.current = new google.maps.Circle({
          map,
          center: targetLatLng,
          radius: 40,
          fillColor: "#ef251b",
          fillOpacity: 0.18,
          strokeColor: "#ef251b",
          strokeOpacity: 0.65,
          strokeWeight: 1.5,
          clickable: false,
        });
      } else {
        circleInstance.current.setCenter(targetLatLng);
      }
    } else if (circleInstance.current) {
      circleInstance.current.setMap(null);
      circleInstance.current = null;
    }

    // Primeiro posicionamento válido caso o mapa tenha iniciado em coordenada neutra
    if (!hasInitializedCameraRef.current) {
      hasInitializedCameraRef.current = true;
      map.setCenter(targetLatLng);
      map.setZoom(targetZoom);
      modernPinOverlayRef.current?.triggerBurst();
      return;
    }

    // Troca de veículo ou acionamento explícito do radar: voo suave até a região + Pin 2D + Radar momentâneo
    if (shouldAnimateSwitch) {
      if (cameraRafRef.current) {
        cancelAnimationFrame(cameraRafRef.current);
        cameraRafRef.current = 0;
      }
      if (arrivalBurstTimeoutRef.current) {
        clearTimeout(arrivalBurstTimeoutRef.current);
        arrivalBurstTimeoutRef.current = null;
      }

      const currentCenter = map.getCenter();
      const startLat = currentCenter ? currentCenter.lat() : targetLatLng.lat;
      const startLng = currentCenter ? currentCenter.lng() : targetLatLng.lng;
      const distMeters = calculateDistanceMeters(
        startLat,
        startLng,
        targetLatLng.lat,
        targetLatLng.lng,
      );

      // Mesma posição ou muito próximo: centraliza e aguarda a câmera estabilizar antes do radar
      if (distMeters < 35) {
        if (map.getZoom() !== targetZoom) {
          map.setZoom(targetZoom);
        }
        map.panTo(targetLatLng);
        const shortSettleMs = distMeters < 3 ? 90 : 260;
        arrivalBurstTimeoutRef.current = setTimeout(() => {
          arrivalBurstTimeoutRef.current = null;
          modernPinOverlayRef.current?.triggerBurst();
        }, shortSettleMs);
        return;
      }

      const isLongFlight = distMeters > 8_000;
      const durationMs = isLongFlight
        ? 1020
        : Math.min(900, Math.max(520, 360 + Math.log10(distMeters) * 145));

      if (isLongFlight) {
        const flightZoom =
          distMeters > 250_000
            ? Math.max(targetZoom - 5, 9)
            : distMeters > 50_000
              ? Math.max(targetZoom - 4, 11)
              : Math.max(targetZoom - 2, 13);
        if ((map.getZoom() ?? targetZoom) > flightZoom) {
          map.setZoom(flightZoom);
        }
      }

      let restoredTargetZoom = !isLongFlight;
      const startTime = performance.now();

      const stepCamera = (now: number) => {
        const rawProgress = Math.min(1, (now - startTime) / durationMs);
        const eased = easeInOutCubic(rawProgress);

        const nextLat = startLat + (targetLatLng.lat - startLat) * eased;
        const nextLng = startLng + (targetLatLng.lng - startLng) * eased;
        map.setCenter({ lat: nextLat, lng: nextLng });

        if (!restoredTargetZoom && rawProgress >= 0.84) {
          restoredTargetZoom = true;
          map.setZoom(targetZoom);
        }

        if (rawProgress < 1) {
          cameraRafRef.current = requestAnimationFrame(stepCamera);
        } else {
          cameraRafRef.current = 0;
          map.setCenter(targetLatLng);
          if (map.getZoom() !== targetZoom) {
            map.setZoom(targetZoom);
          }
          // Dispara o Pin + Radar somente após a câmera parar totalmente no destino
          arrivalBurstTimeoutRef.current = setTimeout(() => {
            arrivalBurstTimeoutRef.current = null;
            modernPinOverlayRef.current?.triggerBurst();
          }, 180);
        }
      };

      cameraRafRef.current = requestAnimationFrame(stepCamera);
      return;
    }

    // Atualização contínua do mesmo veículo: segue suavemente apenas se não houver voo em curso
    if (!cameraRafRef.current) {
      map.panTo(targetLatLng);
    }
  }, [
    apiKey,
    mapReady,
    position.latitude,
    position.longitude,
    heading,
    markerType,
    markerTitle,
    pinVisible,
    transitionKey,
    radarScanTrigger,
    showCircle,
    zoom,
  ]);

  // Atualiza trilha de histórico de forma isolada
  useEffect(() => {
    const polyline = polylineInstance.current;
    if (!mapReady || !polyline) return;

    if (history.length === 0) {
      polyline.setPath([]);
      return;
    }

    polyline.setPath(
      history
        .filter((p) => isValidCoordinate(p.latitude, p.longitude))
        .map((p) => ({ lat: p.latitude, lng: p.longitude })),
    );
  }, [mapReady, history]);

  // Atualiza pino de origem (histórico de rotas)
  const hasOriginProp = originPosition !== null;
  const originLat = originPosition?.latitude;
  const originLng = originPosition?.longitude;

  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapReady || !map || typeof google === "undefined" || !google.maps) return;

    const hasValidOrigin =
      hasOriginProp &&
      originLat !== undefined &&
      originLng !== undefined &&
      isValidCoordinate(originLat, originLng);

    if (!hasValidOrigin) {
      if (originMarkerInstance.current) {
        originMarkerInstance.current.setMap(null);
        originMarkerInstance.current = null;
      }
      return;
    }

    const originLatLng = {
      lat: originLat,
      lng: originLng,
    };

    if (!originMarkerInstance.current) {
      originMarkerInstance.current = new google.maps.Marker({
        position: originLatLng,
        map,
        title: originTitle,
        icon: getOriginPinIcon(),
        zIndex: 1,
      });
    } else {
      originMarkerInstance.current.setPosition(originLatLng);
      originMarkerInstance.current.setTitle(originTitle);
    }
  }, [mapReady, hasOriginProp, originLat, originLng, originTitle]);

  // Renderiza cercas virtuais ativas e inativas
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapReady || !map || typeof google === "undefined" || !google.maps) return;

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
  }, [mapReady, geofences]);

  // Renderiza rascunhos de cerca em edição/criação
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapReady || !map || typeof google === "undefined" || !google.maps) return;

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
  }, [mapReady, draftCircle, draftPolygon]);

  // Pulso contínuo para Âncora armada ou violação de cerca (otimizado com frame throttling e pausa em background)
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapReady || !map || typeof google === "undefined" || !google.maps) return;

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
    let lastDraw = 0;
    const start = performance.now();
    const duration = pulseMode === "breach" ? 1300 : 2200;

    const tick = (now: number) => {
      if (
        (typeof document === "undefined" || document.visibilityState === "visible") &&
        now - lastDraw >= 40
      ) {
        lastDraw = now;
        const progress = ((now - start) % duration) / duration;
        const expandedRadius = baseRadius * (0.85 + progress * 0.7);
        const opacity = (1 - progress) * (pulseMode === "breach" ? 0.85 : 0.6);
        pulseCircleInstance.current?.setRadius(expandedRadius);
        pulseCircleInstance.current?.setOptions({
          strokeOpacity: opacity,
          fillOpacity: opacity * 0.28,
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, pulseMode, geofences, position.latitude, position.longitude]);

  if (!apiKey) {
    if (!interactive) {
      const showFallbackPin =
        pinVisible && isValidCoordinate(position.latitude, position.longitude);
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-card overflow-hidden">
          <div className="mini-map absolute inset-0 opacity-45" />
          {showFallbackPin && (
            <div className={`rideon-pin-stage ${fallbackBurstToggle}`} style={{ position: "relative" }}>
              <div className="rideon-radar-2d">
                <div className="rideon-radar-sweep" />
                <div className="rideon-radar-ring rideon-radar-ring-1" />
                <div className="rideon-radar-ring rideon-radar-ring-2" />
              </div>
              <div className="rideon-pin-shadow" />
              <div className="rideon-pin-wrap">
                <svg className="rideon-pin-svg" viewBox="0 0 34 42" fill="none">
                  <defs>
                    <linearGradient id="rideon-fallback-pin-grad" x1="17" y1="2" x2="17" y2="40" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ff4d42" />
                      <stop offset="48%" stopColor="#ef251b" />
                      <stop offset="100%" stopColor="#990d07" />
                    </linearGradient>
                  </defs>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M17 2C9.268 2 3 8.268 3 16C3 25.8 15.1 38.2 16.32 39.42C16.7 39.8 17.3 39.8 17.68 39.42C18.9 38.2 31 25.8 31 16C31 8.268 24.732 2 17 2ZM17 20.75C14.377 20.75 12.25 18.623 12.25 16C12.25 13.377 14.377 11.25 17 11.25C19.623 11.25 21.75 13.377 21.75 16C21.75 18.623 19.623 20.75 17 20.75Z"
                    fill="url(#rideon-fallback-pin-grad)"
                  />
                </svg>
              </div>
            </div>
          )}
          {pulseMode !== "none" && (
            <div className="pointer-events-none absolute flex size-16 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${
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

export const GoogleMapView = memo(GoogleMapViewInner);

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
