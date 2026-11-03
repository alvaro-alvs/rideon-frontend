"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  X,
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
import { isPlatformOrTenantAdmin, type MatchCorrespondence } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);

  // Verification Dialog States (When customer was pre-registered by manager)
  const [matches, setMatches] = useState<MatchCorrespondence[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchCorrespondence | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Proactive search drawer state
  const [showLookupBox, setShowLookupBox] = useState(false);
  const [lookupName, setLookupName] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const isAlreadyLoggedIn =
    isClientSessionActive() || currentUser.status === "authenticated";

  // Check if session is already active and bypass registration immediately
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

  // Form submission: attempts register, intercepts existing pre-registered user
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted) return;
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = (await response.json()) as {
        registered?: boolean;
        authenticated?: boolean;
        autoLoggedIn?: boolean;
        userExists?: boolean;
        matches?: MatchCorrespondence[];
        role?: string;
        message?: string;
      };

      // Detect if user already exists or was pre-registered by a tenant manager
      if (response.status === 409 && data.userExists && data.matches && data.matches.length > 0) {
        setMatches(data.matches);
        setSelectedMatch(data.matches[0]);
        setIsDialogOpen(true);
        setPending(false);
        return;
      }

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

  // Handle proactive lookup by name and email
  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!lookupName && !lookupEmail) return;
    setLookupLoading(true);
    setLookupError("");

    try {
      const res = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lookupName.trim(), email: lookupEmail.trim() }),
      });
      const data = (await res.json()) as {
        found?: boolean;
        matches?: MatchCorrespondence[];
        message?: string;
      };

      if (!res.ok || !data.found || !data.matches || data.matches.length === 0) {
        setLookupError("Nenhuma correspondência encontrada com os dados informados.");
        return;
      }

      setMatches(data.matches);
      setSelectedMatch(data.matches[0]);
      setIsDialogOpen(true);
      setShowLookupBox(false);
    } catch {
      setLookupError("Erro ao consultar cadastro. Tente novamente.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Confirm that the found account belongs to the user and proceed to auto-login
  const handleConfirmAccount = async () => {
    if (!selectedMatch) return;
    setClaiming(true);
    setError("");

    // Use entered password or generate a prompt if empty
    const effectivePassword = password || "RideOn@" + Math.random().toString(36).substring(2, 10);

    try {
      const res = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || selectedMatch.masked_email,
          password: effectivePassword,
          user_id: selectedMatch.user_id,
        }),
      });

      const data = (await res.json()) as {
        authenticated?: boolean;
        autoLoggedIn?: boolean;
        firstLogin?: boolean;
        message?: string;
      };

      if (!res.ok || !data.authenticated) {
        throw new Error(data.message || "Não foi possível confirmar o acesso.");
      }

      setClaimSuccess(true);
      setIsDialogOpen(false);
      setAutoLoggingIn(true);

      // Flag for dashboard to suggest password change on first entry
      if (typeof window !== "undefined") {
        window.localStorage.setItem("rideon_first_login_prompt", "true");
      }

      notifyAuthChange("login");

      setTimeout(() => {
        router.push("/dashboard?first_login=1");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar conta.");
      setIsDialogOpen(false);
    } finally {
      setClaiming(false);
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
    <>
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
              {claimSuccess ? "Conta Vinculada com Sucesso!" : "Conta Criada com Sucesso!"}
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

            {/* Proactive Lookup Banner for Pre-registered Fleet Clients */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  <span>Seu gestor de frota já criou sua conta?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLookupBox(!showLookupBox)}
                  className="text-xs font-bold text-primary hover:underline transition-colors"
                >
                  {showLookupBox ? "Fechar busca" : "Consultar dados"}
                </button>
              </div>

              {/* Quick Search Drawer */}
              {showLookupBox && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Consulte por seu <strong>nome</strong> e/ou <strong>e-mail</strong> para verificar se sua empresa já cadastrou seu acesso.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={lookupName}
                      onChange={(e) => setLookupName(e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Seu e-mail"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  {lookupError && (
                    <p className="text-[11px] font-semibold text-red-400">{lookupError}</p>
                  )}
                  <Button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookupLoading || (!lookupName && !lookupEmail)}
                    className="h-8 w-full gap-1.5 text-xs font-semibold"
                  >
                    {lookupLoading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Buscando correspondências...
                      </>
                    ) : (
                      <>
                        <Search className="size-3.5" />
                        Localizar Meu Cadastro
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Nome Completo
              </label>
              <div className="input-wrap rounded-lg">
                <User className="size-4 text-muted-foreground" />
                <input
                  required
                  name="name"
                  autoComplete="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo da Silva"
                  className="bg-transparent"
                />
              </div>
            </div>

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
                  Verificando e criando conta...
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
              <span>Login imediato ativado após confirmação.</span>
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

      {/* ========================================================================= */}
      {/* DIALOG: QUESTIONANDO SE O CADASTRO LOCALIZADO PERTENCE AO CLIENTE         */}
      {/* ========================================================================= */}
      {isDialogOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground">
            {/* Close / Dismiss button */}
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            {/* Header Icon + Badge */}
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <UserCheck className="size-6" />
              </div>
              <div>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/25">
                  Cadastro Encontrado
                </span>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  Identificamos seus dados na plataforma
                </h3>
              </div>
            </div>

            {/* Greeting */}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Olá, <strong className="text-foreground">{selectedMatch.first_name}</strong>!
              Localizamos um perfil pré-configurado pelo seu gestor de frota com correspondência ao seu registro:
            </p>

            {/* Partial Masked Data Box (Safe & Non-exposing) */}
            <div className="mt-3.5 rounded-xl border border-border/80 bg-secondary/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Nome:</span>
                <span className="font-semibold text-foreground">{selectedMatch.masked_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">E-mail:</span>
                <span className="font-semibold text-foreground">{selectedMatch.masked_email}</span>
              </div>
              {selectedMatch.masked_phone && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Telefone:</span>
                  <span className="font-semibold text-foreground">{selectedMatch.masked_phone}</span>
                </div>
              )}
              {selectedMatch.tenant_name && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Building2 className="size-3 text-primary" />
                    Empresa / Frota:
                  </span>
                  <span className="font-semibold text-primary">{selectedMatch.tenant_name}</span>
                </div>
              )}
            </div>

            {/* Core Question */}
            <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
              <p className="text-xs font-semibold text-amber-300">
                Este cadastro pertence a você?
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={claiming}
                onClick={() => {
                  setIsDialogOpen(false);
                  setError("Verifique ou ajuste o nome/e-mail para criar uma conta diferente.");
                }}
                className="w-full text-xs font-semibold"
              >
                Não sou eu
              </Button>
              <Button
                type="button"
                disabled={claiming}
                onClick={handleConfirmAccount}
                className="w-full gap-1.5 text-xs font-bold uppercase tracking-wider"
              >
                {claiming ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    Sim, sou eu!
                    <ChevronRight className="size-3.5" />
                  </>
                )}
              </Button>
            </div>

            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Ao confirmar, seu login será efetuado automaticamente para acessar sua frota.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
