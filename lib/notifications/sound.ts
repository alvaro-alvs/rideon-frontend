/**
 * Modern synthesized notification chime using the Web Audio API.
 * Produces a polished, crystal-clear and satisfying harmonic chime
 * without relying on external MP3 downloads or network latency.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch (err) {
        console.warn("[Sound] Failed to create AudioContext:", err);
      }
    }
  }

  // Resume context if browser suspended it due to autoplay policies
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {
      // Will resume on the next user interaction
    });
  }

  return audioCtx;
}

/**
 * Pre-warms / unlocks the AudioContext on user interaction
 * so future background notifications can play without autoplay blocks.
 */
export function initAudioOnUserGesture(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/**
 * Checks whether notification sound is enabled in user settings.
 * Defaults to true.
 */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem("rideon_notification_sound");
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

/**
 * Toggles notification sound preference.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("rideon_notification_sound", String(enabled));
  } catch {
    // Ignore storage errors in private browsing
  }
}

/**
 * Plays a modern, crisp and satisfying two-tone notification chime.
 * Uses dual-harmonic oscillators with an exponential decay curve
 * to produce a clean, futuristic glass-like tone.
 */
export function playNotificationSound(): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Resume if suspended
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master gain to avoid clipping and control volume
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.connect(ctx.destination);

    // Warm low-pass filter to eliminate harsh high-frequency clicks
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4200, now);
    filter.connect(masterGain);

    // Note 1: E5 (659.25 Hz)
    createTone(ctx, filter, {
      freq: 659.25,
      startTime: now,
      attackTime: 0.012,
      decayTime: 0.32,
      peakGain: 0.85,
    });

    // Note 2: A5 (880.00 Hz) - delayed by 90ms for a crisp harmonic interval
    createTone(ctx, filter, {
      freq: 880.0,
      startTime: now + 0.09,
      attackTime: 0.014,
      decayTime: 0.45,
      peakGain: 1.0,
    });

    // Subtle octave shimmer: A6 (1760 Hz) for a modern glassy finish
    createTone(ctx, filter, {
      freq: 1760.0,
      startTime: now + 0.095,
      attackTime: 0.02,
      decayTime: 0.28,
      peakGain: 0.18,
    });
  } catch (err) {
    console.warn("[Sound] Failed to play notification sound:", err);
  }
}

interface ToneOptions {
  freq: number;
  startTime: number;
  attackTime: number;
  decayTime: number;
  peakGain: number;
}

function createTone(
  ctx: AudioContext,
  destination: AudioNode,
  options: ToneOptions,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Pure sine wave for smooth, modern chime
  osc.type = "sine";
  osc.frequency.setValueAtTime(options.freq, options.startTime);

  // Envelope: start at zero, quick ramp up, smooth exponential release
  gain.gain.setValueAtTime(0.0001, options.startTime);
  gain.gain.exponentialRampToValueAtTime(
    options.peakGain,
    options.startTime + options.attackTime,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    options.startTime + options.attackTime + options.decayTime,
  );

  osc.connect(gain);
  gain.connect(destination);

  osc.start(options.startTime);
  osc.stop(options.startTime + options.attackTime + options.decayTime + 0.05);

  // Clean up nodes after completion to prevent memory leaks
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      // Ignore
    }
  };
}

