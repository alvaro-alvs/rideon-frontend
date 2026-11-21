import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applyAuthCookies,
  clearAuthCookies,
  getApiUrl,
  getSessionOrRefresh,
} from "@/lib/auth";

export async function proxyNdjsonStream(
  request: NextRequest,
  upstreamPathWithQuery: string,
  errorMessage: string,
) {
  const session = await getSessionOrRefresh(request);
  if (!session) {
    const unauth = NextResponse.json(
      { message: "Sua sessao expirou. Entre novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
    clearAuthCookies(unauth);
    return unauth;
  }

  try {
    const upstream = await fetch(`${getApiUrl()}${upstreamPathWithQuery}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
        Accept: "application/x-ndjson",
      },
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const errBody = await upstream.json().catch(() => null);
      return NextResponse.json(
        {
          message:
            (errBody as { error?: { message?: string }; message?: string } | null)?.error
              ?.message ||
            (errBody as { message?: string } | null)?.message ||
            errorMessage,
        },
        { status: upstream.status >= 500 ? 502 : upstream.status },
      );
    }

    const res = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });

    if (session.refreshed && session.newAccessToken) {
      applyAuthCookies(res, {
        accessToken: session.newAccessToken,
        refreshToken: session.newRefreshToken,
      });
    }

    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return new NextResponse(null, { status: 499 });
    }
    return NextResponse.json(
      { message: "Nao foi possivel conectar ao servidor." },
      { status: 502 },
    );
  }
}
