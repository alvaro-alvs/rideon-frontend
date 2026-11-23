import type { TripItem, TripPoint } from "./trip-format";

export interface TelemetryStreamFrame {
  type: "meta" | "chunk" | "done" | "error";
  trip?: TripItem;
  motorcycle_id?: string;
  points?: TripPoint[];
  loaded?: number;
  total?: number;
  message?: string;
}

export interface ConsumeStreamOptions {
  signal?: AbortSignal;
  /** Minimum delay in ms between visual point/chunk yields when data arrives instantaneously. */
  frameDelayMs?: number;
  onFrame: (frame: TelemetryStreamFrame) => void;
}

function waitAnimationFrame(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Consumes an NDJSON HTTP stream progressively using ReadableStream, emitting
 * points incrementally so the route visually forms point-by-point as data arrives.
 */
export async function consumeNdjsonStream(
  url: string,
  { signal, frameDelayMs = 24, onFrame }: ConsumeStreamOptions,
): Promise<void> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/x-ndjson",
    },
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(
      (errBody as { message?: string } | null)?.message ||
        `Erro ao carregar stream (${res.status})`,
    );
  }

  if (!res.body) {
    throw new Error("Navegador não suporta leitura por streaming.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let totalHint = 0;

  const processLine = async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || signal?.aborted) return;
    const frame = JSON.parse(trimmed) as TelemetryStreamFrame;

    if (typeof frame.total === "number" && frame.total > 0) {
      totalHint = frame.total;
    }

    if (frame.type === "chunk" && Array.isArray(frame.points) && frame.points.length > 1) {
      // Reveal points progressively within each chunk so the route visibly forms step by step,
      // scaling step size for very large streams so total animation stays responsive.
      const pts = frame.points;
      const step = totalHint > 300 ? Math.max(1, Math.ceil(totalHint / 180)) : 1;
      const baseLoaded = Math.max(0, (frame.loaded ?? pts.length) - pts.length);

      for (let i = 0; i < pts.length; i += step) {
        if (signal?.aborted) return;
        const slice = pts.slice(i, i + step);
        const partialLoaded = baseLoaded + Math.min(pts.length, i + slice.length);
        onFrame({
          ...frame,
          points: slice,
          loaded: partialLoaded,
        });
        if (frameDelayMs > 0) {
          await waitAnimationFrame(frameDelayMs, signal);
        }
      }
      return;
    }

    onFrame(frame);
    if (frame.type === "chunk" && frameDelayMs > 0) {
      await waitAnimationFrame(frameDelayMs, signal);
    }
  };

  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => {});
      return;
    }

    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let newlineIdx = buffer.indexOf("\n");
    while (newlineIdx !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      await processLine(line);
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        return;
      }
      newlineIdx = buffer.indexOf("\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    await processLine(buffer);
  }
}
