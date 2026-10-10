import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/auth";

export async function GET() {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${getApiUrl()}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { service?: string; status?: string } | null;
      return NextResponse.json({
        status: data?.status === "ok" ? "online" : "online",
        service: data?.service ?? "rideon-api",
        latencyMs,
      });
    }

    return NextResponse.json(
      { status: "offline", latencyMs, error: `HTTP ${res.status}` },
      { status: 503 },
    );
  } catch (error) {
    clearTimeout(timeout);
    return NextResponse.json(
      {
        status: "offline",
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 503 },
    );
  }
}
