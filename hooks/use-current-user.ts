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

/**
 * Fetches the current user's profile from GET /api/auth/me (which proxies to
 * GET /api/v1/auth/me on the backend).
 *
 * Per README_FRONTEND.md §3: the JWT does NOT carry the `role` field — it is
 * always resolved server-side in real time. This hook surfaces it to client
 * components so they can conditionally render role-gated UI.
 */
export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (cancelled) return;

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

        setState({
          status: "authenticated",
          user: {
            id: data.id ?? null,
            email: data.email ?? null,
            // Defensive cast: treat any unknown value as "rider"
            role: data.role === "admin" ? "admin" : "rider",
            status: data.status ?? null,
          },
        });
      } catch {
        if (!cancelled) setState({ status: "unauthenticated" });
      }
    }

    void fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
