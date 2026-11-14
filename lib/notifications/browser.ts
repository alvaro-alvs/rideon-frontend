/**
 * Cross-browser native Notification utility for RideOn.
 * Supports Desktop & Mobile browsers (Chrome, Safari, Firefox, Edge).
 * Handles ServiceWorker fallback for mobile environments where
 * direct `new Notification()` constructor is restricted.
 */

export interface BrowserNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: unknown;
  link?: string;
  requireInteraction?: boolean;
  onClick?: () => void;
}

export type AppNotificationConsent = "granted" | "denied" | "unset";

const APP_CONSENT_KEY = "rideon_app_notifications_consent";

/**
 * Returns whether the user has explicitly granted or declined notifications inside the RideOn app.
 */
export function getAppNotificationConsent(): AppNotificationConsent {
  if (typeof window === "undefined") return "unset";
  try {
    const val = localStorage.getItem(APP_CONSENT_KEY);
    if (val === "granted" || val === "denied") return val;
    return "unset";
  } catch {
    return "unset";
  }
}

/**
 * Persists the user's in-app notification consent choice and notifies listeners.
 */
export function setAppNotificationConsent(consent: AppNotificationConsent): void {
  if (typeof window === "undefined") return;
  try {
    if (consent === "unset") {
      localStorage.removeItem(APP_CONSENT_KEY);
    } else {
      localStorage.setItem(APP_CONSENT_KEY, consent);
    }
  } catch {
    // Ignore storage errors
  }
  notifyPermissionChanged();
}

export interface BrowserNotificationDiagnostics {
  supported: boolean;
  isSecureContext: boolean;
  permission: NotificationPermission | "unsupported";
  appConsent: AppNotificationConsent;
}

/**
 * Returns diagnostic info about browser & in-app notification state.
 */
export function getBrowserNotificationDiagnostics(): BrowserNotificationDiagnostics {
  if (typeof window === "undefined") {
    return {
      supported: false,
      isSecureContext: false,
      permission: "unsupported",
      appConsent: "unset",
    };
  }
  return {
    supported: isBrowserNotificationSupported(),
    isSecureContext: Boolean(window.isSecureContext),
    permission: getBrowserNotificationPermission(),
    appConsent: getAppNotificationConsent(),
  };
}

/**
 * Checks if the current browser environment supports the Web Notification API.
 */
export function isBrowserNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

/**
 * Returns true if browser notifications are already permitted and active.
 */
export function isBrowserNotificationGranted(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "granted";
}

/**
 * Returns true if browser notifications were explicitly denied/blocked.
 */
export function isBrowserNotificationDenied(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "denied";
}

/**
 * Returns current notification permission state:
 * 'default' | 'granted' | 'denied' | 'unsupported'
 */
export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

const PERMISSION_EVENT_NAME = "rideon:notification-permission-change";

/**
 * Dispatches a permission change event across the app so all UI components update in sync.
 */
export function notifyPermissionChanged(permission?: NotificationPermission | "unsupported"): void {
  if (typeof window === "undefined") return;
  try {
    const currentPerm = permission ?? getBrowserNotificationPermission();
    window.dispatchEvent(
      new CustomEvent(PERMISSION_EVENT_NAME, { detail: { permission: currentPerm } })
    );
  } catch {
    // Ignore in non-browser or restricted contexts
  }
}

/**
 * Subscribes to notification permission changes across browser windows, tabs,
 * site settings adjustments, and user actions.
 */
export function subscribeToNotificationPermission(
  callback: (permission: NotificationPermission | "unsupported") => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const check = () => {
    const perm = getBrowserNotificationPermission();
    callback(perm);
    return perm;
  };

  // Immediate check
  check();

  // 1. Listen for internal app permission changes
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ permission?: NotificationPermission | "unsupported" }>;
    if (custom.detail?.permission) {
      callback(custom.detail.permission);
    } else {
      check();
    }
  };
  window.addEventListener(PERMISSION_EVENT_NAME, handleCustomEvent);

  // 2. Listen for window focus & visibility changes (e.g. user toggled permission in browser settings)
  const handleFocus = () => {
    check();
  };
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleFocus);

  // 3. Listen to navigator.permissions query if available
  let permStatus: PermissionStatus | null = null;
  let statusListener: (() => void) | null = null;

  if (navigator?.permissions?.query) {
    try {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          permStatus = status;
          statusListener = () => {
            check();
          };
          if (permStatus.addEventListener) {
            permStatus.addEventListener("change", statusListener);
          } else {
            permStatus.onchange = statusListener;
          }
        })
        .catch(() => {
          // Unsupported query in some browsers, safely ignored
        });
    } catch {
      // Ignore
    }
  }

  return () => {
    window.removeEventListener(PERMISSION_EVENT_NAME, handleCustomEvent);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleFocus);
    if (permStatus && statusListener) {
      if (permStatus.removeEventListener) {
        permStatus.removeEventListener("change", statusListener);
      } else {
        permStatus.onchange = null;
      }
    }
  };
}

