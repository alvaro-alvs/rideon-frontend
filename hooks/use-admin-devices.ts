"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminDevicesResponse, Device } from "@/lib/types/device";

export type FilterStatus = "all" | "active" | "inactive" | "unlinked";

export function useAdminDevices(pollIntervalSeconds: number = 30) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDevices = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefetching(true);
      }
      setError(null);

      const response = await fetch("/api/admin/devices", { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        if (response.status === 401) {
          throw new Error(
            body?.message || "Sessão não autenticada. Faça login novamente.",
          );
        }
        throw new Error(
          body?.message || "Falha ao carregar lista de dispositivos.",
        );
      }

      const data = (await response.json()) as AdminDevicesResponse;
      setDevices(data.devices || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dispositivos");
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, []);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  // Polling automático
  useEffect(() => {
    if (!autoRefresh || pollIntervalSeconds <= 0) return;

    const timer = setInterval(() => {
      void fetchDevices(false);
    }, pollIntervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, pollIntervalSeconds, fetchDevices]);

  // Filtragem e busca
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Filtro de status
      if (filterStatus === "active" && !device.last_position) return false;
      if (filterStatus === "inactive" && device.last_position) return false;
      if (filterStatus === "unlinked" && device.motorcycle) return false;

      // Busca textual
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      const matchesSerial = device.serial_number.toLowerCase().includes(q);
      const matchesProtocol = device.protocol?.toLowerCase().includes(q);
      const matchesPlate = device.motorcycle?.license_plate.toLowerCase().includes(q);
      const matchesMotoModel = device.motorcycle
        ? `${device.motorcycle.brand} ${device.motorcycle.model}`.toLowerCase().includes(q)
        : false;
      const matchesRider = device.motorcycle?.rider?.name.toLowerCase().includes(q);

      return (
        matchesSerial ||
        Boolean(matchesProtocol) ||
        Boolean(matchesPlate) ||
        Boolean(matchesMotoModel) ||
        Boolean(matchesRider)
      );
    });
  }, [devices, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = devices.length;
    const activeCount = devices.filter((d) => Boolean(d.last_position)).length;
    const inactiveCount = devices.filter((d) => !d.last_position && Boolean(d.motorcycle)).length;
    const unlinkedCount = devices.filter((d) => !d.motorcycle).length;

    return {
      total,
      activeCount,
      inactiveCount,
      unlinkedCount,
    };
  }, [devices]);

  return {
    devices,
    filteredDevices,
    stats,
    isLoading,
    isRefetching,
    error,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    autoRefresh,
    setAutoRefresh,
    lastUpdated,
    refetch: () => fetchDevices(true),
  };
}
