"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { Button } from "@/app/components/ui/button";
import {
  isClientSessionActive,
  notifyAuthChange,
  useCurrentUser,
} from "@/hooks/use-current-user";

export default function RegisterPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);

  const isAlreadyLoggedIn =
    isClientSessionActive() || currentUser.status === "authenticated";

  // Check if session is already active and bypass registration immediately
  useEffect(() => {
    if (isAlreadyLoggedIn) {
      const destination =
        currentUser.status === "authenticated" &&
        currentUser.user.role === "admin"
          ? "/admin"
          : "/dashboard";
      router.replace(destination);
    }
  }, [isAlreadyLoggedIn, currentUser, router]);

  // Real-time password strength calculation
  const passwordCriteria = useMemo(() => {
    return {
      minLength: password.length >= 6,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumberOrSpecial: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const passwordScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (passwordCriteria.minLength) score += 1;
    if (password.length >= 8) score += 1;
    if (passwordCriteria.hasLetter && passwordCriteria.hasNumberOrSpecial) score += 1;
    if (password.length >= 10 && /[A-Z]/.test(password)) score += 1;
    return score;
  }, [password, passwordCriteria]);

  const strengthLabel = useMemo(() => {
    if (passwordScore === 0) return { text: "Insira uma senha", color: "bg-border", textColor: "text-muted-foreground" };
    if (passwordScore === 1) return { text: "Fraca", color: "bg-red-500", textColor: "text-red-400" };
    if (passwordScore === 2) return { text: "Média", color: "bg-amber-500", textColor: "text-amber-400" };
    if (passwordScore === 3) return { text: "Forte", color: "bg-emerald-500", textColor: "text-emerald-400" };
    return { text: "Excelente", color: "bg-emerald-400", textColor: "text-emerald-300" };
  }, [passwordScore]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted) return;
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        registered?: boolean;
        authenticated?: boolean;
        autoLoggedIn?: boolean;
        role?: string;
        message?: string;
      };

      if (!response.ok || !data.registered) {
        throw new Error(data.message ?? "Não foi possível criar a conta.");
      }

      // If auto-login succeeded, show feedback and redirect directly to dashboard
      if (data.authenticated && data.autoLoggedIn) {
        setAutoLoggingIn(true);
        notifyAuthChange("login");
        setTimeout(() => {
          router.push("/dashboard");
        }, 700);
      } else {
        // Fallback: send to login with banner
        router.push("/login?registered=1");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar a conta. Tente novamente.",
      );
      setPending(false);
    }
  };

  if (isAlreadyLoggedIn) {
    return (
      <AuthLayout
        activeTab="register"
        title="Sessão Ativa"
        copy="Identificamos sua conexão. Redirecionando para a central..."
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-4 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Você já está conectado.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Redirecionando para seu painel de controle...
          </p>
          <Button
            type="button"
            className="mt-6 w-full"
            onClick={() => router.push("/dashboard")}
          >
            Acessar Painel Agora
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      activeTab="register"
      title="Criar Acesso"
      copy="Cadastre sua conta para ativar o rastreamento e telemetria da sua frota."
    >
      {autoLoggingIn ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-5 grid size-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="size-8" />
            <span className="absolute size-full animate-ping rounded-full bg-emerald-500/20" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">
            Conta Criada com Sucesso!
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Login realizado automaticamente. Entrando na central...
          </p>
          <div className="mt-6 flex w-full items-center justify-center gap-2 text-xs font-semibold text-primary">
            <Loader2 className="size-4 animate-spin" />
            <span>Iniciando ambiente seguro...</span>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs text-primary"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              E-mail para Acesso
            </label>
            <div className="input-wrap rounded-lg">
              <Mail className="size-4 text-muted-foreground" />
              <input
                required
                name="email"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="bg-transparent"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Senha Segura
              </label>
              {password && (
                <span className={`text-[11px] font-bold ${strengthLabel.textColor}`}>
                  {strengthLabel.text}
                </span>
              )}
            </div>
            <div className="input-wrap rounded-lg">
              <LockKeyhole className="size-4 text-muted-foreground" />
              <input
                required
                name="password"
                autoComplete="new-password"
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            {/* Password Strength Visual Meter */}
            {password.length > 0 && (
              <div className="space-y-2 pt-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 rounded-full transition-colors ${
                        step <= passwordScore ? strengthLabel.color : "bg-border/60"
                      }`}
                    />
                  ))}
                </div>

                {/* Micro Checklist */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      passwordCriteria.minLength ? "text-emerald-400" : ""
                    }`}
                  >
                    <Check className="size-3" /> 6+ caracteres
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      passwordCriteria.hasLetter ? "text-emerald-400" : ""
                    }`}
                  >
                    <Check className="size-3" /> Letras
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      passwordCriteria.hasNumberOrSpecial ? "text-emerald-400" : ""
                    }`}
                  >
                    <Check className="size-3" /> Números ou símbolos
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Terms Agreement Checkbox */}
          <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 size-3.5 rounded border-border bg-secondary accent-primary"
            />
            <span className="leading-snug">
              Concordo com os{" "}
              <span className="font-semibold text-foreground underline hover:text-primary">
                Termos de Serviço
              </span>{" "}
              e a{" "}
              <span className="font-semibold text-foreground underline hover:text-primary">
                Política de Privacidade
              </span>{" "}
              da RideOn.
            </span>
          </label>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!accepted || pending}
            className="mt-2 w-full gap-2 rounded-lg py-3 text-xs font-bold uppercase tracking-wider"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Criando conta e conectando...
              </>
            ) : (
              <>
                Criar Conta e Acessar
                <Zap className="size-4" />
              </>
            )}
          </Button>

          {/* Info pill about auto login */}
          <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Login imediato ativado após o cadastro.</span>
          </div>

          {/* Bottom Switcher */}
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Já possui cadastro?{" "}
            <Link
              href="/login"
              className="font-bold text-primary transition-colors hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
