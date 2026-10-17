"use client";

import { useEffect, useState } from "react";

export type Motorcycle = {
  id?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  status?: string;
  device?: {
    id?: string;
    serial_number?: string;
    protocol?: string;
    firmware_version?: string;
    status?: string;
    last_communication?: string;
    last_seen_at?: string | null;
  } | null;
  has_position?: boolean;
  last_position?: {
    latitude: number;
    longitude: number;
    speed?: number;
    timestamp: string;
  } | null;
};

export type UseMotorcycleResult = {
  motorcycle: Motorcycle | null;
  motorcycles: Motorcycle[];
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useMotorcycle(): UseMotorcycleResult {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMotorcycles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/vehicles", { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== "undefined") {
            window.location.replace("/login?expired=1&from=" + encodeURIComponent("/dashboard"));
          }
          return;
        }
        throw new Error("Falha ao carregar veículos.");
      }

      const data = (await response.json()) as {
        motorcycles?: Motorcycle[];
      };

      const list = Array.isArray(data.motorcycles) ? data.motorcycles : [];
      setMotorcycles(list);

      // Auto-select first vehicle if none selected or current selection is invalid
      if (list.length > 0) {
        setSelectedVehicleId((prev) => {
          if (prev && list.some((m) => m.id === prev)) {
            return prev;
          }
          return list[0].id ?? null;
        });
      } else {
        setSelectedVehicleId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setMotorcycles([]);
      setSelectedVehicleId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchMotorcycles();
  }, []);

  const activeMotorcycle =
    motorcycles.find((m) => m.id === selectedVehicleId) ||
    (motorcycles.length > 0 ? motorcycles[0] : null);

  return {
    motorcycle: activeMotorcycle,
    motorcycles,
    selectedVehicleId,
    setSelectedVehicleId,
    isLoading,
    error,
    refresh: fetchMotorcycles,
  };
}
