/**
 * Modern synthesized notification chime using the Web Audio API.
 * Produces a polished, crystal-clear and satisfying harmonic chime
 * without relying on external MP3 downloads or network latency.
 */

export type NotificationSoundVariant = "default" | "ignition" | "urgent";

let audioCtx: AudioContext | null = null;
let globalUnlockInitialized = false;

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

  return audioCtx;
}

/**
 * Pre-warms / unlocks the AudioContext on user interaction
 * so future background notifications can play without autoplay blocks.
 */
export function initAudioOnUserGesture(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // Will resume on the next user interaction
    });
  }
}

/**
 * Attaches lightweight global interaction listeners so the AudioContext is
 * unlocked on the very first user gesture anywhere in the application.
 */
export function setupGlobalAudioUnlock(): () => void {
  if (typeof window === "undefined" || globalUnlockInitialized) {
    return () => {};
  }

  globalUnlockInitialized = true;
  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "click"];

  const handleGesture = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === "running") {
            cleanup();
          }
        })
        .catch(() => {});
    } else if (ctx.state === "running") {
      cleanup();
    }
  };

  const cleanup = () => {
    for (const evt of events) {
      window.removeEventListener(evt, handleGesture, true);
    }
  };

  for (const evt of events) {
    window.addEventListener(evt, handleGesture, { capture: true, passive: true });
  }

  return () => {
    cleanup();
    globalUnlockInitialized = false;
  };
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
 * Plays a modern, crisp and reinforced notification chime.
 * Awaits AudioContext resume if suspended so scheduled tones are never dropped.
 */
export function playNotificationSound(variant: NotificationSoundVariant = "default"): void {
  if (!isSoundEnabled()) return;
  void triggerSound(variant);
}

/**
 * Unlocks audio on user gesture and plays a test chime regardless of previous
 * suspension state, useful for settings and permission confirmation.
 */
export function testNotificationSound(variant: NotificationSoundVariant = "default"): void {
  initAudioOnUserGesture();
  void triggerSound(variant);
}

async function triggerSound(variant: NotificationSoundVariant): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // Dynamics compressor prevents clipping while keeping alerts clearly audible
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, now);
    compressor.knee.setValueAtTime(18, now);
    compressor.ratio.setValueAtTime(4, now);
    compressor.attack.setValueAtTime(0.005, now);
    compressor.release.setValueAtTime(0.15, now);
    compressor.connect(ctx.destination);

    // Reinforced master gain for clear audibility
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.38, now);
    masterGain.connect(compressor);

    // Warm low-pass filter to eliminate harsh high-frequency clicks
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4800, now);
    filter.connect(masterGain);

    if (variant === "urgent") {
      // Reinforced double-pulse alert chime: A5 -> E6 (twice)
      createTone(ctx, filter, {
        freq: 880.0,
        startTime: now,
        attackTime: 0.01,
        decayTime: 0.18,
        peakGain: 0.95,
      });
      createTone(ctx, filter, {
        freq: 1318.51,
        startTime: now + 0.08,
        attackTime: 0.01,
        decayTime: 0.24,
        peakGain: 1.0,
      });
      createTone(ctx, filter, {
        freq: 880.0,
        startTime: now + 0.26,
        attackTime: 0.01,
        decayTime: 0.2,
        peakGain: 0.95,
      });
      createTone(ctx, filter, {
        freq: 1318.51,
        startTime: now + 0.34,
        attackTime: 0.01,
        decayTime: 0.36,
        peakGain: 1.0,
      });
      return;
    }

    if (variant === "ignition") {
      // Distinct ascending chime: C5 -> G5 -> C6 shimmer
      createTone(ctx, filter, {
        freq: 523.25,
        startTime: now,
        attackTime: 0.012,
        decayTime: 0.28,
        peakGain: 0.9,
      });
      createTone(ctx, filter, {
        freq: 783.99,
        startTime: now + 0.085,
        attackTime: 0.012,
        decayTime: 0.38,
        peakGain: 1.0,
      });
      createTone(ctx, filter, {
        freq: 1046.5,
        startTime: now + 0.17,
        attackTime: 0.015,
        decayTime: 0.35,
        peakGain: 0.55,
      });
      return;
    }

    // Default: crisp modern two-tone chime (E5 -> A5 + A6 shimmer)
    createTone(ctx, filter, {
      freq: 659.25,
      startTime: now,
      attackTime: 0.012,
      decayTime: 0.32,
      peakGain: 0.9,
    });
    createTone(ctx, filter, {
      freq: 880.0,
      startTime: now + 0.09,
      attackTime: 0.014,
      decayTime: 0.45,
      peakGain: 1.0,
    });
    createTone(ctx, filter, {
      freq: 1760.0,
      startTime: now + 0.095,
      attackTime: 0.02,
      decayTime: 0.28,
      peakGain: 0.24,
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

