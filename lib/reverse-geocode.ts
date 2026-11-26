import { isValidCoordinate } from "@/lib/geo";

export interface ReverseGeocodeResult {
  formatted_address?: string;
  display_name?: string;
  road?: string;
  house_number?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  cached?: boolean;
}

const MIN_UNCACHED_INTERVAL_MS = 1150;
const MIN_CACHED_INTERVAL_MS = 50;
const RATE_LIMIT_COOLDOWN_MS = 15000;
const MAX_CACHE_ENTRIES = 1000;

const addressCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string | null>>();

interface QueueTask {
  key: string;
  lat: number;
  lon: number;
  signal?: AbortSignal;
  resolve: (value: string | null) => void;
}

const pendingQueue: QueueTask[] = [];
let isProcessingQueue = false;
let nextAllowedAt = 0;

function makeCoordKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function setCacheEntry(key: string, address: string): void {
  if (addressCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = addressCache.keys().next().value;
    if (oldestKey !== undefined) {
      addressCache.delete(oldestKey);
    }
  }
  addressCache.set(key, address);
}

export function getCachedReverseAddress(lat: number, lon: number): string | null {
  if (!isValidCoordinate(lat, lon)) return null;
  return addressCache.get(makeCoordKey(lat, lon)) ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchReverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<{ address: string | null; cached: boolean; rateLimited: boolean }> {
  const res = await fetch(
    `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    { signal },
  );

  if (res.status === 429 || res.status === 503) {
    return { address: null, cached: false, rateLimited: true };
  }

  if (!res.ok) {
    return { address: null, cached: false, rateLimited: false };
  }

  const data = (await res.json()) as ReverseGeocodeResult;
  const label = data.formatted_address?.trim() || data.display_name?.trim() || null;
  return {
    address: label,
    cached: Boolean(data.cached),
    rateLimited: false,
  };
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (pendingQueue.length > 0) {
      const task = pendingQueue.shift();
      if (!task) continue;

      if (task.signal?.aborted) {
        task.resolve(null);
        continue;
      }

      const cached = addressCache.get(task.key);
      if (cached) {
        task.resolve(cached);
        continue;
      }

      const now = Date.now();
      if (nextAllowedAt > now) {
        await sleep(nextAllowedAt - now);
      }

      if (task.signal?.aborted) {
        task.resolve(null);
        continue;
      }

      try {
        const result = await fetchReverseGeocode(task.lat, task.lon, task.signal);
        if (result.rateLimited) {
          nextAllowedAt = Date.now() + RATE_LIMIT_COOLDOWN_MS;
          task.resolve(null);
        } else {
          const interval = result.cached
            ? MIN_CACHED_INTERVAL_MS
            : MIN_UNCACHED_INTERVAL_MS;
          nextAllowedAt = Date.now() + interval;

          if (result.address) {
            setCacheEntry(task.key, result.address);
          }
          task.resolve(result.address);
        }
      } catch {
        nextAllowedAt = Date.now() + MIN_UNCACHED_INTERVAL_MS;
        task.resolve(null);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Resolves geographic coordinates to a human-readable address using the BFF
 * `/api/geocode/reverse` endpoint, with 4-decimal grid caching, in-flight
 * deduplication, and a client-side rate-limited queue so Nominatim's 1 req/s
 * limit is never overwhelmed by concurrent UI components.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!isValidCoordinate(lat, lon)) return null;
  if (signal?.aborted) return null;

  const key = makeCoordKey(lat, lon);
  const cached = addressCache.get(key);
  if (cached) return cached;

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = new Promise<string | null>((resolve) => {
    pendingQueue.push({ key, lat, lon, signal, resolve });
    void processQueue();
  }).finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}
