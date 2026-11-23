import { calculateDistanceMeters, isValidCoordinate } from "@/lib/geo";

export interface TripPoint {
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  timestamp: string;
}

export interface TripItem {
  id: string;
  tenant_id?: string;
  motorcycle_id: string;
  rider_id?: string;
  device_id?: string;
  imei?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  status: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  distance_meters: number;
  max_speed: number;
  avg_speed: number;
  origin: TripPoint;
  destination: TripPoint;
  origin_address?: string;
  destination_address?: string;
  coordinates?: TripPoint[];
  point_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Formats a date concisely as "Hoje", "Ontem", or "d/M/yy" (e.g. "9/12/26").
 */
export function formatConciseDate(isoDate: string, now = new Date()): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "--";

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const targetDay = startOfDay(date).getTime();
  const today = startOfDay(now).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;

  if (targetDay === today) return "Hoje";
  if (targetDay === yesterday) return "Ontem";

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const yearShort = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${yearShort}`;
}

export function formatTimeShort(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeWithSeconds(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTripTimeRange(startedAt: string, endedAt: string): string {
  return `${formatTimeShort(startedAt)} - ${formatTimeShort(endedAt)}`;
}

export function formatPlaceLabel(
  address?: string,
  fallback = "Local não identificado",
): string {
  const trimmed = address?.trim();
  if (trimmed) return trimmed;
  return fallback;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "0 m";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "< 1 min";
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded} s`;
  const mins = Math.floor(rounded / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}min` : `${hours}h`;
}

export function formatSpeedLabel(speed?: number | null): string {
  const rounded = Math.round(speed ?? 0);
  return rounded > 0 ? `${rounded} km/h` : "Parado";
}

export function computeCumulativeDistances(points: TripPoint[]): number[] {
  const distances: number[] = [];
  let total = 0;
  let prevValid: TripPoint | null = null;

  for (const pt of points) {
    const valid = isValidCoordinate(pt.latitude, pt.longitude);
    if (valid && prevValid) {
      total += calculateDistanceMeters(
        prevValid.latitude,
        prevValid.longitude,
        pt.latitude,
        pt.longitude,
      );
    }
    if (valid) {
      prevValid = pt;
    }
    distances.push(total);
  }

  return distances;
}

export function formatCoordinatePair(lat: number, lon: number, decimals = 6): string {
  return `${lat.toFixed(decimals)}, ${lon.toFixed(decimals)}`;
}
