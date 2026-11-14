"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { Button } from "@/app/components/ui/button";
import {
  isClientSessionActive,
  notifyAuthChange,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";
import { resolveLoginIdentifier } from "@/lib/login-identifier";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();

  const [identifierInput, setIdentifierInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const registered = searchParams.get("registered") === "1";
  const expired = searchParams.get("expired") === "1";
  const returnTo = searchParams.get("from") || "/dashboard";

  const resolvedIdentifier = useMemo(
    () => resolveLoginIdentifier(identifierInput, "auto"),
    [identifierInput],
  );

  const handleIdentifierChange = (value: string) => {
    const next = resolveLoginIdentifier(value, "auto");
    setIdentifierInput(next.displayValue);
  };

  const isAlreadyLoggedIn =
    !expired && (isClientSessionActive() || currentUser.status === "authenticated");

  // Check if session is already active and bypass login immediately
  useEffect(() => {
    if (isAlreadyLoggedIn) {
      const destination =
        currentUser.status === "authenticated" &&
        isPlatformOrTenantAdmin(currentUser.user.role)
          ? "/admin"
          : "/dashboard";
      router.replace(destination);
    }
  }, [isAlreadyLoggedIn, currentUser, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: resolvedIdentifier.apiValue,
          password,
        }),
      });

      const data = (await response.json()) as {
        authenticated?: boolean;
        role?: string;
        message?: string;
      };

      if (!response.ok || !data.authenticated) {
        throw new Error(data.message ?? "Não foi possível entrar. Verifique os dados.");
      }

      // Notify other open tabs of successful login
      notifyAuthChange("login");

      const target =
        isPlatformOrTenantAdmin(data.role) && returnTo === "/dashboard"
          ? "/admin"
          : returnTo;
      router.push(target);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  };

  if (isAlreadyLoggedIn) {
    return (
      <AuthLayout
        activeTab="login"
        title="Sessão Ativa"
        copy="Identificamos sua conexão. Redirecionando para a central..."
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="relative mb-5 grid size-14 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Loader2 className="relative size-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Você já está conectado.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Acessando seus veículos e dados de telemetria...
          </p>
          <Button
            type="button"
            className="mt-6 w-full rounded-xl shadow-[0_0_24px_-6px_rgba(239,37,27,0.45)]"
            onClick={() => router.push(returnTo)}
          >
            Acessar Painel Agora
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      activeTab="login"
      title="Bem-vindo de volta"
      copy="Acesse sua central para gerenciar veículos e telemetria em tempo real."
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Animated Notices & Error Alert */}
        <AnimatePresence mode="popLayout">
          {registered && !error && (
            <motion.div
              key="registered-notice"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400"
            >
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>Conta criada com sucesso! Faça login para continuar.</span>
            </motion.div>
          )}

          {expired && !error && (
            <motion.div
              key="expired-notice"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-400"
            >
              <AlertCircle className="size-4 shrink-0 text-amber-400" />
              <span>Sua sessão expirou por inatividade. Por favor, entre novamente para continuar.</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error-alert"
              role="alert"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: [0, -5, 5, -3, 3, 0] }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.38 }}
              className="flex items-start gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-xs text-primary shadow-[0_0_20px_-8px_rgba(239,37,27,0.4)]"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Identifier Field (E-mail, Placa ou IMEI) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="login-identifier"
              className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              E-mail, Placa do Veículo ou IMEI
            </label>

            {/* Live Detection / Format Badge */}
            <AnimatePresence mode="wait">
              {identifierInput.trim().length > 0 && resolvedIdentifier.detectedKind !== "unknown" && (
                <motion.span
                  key={`${resolvedIdentifier.detectedKind}-${resolvedIdentifier.plateStandard ?? ""}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                    resolvedIdentifier.isComplete
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground"
                  }`}
                >
                  {resolvedIdentifier.detectedKind === "email" && "E-mail"}
                  {resolvedIdentifier.detectedKind === "plate" &&
                    (resolvedIdentifier.plateStandard === "mercosul"
                      ? "Placa Mercosul"
                      : resolvedIdentifier.plateStandard === "antiga"
                        ? "Placa Padrão"
                        : "Placa")}
                  {resolvedIdentifier.detectedKind === "imei" &&
                    `IMEI • ${resolvedIdentifier.apiValue.length}/15`}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all duration-200 focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20 hover:border-white/15">
            {resolvedIdentifier.detectedKind === "plate" ? (
              <Bike className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            ) : resolvedIdentifier.detectedKind === "imei" ? (
              <Cpu className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            ) : (
              <Mail className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            )}
            <input
              id="login-identifier"
              required
              name="identifier"
              autoComplete={
                resolvedIdentifier.detectedKind === "email" ? "email" : "username"
              }
              inputMode="text"
              type="text"
              value={identifierInput}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              placeholder="seu@email.com, ABC-1234 / ABC1D23 ou IMEI"
              className={`w-full min-w-0 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 ${
                resolvedIdentifier.detectedKind === "plate" ||
                resolvedIdentifier.detectedKind === "imei"
                  ? "font-mono tracking-wider"
                  : ""
              }`}
            />
          </div>
        </motion.div>

        {/* Password Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Senha
            </label>
            <button
              type="button"
              className="text-[11px] font-semibold text-primary/90 transition-colors hover:text-primary hover:underline"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all duration-200 focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20 hover:border-white/15">
            <LockKeyhole className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            <input
              id="login-password"
              required
              name="password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full min-w-0 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={showPassword ? "hide" : "show"}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* Remember me */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between pt-0.5"
        >
          <label className="group flex cursor-pointer items-center gap-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`grid size-4 place-items-center rounded border transition-all duration-200 ${
                rememberMe
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_-3px_rgba(239,37,27,0.6)]"
                  : "border-white/20 bg-secondary/70 group-hover:border-white/35"
              }`}
            >
              <AnimatePresence>
                {rememberMe && (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="size-3 stroke-[3]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span className="select-none">Lembrar neste navegador</span>
          </label>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
          whileHover={pending ? undefined : { scale: 1.01 }}
          whileTap={pending ? undefined : { scale: 0.985 }}
          className="pt-1"
        >
          <Button
            type="submit"
            disabled={pending}
            className="group relative w-full overflow-hidden rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-[0_0_28px_-8px_rgba(239,37,27,0.55)] transition-shadow hover:shadow-[0_0_32px_-4px_rgba(239,37,27,0.7)]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            {pending ? (
              <span className="relative flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Autenticando...
              </span>
            ) : (
              <span className="relative flex items-center justify-center gap-2">
                Entrar na Central
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </motion.div>
      </form>
    </AuthLayout>
  );
}
