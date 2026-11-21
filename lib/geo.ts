/**
 * Verifica se um par de coordenadas (latitude, longitude) é válido.
 * Descarta valores ausentes, infinitos, fora da escala geográfica (-90 a 90, -180 a 180)
 * e as coordenadas (0, 0) ("Null Island" no meio do oceano Atlântico), que indicam
 * rastreador sem sinal de satélite ou sem comunicação inicial de GPS.
 */
export function isValidCoordinate(
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  if (
    latitude === undefined ||
    latitude === null ||
    longitude === undefined ||
    longitude === null
  ) {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  // Coordenadas (0, 0) indicam ausência de sinal GPS / ponto nulo no oceano
  if (Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001) {
    return false;
  }
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeofenceLiveMetrics {
  areaSqMeters: number;
  perimeterMeters: number;
  inside: boolean | null;
  distanceToCenterMeters: number | null;
  distanceToBorderMeters: number | null;
}

const METERS_PER_DEG_LAT = 110574;
const METERS_PER_DEG_LNG_EQ = 111319.9;

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toLocalMeters(
  p: GeoPoint,
  originLat: number,
  originLng: number,
): { x: number; y: number } {
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  return {
    x: (p.longitude - originLng) * METERS_PER_DEG_LNG_EQ * cosLat,
    y: (p.latitude - originLat) * METERS_PER_DEG_LAT,
  };
}

function pointToSegmentDistanceMeters(
  point: GeoPoint,
  a: GeoPoint,
  b: GeoPoint,
): number {
  const pXY = toLocalMeters(point, point.latitude, point.longitude);
  const aXY = toLocalMeters(a, point.latitude, point.longitude);
  const bXY = toLocalMeters(b, point.latitude, point.longitude);
  const dx = bXY.x - aXY.x;
  const dy = bXY.y - aXY.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.000001) {
    return Math.hypot(pXY.x - aXY.x, pXY.y - aXY.y);
  }
  const t = Math.max(0, Math.min(1, ((pXY.x - aXY.x) * dx + (pXY.y - aXY.y) * dy) / lenSq));
  const projX = aXY.x + t * dx;
  const projY = aXY.y + t * dy;
  return Math.hypot(pXY.x - projX, pXY.y - projY);
}

export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function evaluateGeofenceLiveMetrics(
  vehiclePoint: GeoPoint | null,
  shape: "circle" | "polygon",
  opts: {
    center?: GeoPoint | null;
    radiusMeters?: number;
    polygon?: GeoPoint[];
  },
): GeofenceLiveMetrics {
  if (shape === "circle") {
    const r = Math.max(0, opts.radiusMeters ?? 0);
    const areaSqMeters = Math.PI * r * r;
    const perimeterMeters = 2 * Math.PI * r;
    if (
      vehiclePoint &&
      opts.center &&
      isValidCoordinate(vehiclePoint.latitude, vehiclePoint.longitude) &&
      isValidCoordinate(opts.center.latitude, opts.center.longitude)
    ) {
      const dist = calculateDistanceMeters(
        vehiclePoint.latitude,
        vehiclePoint.longitude,
        opts.center.latitude,
        opts.center.longitude,
      );
      return {
        areaSqMeters,
        perimeterMeters,
        inside: dist <= r,
        distanceToCenterMeters: dist,
        distanceToBorderMeters: Math.abs(dist - r),
      };
    }
    return {
      areaSqMeters,
      perimeterMeters,
      inside: null,
      distanceToCenterMeters: null,
      distanceToBorderMeters: null,
    };
  }

  const pts = (opts.polygon ?? []).filter((p) => isValidCoordinate(p.latitude, p.longitude));
  if (pts.length < 2) {
    return {
      areaSqMeters: 0,
      perimeterMeters: 0,
      inside: null,
      distanceToCenterMeters: null,
      distanceToBorderMeters: null,
    };
  }

  let perimeterMeters = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    perimeterMeters += calculateDistanceMeters(
      pts[i].latitude,
      pts[i].longitude,
      pts[i + 1].latitude,
      pts[i + 1].longitude,
    );
  }

  let areaSqMeters = 0;
  if (pts.length >= 3) {
    perimeterMeters += calculateDistanceMeters(
      pts[pts.length - 1].latitude,
      pts[pts.length - 1].longitude,
      pts[0].latitude,
      pts[0].longitude,
    );

    const originLat = pts.reduce((acc, p) => acc + p.latitude, 0) / pts.length;
    const originLng = pts.reduce((acc, p) => acc + p.longitude, 0) / pts.length;
    const projected = pts.map((p) => toLocalMeters(p, originLat, originLng));
    let shoelace = 0;
    for (let i = 0; i < projected.length; i++) {
      const next = projected[(i + 1) % projected.length];
      shoelace += projected[i].x * next.y - next.x * projected[i].y;
    }
    areaSqMeters = Math.abs(shoelace) / 2;
  }

  if (
    pts.length >= 3 &&
    vehiclePoint &&
    isValidCoordinate(vehiclePoint.latitude, vehiclePoint.longitude)
  ) {
    const centroidLat = pts.reduce((acc, p) => acc + p.latitude, 0) / pts.length;
    const centroidLng = pts.reduce((acc, p) => acc + p.longitude, 0) / pts.length;
    const distanceToCenterMeters = calculateDistanceMeters(
      vehiclePoint.latitude,
      vehiclePoint.longitude,
      centroidLat,
      centroidLng,
    );
    let minBorderDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = pointToSegmentDistanceMeters(vehiclePoint, pts[i], pts[(i + 1) % pts.length]);
      if (d < minBorderDist) minBorderDist = d;
    }
    return {
      areaSqMeters,
      perimeterMeters,
      inside: isPointInPolygon(vehiclePoint, pts),
      distanceToCenterMeters,
      distanceToBorderMeters: Number.isFinite(minBorderDist) ? minBorderDist : null,
    };
  }

  return {
    areaSqMeters,
    perimeterMeters,
    inside: null,
    distanceToCenterMeters: null,
    distanceToBorderMeters: null,
  };
}

export function formatArea(areaSqMeters: number): string {
  if (!Number.isFinite(areaSqMeters) || areaSqMeters <= 0) return "0 m²";
  if (areaSqMeters >= 1_000_000) {
    return `${(areaSqMeters / 1_000_000).toFixed(2)} km²`;
  }
  if (areaSqMeters >= 10_000) {
    return `${(areaSqMeters / 10_000).toFixed(2)} ha`;
  }
  return `${Math.round(areaSqMeters).toLocaleString("pt-BR")} m²`;
}

export function formatDistanceMeters(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "--";
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

