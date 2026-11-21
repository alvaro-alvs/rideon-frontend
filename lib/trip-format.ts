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

export function formatTripTimeRange(startedAt: string, endedAt: string): string {
  return `${formatTimeShort(startedAt)} - ${formatTimeShort(endedAt)}`;
}

export function formatPlaceLabel(address?: string, point?: TripPoint): string {
  const trimmed = address?.trim();
  if (trimmed) return trimmed;
  if (point && (Math.abs(point.latitude) >= 1e-6 || Math.abs(point.longitude) >= 1e-6)) {
    return `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
  }
  return "Local não identificado";
}

export function formatCoordinatePair(lat: number, lon: number, decimals = 6): string {
  return `${lat.toFixed(decimals)}, ${lon.toFixed(decimals)}`;
}
