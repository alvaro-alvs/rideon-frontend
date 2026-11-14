"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ApiHealthStatus = "checking" | "online" | "offline";

export function useApiHealth(intervalMs = 5000) {
  const [status, setStatus] = useState<ApiHealthStatus>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingCount, setPingCount] = useState(0);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const isMountedRef = useRef(true);

  const checkHealth = useCallback(() => {
    const clientStart = performance.now();
    setIsPinging(true);

    fetch("/api/health", { cache: "no-store" })
      .then(async (res) => {
        if (!isMountedRef.current) return;
        if (res.ok) {
          const data = (await res.json()) as {
            status: string;
            latencyMs?: number;
          };
          if (data.status === "online") {
            const measured =
              typeof data.latencyMs === "number"
                ? data.latencyMs
                : Math.max(1, Math.round(performance.now() - clientStart));
            setStatus("online");
            setLatency(measured);
            setLatencyHistory((prev) => [...prev.slice(-7), measured]);
            setPingCount((prev) => prev + 1);
            return;
          }
        }
        setStatus("offline");
        setLatency(null);
      })
      .catch(() => {
        if (isMountedRef.current) {
          setStatus("offline");
          setLatency(null);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsPinging(false);
        }
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    checkHealth();

    const interval = setInterval(checkHealth, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [checkHealth, intervalMs]);

  return {
    status,
    latency,
    isPinging,
    pingCount,
    latencyHistory,
    pingNow: checkHealth,
  };
}
