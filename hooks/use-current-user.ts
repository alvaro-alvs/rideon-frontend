import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth";

export type CurrentUser = {
  id: string | null;
  email: string | null;
  role: UserRole;
  status: string | null;
};

type State =
  | { status: "loading" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unauthenticated" };

const AUTH_SYNC_KEY = "rideon_auth_sync";
const HEARTBEAT_INTERVAL_MS = 1000 * 60 * 4; // 4 minutes

/**
 * Checks synchronously whether the client session cookie is active.
 */
export function isClientSessionActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("rideon_session_active=1"));
}

/**
 * Broadcasts an auth state change across browser tabs.
 */
export function notifyAuthChange(action: "login" | "logout" | "refresh") {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_SYNC_KEY, `${action}:${Date.now()}`);
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fetches the current user's profile from GET /api/auth/me.
 * Monitors cookie presence, handles multi-tab synchronization,
 * tab visibility changes, and proactive heartbeat session retention.
 */
export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const runFetch = () => {
      fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      })
        .then(async (res) => {
          if (!isMounted) return;
          if (!res.ok) {
            setState({ status: "unauthenticated" });
            return;
          }

          const data = (await res.json()) as {
            id: string | null;
            email: string | null;
            role: string;
            status: string | null;
          };

          if (!isMounted) return;
          setState({
            status: "authenticated",
            user: {
              id: data.id ?? null,
              email: data.email ?? null,
              role: data.role === "admin" ? "admin" : "rider",
              status: data.status ?? null,
            },
          });
        })
        .catch(() => {
          if (isMounted) {
            setState({ status: "unauthenticated" });
          }
        });
    };

    runFetch();

    // 1. Re-check on tab visibility change or focus
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        runFetch();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // 2. Synchronize across tabs via storage event
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_SYNC_KEY) {
        runFetch();
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Heartbeat: periodically ping /api/auth/me to keep access token fresh
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        runFetch();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  return state;
}


