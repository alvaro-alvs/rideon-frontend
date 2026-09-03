"use client";

import { useEffect, useState } from "react";

export type Motorcycle = {
  id?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
};

export type UseMotorcycleResult = {
  motorcycle: Motorcycle | null;
  motorcycles: Motorcycle[];
  isLoading: boolean;
  error: string | null;
};

export function useMotorcycle(): UseMotorcycleResult {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchMotorcycles() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/vehicles", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Falha ao carregar veículos.");
        }

        const data = (await response.json()) as {
          motorcycles?: Motorcycle[];
        };

        if (!active) return;

        const list = Array.isArray(data.motorcycles) ? data.motorcycles : [];
        setMotorcycles(list);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setMotorcycles([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fetchMotorcycles();

    return () => {
      active = false;
    };
  }, []);

  return {
    motorcycle: motorcycles.length > 0 ? motorcycles[0] : null,
    motorcycles,
    isLoading,
    error,
  };
}
