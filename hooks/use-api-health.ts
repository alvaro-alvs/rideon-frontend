"use client";

import { useEffect, useState } from "react";

export type ApiHealthStatus = "checking" | "online" | "offline";

export function useApiHealth(intervalMs = 20000) {
  const [status, setStatus] = useState<ApiHealthStatus>("checking");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = () => {
      fetch("/api/health", { cache: "no-store" })
        .then(async (res) => {
          if (!isMounted) return;
          if (res.ok) {
            const data = (await res.json()) as {
              status: string;
              latencyMs?: number;
            };
            if (data.status === "online") {
              setStatus("online");
              if (typeof data.latencyMs === "number") {
                setLatency(data.latencyMs);
              }
              return;
            }
          }
          setStatus("offline");
          setLatency(null);
        })
        .catch(() => {
          if (isMounted) {
            setStatus("offline");
            setLatency(null);
          }
        });
    };

    checkHealth();

    const interval = setInterval(checkHealth, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { status, latency };
}
