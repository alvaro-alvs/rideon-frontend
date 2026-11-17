"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Search,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { useTenant } from "@/app/components/tenant-provider";
import { Button } from "@/app/components/ui/button";
import {
  isClientSessionActive,
  notifyAuthChange,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin, type MatchCorrespondence } from "@/lib/auth";
import { resolveLoginIdentifier } from "@/lib/login-identifier";
import { cleanPhone, formatPhone } from "@/lib/phone";

export type AuthTab = "login" | "register";

interface ManagerContact {
  name?: string;
  email?: string;
  phone?: string;
}

interface AuthPortalProps {
  initialTab?: AuthTab;
}

export function AuthPortal({ initialTab = "login" }: AuthPortalProps) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <AuthPortalContent initialTab={initialTab} />
    </Suspense>
  );
}

function AuthPortalContent({ initialTab }: { initialTab: AuthTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();
  const { branding } = useTenant();
  const brandName = branding.brand_name || "RideOn";

  const [activeTab, setActiveTab] = useState<AuthTab>(
    searchParams.get("mode") === "register" || searchParams.get("lookup") === "1"
      ? "register"
      : initialTab,
  );

  // Login states
  const [identifierInput, setIdentifierInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [managerContact, setManagerContact] = useState<ManagerContact | null>(null);
  const [pending, setPending] = useState(false);

  // Register states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(
    null,
  );

  // Minimalist pre-registration lookup & claim states
  const [showLookupBox, setShowLookupBox] = useState(
    searchParams.get("lookup") === "1",
  );
  const [lookupName, setLookupName] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [matches, setMatches] = useState<MatchCorrespondence[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchCorrespondence | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const registered = searchParams.get("registered") === "1";
  const pendingQuery = searchParams.get("pending") === "1";
  const expired = searchParams.get("expired") === "1";
  const returnTo = searchParams.get("from") || "/dashboard";

  const resolvedIdentifier = useMemo(
    () => resolveLoginIdentifier(identifierInput, "auto"),
    [identifierInput],
  );

  const passwordScore = useMemo(() => {
    if (!regPassword) return 0;
    let score = 0;
    if (regPassword.length >= 6) score += 1;
    if (regPassword.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(regPassword) && /[0-9!@#$%^&*(),.?":{}|<>]/.test(regPassword))
      score += 1;
    if (regPassword.length >= 10 && /[A-Z]/.test(regPassword)) score += 1;
    return score;
  }, [regPassword]);

  const strengthColor =
    passwordScore <= 1
      ? "bg-red-500"
      : passwordScore === 2
        ? "bg-amber-500"
        : "bg-emerald-500";

  const isAlreadyLoggedIn =
    !expired && (isClientSessionActive() || currentUser.status === "authenticated");

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

  const switchTab = (tab: AuthTab, opts?: { openLookup?: boolean }) => {
    setActiveTab(tab);
    setError("");
    setErrorCode("");
    setManagerContact(null);
    if (opts?.openLookup) {
      setPendingConfirmationEmail(null);
      setShowLookupBox(true);
    }
  };

  const handleIdentifierChange = (value: string) => {
    setError("");
    setErrorCode("");
    setManagerContact(null);
    const next = resolveLoginIdentifier(value, "auto");
    setIdentifierInput(next.displayValue);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setErrorCode("");
    setManagerContact(null);
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
        code?: string;
        message?: string;
        manager_contact?: ManagerContact;
      };

      if (!response.ok || !data.authenticated) {
        if (data.code === "ACCOUNT_PENDING_APPROVAL") {
          setErrorCode("ACCOUNT_PENDING_APPROVAL");
          const contact = data.manager_contact;
          const hasContact = Boolean(
            contact && (contact.name || contact.email || contact.phone),
          );
          setManagerContact(hasContact && contact ? contact : null);
        }
        throw new Error(data.message ?? "Não foi possível entrar. Verifique os dados.");
      }

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

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted) return;
    setError("");
    setErrorCode("");
    setManagerContact(null);

    if (regName.trim().length < 2) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!regEmail.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (regPassword.length < 8) {
      setError("A senha deve conter no mínimo 8 caracteres.");
      return;
    }

    const digits = cleanPhone(regPhone);
    const formattedPhone = digits
      ? digits.startsWith("55")
        ? `+${digits}`
        : `+55${digits}`
      : undefined;

    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          phone: formattedPhone,
          password: regPassword,
        }),
      });

      const data = (await response.json()) as {
        registered?: boolean;
        pendingApproval?: boolean;
        authenticated?: boolean;
        autoLoggedIn?: boolean;
        userExists?: boolean;
        matches?: MatchCorrespondence[];
        message?: string;
      };

      if (response.status === 409 && data.pendingApproval) {
        setErrorCode("ACCOUNT_PENDING_APPROVAL");
        setError(
          data.message ||
            "Este e-mail já possui uma solicitação de cadastro aguardando aprovação.",
        );
        return;
      }

      if (
        response.status === 409 &&
        data.userExists &&
        data.matches &&
        data.matches.length > 0
      ) {
        setMatches(data.matches);
        setSelectedMatch(data.matches[0]);
        setIsClaimDialogOpen(true);
        return;
      }

      if (!response.ok || !data.registered) {
        throw new Error(data.message ?? "Não foi possível criar a conta.");
      }

      if (data.authenticated && data.autoLoggedIn) {
        notifyAuthChange("login");
        router.push("/dashboard");
        return;
      }

      setPendingConfirmationEmail(regEmail.trim().toLowerCase());
      setRegPassword("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar a conta. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  };

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!lookupName && !lookupEmail) return;
    setLookupLoading(true);
    setLookupError("");

    try {
      const res = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lookupName.trim(),
          email: lookupEmail.trim(),
        }),
      });
      const data = (await res.json()) as {
        found?: boolean;
        matches?: MatchCorrespondence[];
      };

      if (!res.ok || !data.found || !data.matches || data.matches.length === 0) {
        setLookupError("Nenhuma correspondência encontrada com os dados informados.");
        return;
      }

      setMatches(data.matches);
      setSelectedMatch(data.matches[0]);
      setIsClaimDialogOpen(true);
      setShowLookupBox(false);
    } catch {
      setLookupError("Erro ao consultar cadastro. Tente novamente.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleConfirmClaim = async () => {
    if (!selectedMatch) return;
    setClaiming(true);
    setError("");

    const effectivePassword =
      regPassword.length >= 8
        ? regPassword
        : "RideOn@" + Math.random().toString(36).substring(2, 10);

    try {
      const res = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail.trim() || selectedMatch.masked_email,
          password: effectivePassword,
          user_id: selectedMatch.user_id,
        }),
      });

      const data = (await res.json()) as {
        authenticated?: boolean;
        message?: string;
      };

      if (!res.ok || !data.authenticated) {
        throw new Error(data.message || "Não foi possível confirmar o acesso.");
      }

      setIsClaimDialogOpen(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("rideon_first_login_prompt", "true");
      }
      notifyAuthChange("login");
      router.push("/dashboard?first_login=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar conta.");
      setIsClaimDialogOpen(false);
    } finally {
      setClaiming(false);
    }
  };

  if (isAlreadyLoggedIn) {
    return (
      <AuthLayout
        activeTab={activeTab}
        title="Sessão Ativa"
        copy="Identificamos sua conexão. Redirecionando para a central..."
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
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
            className="mt-6 w-full rounded-xl"
            onClick={() => router.push(returnTo)}
          >
            Acessar Painel Agora
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  const isPendingError = errorCode === "ACCOUNT_PENDING_APPROVAL";

  return (
    <>
      <AuthLayout
        activeTab={activeTab}
        title={`Bem-vindo ao ${brandName}`}
        copy="Monitoramento em tempo real, alertas inteligentes e proteção veicular."
      >
        {/* Clean Mode Separation: Login | Registro */}
        <div className="mb-6 border-b border-white/[0.06] pb-4">
          <div
            role="tablist"
            aria-label="Modo de acesso"
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.06] bg-background/60 p-1"
          >
            {(["login", "register"] as const).map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => switchTab(tab)}
                  className={`relative cursor-pointer rounded-lg py-2 text-xs font-bold tracking-wide transition-colors ${
                    isSelected
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="web-auth-tab-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-lg border border-primary/35 bg-secondary shadow-sm"
                    />
                  )}
                  <span className="relative z-10">
                    {tab === "login" ? "Login" : "Registro"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "login" ? (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              {/* Animated Notices & Blocked Pending Approval Alert */}
              <AnimatePresence mode="popLayout">
                {pendingQuery && !error && (
                  <motion.div
                    key="pending-query-notice"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300"
                  >
                    <Clock className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    <span className="font-semibold leading-relaxed">
                      Cadastro enviado! Sua conta aguarda aprovação do seu gestor ou do administrador master.
                    </span>
                  </motion.div>
                )}

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
                    <span>Conta ativada! Faça login para continuar.</span>
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
                    <span>Sua sessão expirou por inatividade. Entre novamente.</span>
                  </motion.div>
                )}

                {error && isPendingError && (
                  <motion.div
                    key="pending-approval-blocked"
                    role="alert"
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs"
                  >
                    <div className="flex items-start gap-2.5 text-amber-300">
                      <motion.div
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="mt-0.5 shrink-0 text-amber-400"
                      >
                        <Clock className="size-4" />
                      </motion.div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-amber-200">
                          Acesso aguardando aprovação
                        </p>
                        <p className="leading-relaxed text-amber-300/90">{error}</p>
                      </div>
                    </div>

                    {managerContact && (
                      <div className="space-y-1 border-t border-amber-500/20 pt-2.5 text-[11px] text-foreground/90">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                          Contato do gestor responsável
                        </p>
                        {managerContact.name && (
                          <p className="font-semibold text-foreground">
                            {managerContact.name}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {managerContact.email && (
                            <a
                              href={`mailto:${managerContact.email}`}
                              className="inline-flex items-center gap-1 text-amber-200 transition-colors hover:underline"
                            >
                              <Mail className="size-3" />
                              <span>{managerContact.email}</span>
                            </a>
                          )}
                          {managerContact.phone && (
                            <a
                              href={`tel:${managerContact.phone}`}
                              className="inline-flex items-center gap-1 text-amber-200 transition-colors hover:underline"
                            >
                              <Phone className="size-3" />
                              <span>{formatPhone(managerContact.phone)}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {error && !isPendingError && (
                  <motion.div
                    key="error-alert"
                    role="alert"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: [0, -5, 5, -3, 3, 0] }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.38 }}
                    className="flex items-start gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-xs text-primary"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span className="font-semibold leading-relaxed">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Smart Identifier Field */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="login-identifier"
                    className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    E-mail, Placa ou IMEI
                  </label>
                  <AnimatePresence mode="wait">
                    {identifierInput.trim().length > 0 &&
                      resolvedIdentifier.detectedKind !== "unknown" && (
                        <motion.span
                          key={`${resolvedIdentifier.detectedKind}-${resolvedIdentifier.plateStandard ?? ""}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
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

                <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20">
                  {resolvedIdentifier.detectedKind === "plate" ? (
                    <Bike className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  ) : resolvedIdentifier.detectedKind === "imei" ? (
                    <Cpu className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  ) : (
                    <Mail className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  )}
                  <input
                    id="login-identifier"
                    required
                    name="identifier"
                    autoComplete={
                      resolvedIdentifier.detectedKind === "email" ? "email" : "username"
                    }
                    type="text"
                    value={identifierInput}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder="seu@email.com, ABC1D23 ou IMEI"
                    className={`w-full min-w-0 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 ${
                      resolvedIdentifier.detectedKind === "plate" ||
                      resolvedIdentifier.detectedKind === "imei"
                        ? "font-mono tracking-wider"
                        : ""
                    }`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Senha
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20">
                  <LockKeyhole className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  <input
                    id="login-password"
                    required
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setError("");
                      setErrorCode("");
                      setManagerContact(null);
                      setPassword(e.target.value);
                    }}
                    placeholder="Digite sua senha"
                    className="w-full min-w-0 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
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
              <div className="flex items-center justify-between pt-0.5">
                <label className="group flex cursor-pointer items-center gap-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`grid size-4 place-items-center rounded border transition-all ${
                      rememberMe
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/20 bg-secondary/70 group-hover:border-white/35"
                    }`}
                  >
                    {rememberMe && <Check className="size-3 stroke-[3]" />}
                  </span>
                  <span className="select-none">Lembrar neste navegador</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={pending}
                className="w-full gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-[0_0_28px_-8px_rgba(239,37,27,0.55)]"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar na Plataforma</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>

              <div className="space-y-1.5 pt-2 text-center text-xs text-muted-foreground">
                <p>
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchTab("register")}
                    className="cursor-pointer font-bold text-primary hover:underline"
                  >
                    Registre-se
                  </button>
                </p>
                <p>
                  <button
                    type="button"
                    onClick={() => switchTab("register", { openLookup: true })}
                    className="cursor-pointer text-[11px] font-medium text-muted-foreground/80 transition-colors hover:text-foreground hover:underline"
                  >
                    Pré-cadastro pelo gestor? Ativar primeiro acesso
                  </button>
                </p>
              </div>
            </motion.form>
          ) : pendingConfirmationEmail ? (
            /* Registration Pending Approval View */
            <motion.div
              key="pending-confirmation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center space-y-4 py-4 text-center"
            >
              <div className="grid size-14 place-items-center rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-400">
                <Clock className="size-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-foreground">
                  Cadastro aguardando aprovação
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Sua solicitação para{" "}
                  <strong className="text-foreground">{pendingConfirmationEmail}</strong>{" "}
                  foi enviada. O seu respectivo gestor ou o administrador master precisa
                  aprovar sua conta antes do primeiro login.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Status: Pendente de aprovação
              </span>
              <Button
                type="button"
                onClick={() => {
                  setIdentifierInput(pendingConfirmationEmail);
                  setPendingConfirmationEmail(null);
                  switchTab("login");
                }}
                className="w-full rounded-xl py-3 text-xs font-bold uppercase tracking-wider"
              >
                Ir para Login
              </Button>
              <button
                type="button"
                onClick={() => {
                  setPendingConfirmationEmail(null);
                  setRegName("");
                  setRegEmail("");
                  setRegPhone("");
                }}
                className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cadastrar outro e-mail
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="register-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleRegister}
              className="space-y-3.5"
            >
              <AnimatePresence mode="popLayout">
                {error && (
                  <motion.div
                    key="reg-error"
                    role="alert"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                      isPendingError
                        ? "border-amber-500/35 bg-amber-500/10 text-amber-300"
                        : "border-primary/40 bg-primary/10 text-primary"
                    }`}
                  >
                    {isPendingError ? (
                      <Clock className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span className="font-semibold leading-relaxed">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Minimalist Pre-Registered Lookup Drawer */}
              {showLookupBox && (
                <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Consultar pré-cadastro do gestor
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLookupBox(false)}
                      className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={lookupName}
                      onChange={(e) => setLookupName(e.target.value)}
                      className="h-9 rounded-lg border border-white/[0.08] bg-secondary/70 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/70 focus:outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Seu e-mail (opcional)"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      className="h-9 rounded-lg border border-white/[0.08] bg-secondary/70 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/70 focus:outline-none"
                    />
                  </div>
                  {lookupError && (
                    <p className="text-[11px] font-semibold text-red-400">{lookupError}</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLookup}
                    disabled={lookupLoading || (!lookupName && !lookupEmail)}
                    className="h-8 w-full gap-1.5 text-xs font-semibold"
                  >
                    {lookupLoading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Consultando...
                      </>
                    ) : (
                      <>
                        <Search className="size-3.5" />
                        Consultar acesso
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nome Completo
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20">
                  <User className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  <input
                    required
                    name="name"
                    autoComplete="name"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full min-w-0 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  E-mail
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20">
                  <Mail className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  <input
                    required
                    name="email"
                    autoComplete="email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full min-w-0 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Optional Phone */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Celular (opcional)
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20">
                  <Phone className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  <input
                    name="phone"
                    autoComplete="tel"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-8888"
                    className="w-full min-w-0 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Senha (mín. 8 caracteres)
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-secondary/70 px-3.5 transition-all focus-within:border-primary/70 focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20">
                  <LockKeyhole className="size-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  <input
                    required
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Crie uma senha forte"
                    className="w-full min-w-0 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((v) => !v)}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                    aria-label={showRegPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showRegPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {regPassword.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1 rounded-full transition-colors ${
                          step <= passwordScore ? strengthColor : "bg-border/60"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Terms */}
              <label className="flex cursor-pointer items-start gap-2.5 pt-0.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-0.5 size-3.5 rounded border-border bg-secondary accent-primary"
                />
                <span className="leading-snug">
                  Concordo com os Termos de Uso e Política de Privacidade (LGPD).
                </span>
              </label>

              <Button
                type="submit"
                disabled={!accepted || pending}
                className="w-full gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-[0_0_28px_-8px_rgba(239,37,27,0.55)]"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enviando solicitação...</span>
                  </>
                ) : (
                  <>
                    <span>Solicitar Cadastro</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Novas contas passam por aprovação do gestor ou administrador.
              </p>

              <div className="space-y-1.5 pt-1 text-center text-xs text-muted-foreground">
                <p>
                  Já possui conta aprovada?{" "}
                  <button
                    type="button"
                    onClick={() => switchTab("login")}
                    className="cursor-pointer font-bold text-primary hover:underline"
                  >
                    Fazer login
                  </button>
                </p>
                {!showLookupBox && (
                  <p>
                    <button
                      type="button"
                      onClick={() => setShowLookupBox(true)}
                      className="cursor-pointer text-[11px] font-medium text-muted-foreground/80 transition-colors hover:text-foreground hover:underline"
                    >
                      Pré-cadastro pelo gestor? Consultar acesso
                    </button>
                  </p>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </AuthLayout>

      {/* Pre-Registered Claim Verification Modal */}
      {isClaimDialogOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
            <button
              type="button"
              onClick={() => setIsClaimDialogOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <UserCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Cadastro encontrado
                </h3>
                <p className="text-xs text-muted-foreground">
                  Este perfil pré-cadastrado pertence a você?
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-border/80 bg-secondary/40 p-3.5 text-xs">
              {matches.length > 1 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {matches.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => setSelectedMatch(m)}
                      className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                        selectedMatch.user_id === m.user_id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.masked_name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-semibold">{selectedMatch.masked_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail:</span>
                <span className="font-semibold">{selectedMatch.masked_email}</span>
              </div>
              {selectedMatch.masked_phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className="font-semibold">{selectedMatch.masked_phone}</span>
                </div>
              )}
              {selectedMatch.tenant_name && (
                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="size-3 text-primary" />
                    Organização:
                  </span>
                  <span className="font-semibold text-primary">
                    {selectedMatch.tenant_name}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={claiming}
                onClick={() => setIsClaimDialogOpen(false)}
                className="w-full text-xs font-semibold"
              >
                Não sou eu
              </Button>
              <Button
                type="button"
                disabled={claiming}
                onClick={handleConfirmClaim}
                className="w-full text-xs font-bold uppercase tracking-wider"
              >
                {claiming ? "Ativando..." : "Sim, ativar conta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
