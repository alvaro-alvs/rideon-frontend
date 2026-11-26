"use client";

import { useEffect, useState } from "react";

import { isValidCoordinate } from "@/lib/geo";
import {
  getCachedReverseAddress,
  reverseGeocode,
} from "@/lib/reverse-geocode";

interface ReverseGeocodeState {
  key: string | null;
  address: string | null;
  loading: boolean;
}

/**
 * React hook that resolves a (lat, lon) pair into a human-readable address
 * via the shared rate-limited reverse geocoding queue.
 */
export function useReverseGeocode(
  lat?: number | null,
  lon?: number | null,
  existingAddress?: string | null,
): { address: string | null; loading: boolean } {
  const normalizedExisting = existingAddress?.trim() || null;
  const hasValidCoords =
    typeof lat === "number" &&
    typeof lon === "number" &&
    isValidCoordinate(lat, lon);
  const coordKey = hasValidCoords ? `${lat.toFixed(4)},${lon.toFixed(4)}` : null;

  const [state, setState] = useState<ReverseGeocodeState>(() => ({
    key: coordKey,
    address:
      normalizedExisting ??
      (hasValidCoords ? getCachedReverseAddress(lat, lon) : null),
    loading: false,
  }));

  useEffect(() => {
    if (normalizedExisting || !hasValidCoords || !coordKey) {
      return;
    }

    const cached = getCachedReverseAddress(lat, lon);
    if (cached) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    void reverseGeocode(lat, lon, controller.signal).then((resolved) => {
      if (!active || controller.signal.aborted) return;
      setState({ key: coordKey, address: resolved, loading: false });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [coordKey, hasValidCoords, lat, lon, normalizedExisting]);

  if (normalizedExisting) {
    return { address: normalizedExisting, loading: false };
  }

  if (!hasValidCoords || !coordKey) {
    return { address: null, loading: false };
  }

  const cached = getCachedReverseAddress(lat, lon);
  if (cached) {
    return { address: cached, loading: false };
  }

  if (state.key === coordKey) {
    return { address: state.address, loading: state.loading };
  }

  return { address: null, loading: true };
}
