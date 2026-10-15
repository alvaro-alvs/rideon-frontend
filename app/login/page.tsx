"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { Button } from "@/app/components/ui/button";
import {
  isClientSessionActive,
  notifyAuthChange,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const registered = searchParams.get("registered") === "1";
  const expired = searchParams.get("expired") === "1";
  const returnTo = searchParams.get("from") || "/dashboard";

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
        body: JSON.stringify({ email, password }),
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
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-4 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Você já está conectado.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Acessando seus veículos e dados de telemetria...
          </p>
          <Button
            type="button"
            className="mt-6 w-full"
            onClick={() => router.push(returnTo)}
          >
            Acessar Painel Agora
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      activeTab="login"
      title="Bem-vindo de volta"
      copy="Acesse sua central para gerenciar veículos e telemetria em tempo real."
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Registration Notice */}
        {registered && !error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span>Conta criada com sucesso! Faça login para continuar.</span>
          </div>
        )}

        {/* Expired Session Notice */}
        {expired && !error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-400">
            <AlertCircle className="size-4 shrink-0 text-amber-400" />
            <span>Sua sessão expirou por inatividade. Por favor, entre novamente para continuar.</span>
          </div>
        )}

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
            E-mail
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
              Senha
            </label>
            <button
              type="button"
              className="text-[11px] font-semibold text-primary transition-colors hover:underline hover:text-primary/90"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="input-wrap rounded-lg">
            <LockKeyhole className="size-4 text-muted-foreground" />
            <input
              required
              name="password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
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
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-3.5 rounded border-border bg-secondary accent-primary"
            />
            <span>Lembrar neste navegador</span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={pending}
          className="mt-2 w-full gap-2 rounded-lg py-3 text-xs font-bold uppercase tracking-wider"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Autenticando...
            </>
          ) : (
            <>
              Entrar na Central
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        {/* Bottom Switcher */}
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Ainda não tem acesso?{" "}
          <Link
            href="/register"
            className="font-bold text-primary transition-colors hover:underline"
          >
            Cadastre-se gratuitamente
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