/**
 * Requests native notification permission with cross-browser compatibility
 * (supporting both Promise-based and legacy callback-based implementations).
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) {
    return "denied";
  }

  try {
    // Modern Promise-based API with legacy fallback
    const permission = await new Promise<NotificationPermission>((resolve) => {
      try {
        const result = Notification.requestPermission((p) => resolve(p));
        if (result && typeof result.then === "function") {
          result.then(resolve).catch(() => resolve("denied"));
        }
      } catch {
        resolve("denied");
      }
    });

    notifyPermissionChanged(permission);
    return permission;
  } catch (err) {
    console.warn("[BrowserNotif] Error requesting permission:", err);
    notifyPermissionChanged("denied");
    return "denied";
  }
}

/**
 * Records explicit in-app user permission first, then immediately requests
 * native browser notification permission within the same user gesture.
 */
export async function enableNotificationsWithAppConsent(): Promise<{
  appConsent: AppNotificationConsent;
  browserPermission: NotificationPermission | "unsupported";
}> {
  setAppNotificationConsent("granted");

  if (!isBrowserNotificationSupported()) {
    return { appConsent: "granted", browserPermission: "unsupported" };
  }

  const browserPermission = await requestBrowserNotificationPermission();
  return { appConsent: "granted", browserPermission };
}

/**
 * Sends a native system notification through the browser.
 */
export async function sendBrowserNotification(
  title: string,
  options: BrowserNotificationOptions = {},
): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const defaultIcon = "/favicon.ico";
  const defaultBadge = "/favicon.ico";

  const notifOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || defaultIcon,
    badge: options.badge || defaultBadge,
    tag: options.tag || `rideon-${Date.now()}`,
    data: options.data,
    requireInteraction: options.requireInteraction ?? false,
    // Modern sound is handled by Web Audio synth, so we mute native browser beep
    silent: true,
  };

  const handleClick = () => {
    try {
      window.focus();
    } catch {
      // Ignore
    }

    if (options.onClick) {
      options.onClick();
    } else if (options.link) {
      window.location.href = options.link;
    }
  };

  // 1. Try standard Window Notification constructor
  try {
    const notification = new Notification(title, notifOptions);

    notification.onclick = (e) => {
      e.preventDefault();
      handleClick();
      try {
        notification.close();
      } catch {
        // Ignore
      }
    };

    // Auto-close notification after 8 seconds
    setTimeout(() => {
      try {
        notification.close();
      } catch {
        // Ignore
      }
    }, 8000);

    return true;
  } catch (err) {
    // 2. Mobile browsers (e.g. Chrome on Android) often forbid `new Notification()`
    // and require ServiceWorkerRegistration.showNotification().
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, notifOptions);
          return true;
        }
      } catch (swErr) {
        console.warn("[BrowserNotif] ServiceWorker notification failed:", swErr);
      }
    }

    console.warn("[BrowserNotif] Failed to dispatch browser notification:", err);
    return false;
  }
}

const DISMISS_KEY = "rideon_browser_notif_dismissed_until";

/**
 * Checks if the user recently dismissed the notification prompt toast.
 */
export function isNotificationPromptDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    const expiry = Number(until);
    return !Number.isNaN(expiry) && Date.now() < expiry;
  } catch {
    return false;
  }
}

/**
 * Snoozes the notification permission toast for a specified duration in days (default: 7 days).
 */
export function dismissNotificationPrompt(days = 7): void {
  if (typeof window === "undefined") return;
  try {
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(expiry));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clears snooze to allow re-prompting.
 */
export function resetNotificationPromptDismissal(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    // Ignore
  }
}

