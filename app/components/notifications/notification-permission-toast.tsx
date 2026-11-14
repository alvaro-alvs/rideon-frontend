"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, BellRing, Check, RefreshCw, ShieldAlert, Sparkles, Volume2, X } from "lucide-react";
import {
  dismissNotificationPrompt,
  enableNotificationsWithAppConsent,
  getAppNotificationConsent,
  getBrowserNotificationDiagnostics,
  getBrowserNotificationPermission,
  isBrowserNotificationGranted,
  isNotificationPromptDismissed,
  sendBrowserNotification,
  subscribeToNotificationPermission,
} from "@/lib/notifications/browser";
import { initAudioOnUserGesture, setSoundEnabled, testNotificationSound } from "@/lib/notifications/sound";

type ToastStatus = "prompt" | "success" | "blocked";

export function NotificationPermissionToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<ToastStatus>("prompt");
  const [isSecureContext, setIsSecureContext] = useState(true);

  useEffect(() => {
    const syncState = () => {
      const diag = getBrowserNotificationDiagnostics();
      setIsSecureContext(diag.isSecureContext);

      if (diag.permission === "granted" || isBrowserNotificationGranted()) {
        setIsVisible(false);
      }
    };

    syncState();

    // Keep synchronized with permission state across window focus and other components
    const unsubscribe = subscribeToNotificationPermission((perm) => {
      if (perm === "granted" || isBrowserNotificationGranted()) {
        setIsVisible(false);
      }
    });

    if (isBrowserNotificationGranted() || isNotificationPromptDismissed()) {
      return unsubscribe;
    }

    const permission = getBrowserNotificationPermission();
    const appConsent = getAppNotificationConsent();

    // Show if browser permission is default, OR if browser blocked by default and user hasn't decided in-app yet
    const shouldPrompt =
      permission === "default" || (permission === "denied" && appConsent === "unset");

    if (!shouldPrompt) {
      return unsubscribe;
    }

    // Small delay so it appears smoothly after page load
    const timer = setTimeout(() => {
      const currentPerm = getBrowserNotificationPermission();
      const currentConsent = getAppNotificationConsent();
      const canShow =
        !isBrowserNotificationGranted() &&
        !isNotificationPromptDismissed() &&
        (currentPerm === "default" || (currentPerm === "denied" && currentConsent === "unset"));

      if (canShow) {
        setStatus("prompt");
        setIsVisible(true);
      }
    }, 2400);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleEnable = async () => {
    setIsSubmitting(true);
    initAudioOnUserGesture();
    setSoundEnabled(true);

    try {
      // 1. Record in-app user permission first, then request browser permission
      const { browserPermission } = await enableNotificationsWithAppConsent();

      // Always play reinforced confirmation chime so audio is verified
      testNotificationSound("default");

      if (browserPermission === "granted") {
        setStatus("success");

        // Send confirmation welcome notification
        await sendBrowserNotification("RideOn • Notificações Ativadas", {
          body: "Você receberá alertas instantâneos de ignição e segurança da sua moto.",
        });

        setTimeout(() => {
          setIsVisible(false);
        }, 2200);
      } else {
        // Browser blocked notifications by default or user denied browser prompt:
        // Keep audio alerts active and explain how to unblock in browser settings
        setStatus("blocked");
      }
    } catch {
      setStatus("blocked");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    dismissNotificationPrompt(7);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          role="region"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-[400px] overflow-hidden rounded-2xl border border-primary/30 bg-[#121214]/95 p-4 shadow-2xl shadow-black/80 backdrop-blur-xl ring-1 ring-white/10"
        >
          {/* Top subtle ambient glow line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar aviso de notificações"
            className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-start gap-3.5">
            {/* Animated Bell Icon */}
            <div className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-primary" />
              </span>
              {status === "success" ? (
                <Check className="size-5 text-emerald-400" />
              ) : status === "blocked" ? (
                <AlertTriangle className="size-5 text-amber-400" />
              ) : (
                <BellRing className="size-5 text-primary animate-pulse" />
              )}
            </div>

            <div className="min-w-0 flex-1 pr-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <ShieldAlert className="size-3" />
                <span>Sentinel Live</span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-0.5 text-zinc-400">
                  <Volume2 className="size-2.5" />
                  Áudio & Alertas
                </span>
              </div>

              <h4 className="mt-1 text-sm font-bold text-white tracking-wide">
                {status === "success"
                  ? "Notificações Ativadas com Sucesso!"
                  : status === "blocked"
                    ? "Sons ativos • Navegador bloqueou pop-ups"
                    : "Ativar alertas e notificações?"}
              </h4>

              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                {status === "success"
                  ? "Você agora receberá alertas sonoros e visuais em tempo real."
                  : status === "blocked"
                    ? isSecureContext
                      ? "Seu navegador está bloqueando notificações por padrão. Os alertas sonoros no app já estão ativos; para liberar pop-ups, clique no ícone de cadeado/configurações na barra de endereço e permita Notificações."
                      : "Os alertas sonoros no app já estão ativos. Notificações nativas do navegador exigem acesso via HTTPS ou localhost."
                    : "Autorize na aplicação para ativar os alertas sonoros reforçados e solicitar a permissão de notificações do navegador."}
              </p>

              {status === "prompt" && (
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="size-3.5" />
                    <span>{isSubmitting ? "Ativando..." : "Permitir Notificações"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              )}

              {status === "blocked" && (
                <div className="mt-3.5 flex items-center gap-2">
                  {isSecureContext && (
                    <button
                      type="button"
                      onClick={handleEnable}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className="size-3" />
                      <span>Tentar novamente</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    Entendi
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

