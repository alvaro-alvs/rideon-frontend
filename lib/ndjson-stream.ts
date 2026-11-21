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
  /** Minimum delay in ms between visual chunk yields when chunks arrive instantaneously. */
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
 * Consumes an NDJSON HTTP stream progressively using ReadableStream, invoking
 * `onFrame` incrementally so UI animations render points as they arrive.
 */
export async function consumeNdjsonStream(
  url: string,
  { signal, frameDelayMs = 28, onFrame }: ConsumeStreamOptions,
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

  const processLine = async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const frame = JSON.parse(trimmed) as TelemetryStreamFrame;
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
