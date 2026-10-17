"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BadgeAlert,
  Bell,
  Bike,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Globe,
  HardDrive,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Palette,
  Phone,
  Radio,
  RefreshCw,
  Save,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  User,
  Users,
  Zap,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useTenant } from "@/app/components/tenant-provider";
import { notifyAuthChange, useCurrentUser } from "@/hooks/use-current-user";
import { isMasterAdmin, isManager, isPlatformOrTenantAdmin, type UserRole } from "@/lib/auth";
import { cleanPhone, formatPhone, validatePhone } from "@/lib/phone";
import { cleanDigits, formatCNPJ, validateTaxID } from "@/lib/cnpj";

type TabId = "profile" | "security" | "iot" | "preferences";

interface ProfileData {
  user: {
    id: string | null;
    email: string | null;
    role: UserRole;
    status: string | null;
    created_at: string | null;
  };
  rider: {
    id: string | null;
    user_id: string | null;
    name: string;
    phone: string;
    date_of_birth: string | null;
    status: string;
    created_at: string | null;
  } | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { tenant } = useTenant();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [cnpjInput, setCnpjInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Security & Session State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [antiTheftMode, setAntiTheftMode] = useState(true);
  const [batteryAlert, setBatteryAlert] = useState(true);

  // Preferences State
  const [ignitionAlerts, setIgnitionAlerts] = useState(true);
  const [speedLimitAlert, setSpeedLimitAlert] = useState(true);
  const [maxSpeedKmH, setMaxSpeedKmH] = useState(110);
  const [speedUnit, setSpeedUnit] = useState<"kmh" | "mph">("kmh");
  const [prefSavedMessage, setPrefSavedMessage] = useState<string | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAntiTheft = localStorage.getItem("rideon_antitheft");
      if (storedAntiTheft !== null) setAntiTheftMode(storedAntiTheft === "1");

      const storedSpeed = localStorage.getItem("rideon_max_speed");
      if (storedSpeed) setMaxSpeedKmH(Number(storedSpeed));

      const storedUnit = localStorage.getItem("rideon_speed_unit");
      if (storedUnit === "mph" || storedUnit === "kmh") setSpeedUnit(storedUnit);

      // Check URL hash on initial load
      if (window.location.hash === "#seguranca" || window.location.hash === "#security") {
        setActiveTab("security");
      } else if (window.location.hash === "#iot" || window.location.hash === "#hardware") {
        setActiveTab("iot");
      } else if (window.location.hash === "#preferencias" || window.location.hash === "#preferences") {
        setActiveTab("preferences");
      }
    }
  }, []);

  // Fetch full profile data from /api/profile
  const loadProfile = async () => {
    setProfileLoading(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login?expired=1");
          return;
        }
        throw new Error("Não foi possível carregar os dados cadastrais.");
      }

      const data = (await res.json()) as ProfileData;
      setProfileData(data);

      if (data.rider) {
        setFullName(data.rider.name || "");
        setPhoneInput(data.rider.phone ? formatPhone(data.rider.phone) : "");
        if (data.rider.date_of_birth) {
          const rawDate = data.rider.date_of_birth.split("T")[0];
          setDobInput(rawDate);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setSaveError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser.status === "authenticated") {
      void loadProfile();
    }
  }, [currentUser.status]);

  // Copy to clipboard helper
  const handleCopy = (text: string, keyName: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Phone input formatting
  const handlePhoneChange = (val: string) => {
    const formatted = formatPhone(val);
    setPhoneInput(formatted);
  };

  // Phone validation status
  const phoneValidation = phoneInput ? validatePhone(phoneInput) : null;

  // CNPJ input formatting
  const handleCnpjChange = (val: string) => {
    const formatted = formatCNPJ(val);
    setCnpjInput(formatted);
  };
  const cnpjValidation = cnpjInput ? validateTaxID(cnpjInput) : null;

  // Save Cadastral Data
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    // Validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setSaveError("Informe seu nome completo (mínimo de 2 caracteres).");
      setIsSaving(false);
      return;
    }

    if (!phoneInput) {
      setSaveError("Informe seu número de telefone ou celular.");
      setIsSaving(false);
      return;
    }

    const phoneCheck = validatePhone(phoneInput);
    if (!phoneCheck.isValid) {
      setSaveError(phoneCheck.message || "Número de telefone inválido.");
      setIsSaving(false);
      return;
    }

    // If rider doesn't exist yet, date of birth is required
    const isNewRider = !profileData?.rider;
    if (isNewRider && !dobInput) {
      setSaveError("Informe sua data de nascimento para criar seu perfil de piloto.");
      setIsSaving(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: fullName.trim(),
        phone: phoneInput,
      };

      if (dobInput) {
        payload.date_of_birth = dobInput;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          (json && typeof json === "object" && json.message) ||
            "Falha ao salvar dados cadastrais.",
        );
      }

      setSaveSuccess(
        (json && typeof json === "object" && json.message) ||
          "Dados cadastrais atualizados com sucesso!",
      );

      // Reload profile
      await loadProfile();
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar dados.";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rideon_antitheft", antiTheftMode ? "1" : "0");
      localStorage.setItem("rideon_max_speed", String(maxSpeedKmH));
      localStorage.setItem("rideon_speed_unit", speedUnit);
      setPrefSavedMessage("Preferências do sistema gravadas com sucesso neste dispositivo.");
      setTimeout(() => setPrefSavedMessage(null), 3500);
    }
  };

  const user = currentUser.status === "authenticated" ? currentUser.user : null;
  const role = user?.role || "rider";
  const isMaster = isMasterAdmin(role);
  const isMgr = isManager(role);
  const isAdminOrMgr = isPlatformOrTenantAdmin(role);

  const email = user?.email || "piloto@rideon.com";
  const userInitials = (fullName || email.split("@")[0])
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 py-2">
        {/* ========================================================================= */}
        {/* HERO HEADER & TITLE                                                       */}
        {/* ========================================================================= */}
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-secondary/30 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary border border-primary/20">
                  <ShieldCheck className="size-3.5" />
                  Sessão Autenticada
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    isMaster
                      ? "bg-primary text-white shadow-sm shadow-primary/30"
                      : isMgr
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-secondary text-primary border border-primary/30"
                  }`}
                >
                  {isMaster ? "Master Admin" : isMgr ? "Gestor de Frota" : "Piloto RideOn"}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RBAC em Tempo Real
                </span>
              </div>

              <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
                Configurações da Conta
              </h1>

              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Gerencie seus dados cadastrais, credenciais de acesso, parâmetros de segurança,
                regras de RBAC e especificações da arquitetura IoT RideOn.
              </p>
            </div>

            {/* Quick Action Tools */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void loadProfile()}
                disabled={profileLoading}
                className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground backdrop-blur-md transition-all hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50 cursor-pointer"
                title="Recarregar dados do servidor"
              >
                <RefreshCw className={`size-3.5 ${profileLoading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  notifyAuthChange("logout");
                  void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
                    window.location.href = "/login";
                  });
                }}
                className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 backdrop-blur-md transition-all hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* TABS NAVIGATION                                                           */}
        {/* ========================================================================= */}
        <div className="flex border-b border-border/80 pb-px overflow-x-auto no-scrollbar gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`group relative flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <User className="size-4" />
            <span>Perfil & Cadastro</span>
            {activeTab === "profile" && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 rounded-2xl border border-primary/40 -z-10"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`group relative flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <Shield className="size-4" />
            <span>Segurança & RBAC</span>
            {activeTab === "security" && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 rounded-2xl border border-primary/40 -z-10"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("iot")}
            className={`group relative flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "iot"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <Radio className="size-4" />
            <span>Hardware IoT & Broker</span>
            {activeTab === "iot" && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 rounded-2xl border border-primary/40 -z-10"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`group relative flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "preferences"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <Bell className="size-4" />
            <span>Preferências</span>
            {activeTab === "preferences" && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 rounded-2xl border border-primary/40 -z-10"
              />
            )}
          </button>
        </div>

        {/* Global Feedback Banners */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-400 shadow-lg shadow-emerald-500/10"
            >
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
              <span>{saveSuccess}</span>
            </motion.div>
          )}

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400 shadow-lg shadow-red-500/10"
            >
              <AlertCircle className="size-5 shrink-0 text-red-400" />
              <span>{saveError}</span>
            </motion.div>
          )}

          {prefSavedMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs font-bold text-primary shadow-lg shadow-primary/10"
            >
              <Sparkles className="size-5 shrink-0 text-primary" />
              <span>{prefSavedMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* TAB 1: PERFIL & DADOS CADASTRAIS                                          */}
        {/* ========================================================================= */}
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Identity Card Overview */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-rose-600 font-black text-xl text-white shadow-lg shadow-primary/30 ring-2 ring-primary/20">
                    {userInitials || "RO"}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
                        {fullName || email.split("@")[0]}
                      </h2>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                        Ativo
                      </span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {profileData?.rider
                        ? "Perfil de Piloto vinculado e registrado na API."
                        : "Conta de usuário ativa (perfil de piloto aguardando dados)."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-secondary/50 p-3.5 sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Papel no Sistema (RBAC)
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-primary">
                    {isMaster ? "Master Admin" : isMgr ? "Gestor de Frota" : "Piloto / Rider"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Tenant: {tenant.branding?.brand_name || tenant.trade_name || "RideOn Default"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cadastral Form */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                    Edição de Dados Cadastrais
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Edite as informações cadastrais vinculadas ao seu perfil de piloto e conta.
                  </p>
                </div>
                <span className="rounded-lg bg-primary/10 px-3 py-1 text-[10px] font-black uppercase text-primary border border-primary/20">
                  PATCH /api/v1/riders/:id
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Nome Completo */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <User className="size-3.5 text-primary" />
                      <span>Nome Completo</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Carlos Alberto da Silva"
                      required
                      className="w-full rounded-xl border border-border/80 bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Nome oficial utilizado nos certificados, histórico e relatórios de telemetria.
                    </p>
                  </div>

                  {/* E-mail (Read-only / Authenticated) */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-primary" />
                        <span>E-mail da Conta</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">AUTENTICADO</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-sm font-mono text-muted-foreground cursor-not-allowed opacity-80"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      O e-mail é a chave de login do token JWT. Para alterá-lo, contate o administrador.
                    </p>
                  </div>

                  {/* Telefone / WhatsApp com validação dinâmica */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-primary" />
                        <span>Telefone / WhatsApp</span>
                        <span className="text-red-500">*</span>
                      </div>
                      {phoneValidation && (
                        <span
                          className={`text-[10px] font-bold ${
                            phoneValidation.isValid ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {phoneValidation.isValid ? "✓ Válido" : phoneValidation.type}
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(11) 99999-8888"
                      required
                      className={`w-full rounded-xl border px-4 py-3 text-sm text-foreground focus:bg-background focus:outline-none focus:ring-2 transition-all ${
                        phoneValidation && !phoneValidation.isValid && phoneInput.length > 3
                          ? "border-amber-500/60 bg-amber-500/5 focus:border-amber-500 focus:ring-amber-500/20"
                          : "border-border/80 bg-secondary/40 focus:border-primary focus:ring-primary/20"
                      }`}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Utilizado para alertas de emergência, disparos de anti-furto e notificações.
                    </p>
                  </div>

                  {/* Data de Nascimento */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Clock className="size-3.5 text-primary" />
                      <span>Data de Nascimento</span>
                      {!profileData?.rider && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={dobInput}
                      onChange={(e) => setDobInput(e.target.value)}
                      disabled={!!profileData?.rider?.date_of_birth}
                      className={`w-full rounded-xl border border-border/80 px-4 py-3 text-sm text-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                        profileData?.rider?.date_of_birth
                          ? "bg-secondary/20 font-mono text-muted-foreground cursor-not-allowed opacity-80"
                          : "bg-secondary/40 focus:border-primary"
                      }`}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {profileData?.rider?.date_of_birth
                        ? "Data de nascimento registrada no perfil de piloto (RFC3339 imutável após criação)."
                        : "Obrigatório para criação do perfil inicial de piloto conforme a API."}
                    </p>
                  </div>

                  {/* Documento / CNPJ (Opcional para Gestores e Empresas) */}
                  {isAdminOrMgr && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-primary" />
                          <span>CNPJ da Frota / Concessionária (Opcional)</span>
                        </div>
                        {cnpjValidation && (
                          <span
                            className={`text-[10px] font-bold ${
                              cnpjValidation.isValid ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {cnpjValidation.isValid ? "✓ CNPJ Válido" : "Inválido"}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={cnpjInput}
                        onChange={(e) => handleCnpjChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="w-full rounded-xl border border-border/80 bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Identificação fiscal da pessoa jurídica vinculada ao Tenant.
                      </p>
                    </div>
                  )}
                </div>

                {/* Form Footer Action */}
                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end border-t border-border/60">
                  <button
                    type="submit"
                    disabled={isSaving || profileLoading}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Gravando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        <span>Salvar Dados Cadastrais</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SEGURANÇA, SESSÃO & RBAC                                           */}
        {/* ========================================================================= */}
        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* RBAC Info Card */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                    Modelo de Segurança e Controle de Acesso (RBAC)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Visão detalhada do seu nível de autorização conforme documentação oficial da API.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Papel Atual Atribuído
                    </span>
                    <span className="rounded bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-xs font-black uppercase">
                      {role}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-semibold">
                    {isMaster
                      ? "Acesso Total à Plataforma (Master Admin)"
                      : isMgr
                        ? "Gestão de Carteira e Frota (Tenant Manager)"
                        : "Piloto Particular (Rider)"}
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {isMaster
                      ? "Permite provisionar gerentes, hardware IoT, visualizar todas as telemetrias e administrar marcas."
                      : isMgr
                        ? "Permite gerenciar clientes, veículos da carteira, equipamentos GPS associados e configurações de marca."
                        : "Permite gerenciar seu veículo pessoal, traçar rotas e acompanhar telemetria em tempo real."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Validação em Tempo Real
                    </span>
                    <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-xs font-black uppercase">
                      MongoDB Live
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-semibold">
                    Revogação Instantânea de Acesso
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    O middleware da API (<code className="font-mono text-primary">RequireRole</code>)
                    sempre consulta a coleção de usuários no MongoDB. Caso seu papel seja promovido
                    ou alterado, o efeito é imediato sem necessidade de esperar o token expirar.
                  </p>
                </div>
              </div>
            </div>

            {/* Identifiers & Token Lifecycles */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <h3 className="text-lg font-black uppercase tracking-tight text-foreground border-b border-border/60 pb-4">
                Identificadores da Conta & Sessão JWT
              </h3>

              <div className="mt-6 space-y-4">
                {/* User UUID */}
                <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      User ID (UUID v4)
                    </span>
                    <p className="font-mono text-xs font-bold text-foreground break-all">
                      {user?.id || profileData?.user.id || "Não disponível"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(user?.id || profileData?.user.id || "", "userid")
                    }
                    className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer"
                  >
                    <Copy className="size-3.5" />
                    <span>{copiedKey === "userid" ? "Copiado!" : "Copiar ID"}</span>
                  </button>
                </div>

                {/* Rider UUID */}
                {profileData?.rider && (
                  <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Rider Profile ID (UUID v4)
                      </span>
                      <p className="font-mono text-xs font-bold text-foreground break-all">
                        {profileData.rider.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(profileData.rider?.id || "", "riderid")
                      }
                      className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer"
                    >
                      <Copy className="size-3.5" />
                      <span>{copiedKey === "riderid" ? "Copiado!" : "Copiar ID"}</span>
                    </button>
                  </div>
                )}

                {/* JWT Refresh Token Strategy */}
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 text-xs leading-relaxed text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <KeyRound className="size-4 text-primary" />
                    <span>Estratégia de Tokens e Renovação Transparente</span>
                  </div>
                  <p>
                    A RideOn utiliza uma arquitetura de tokens com dupla camada:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong className="text-foreground">Access Token (JWT):</strong> Curta duração
                      (15 minutos), assinado digitalmente, mantido em cookie HTTP-Only seguro.
                    </li>
                    <li>
                      <strong className="text-foreground">Refresh Token:</strong> Longa duração
                      (7 dias), renovado transparentemente pelo Next.js Proxy em caso de expiração do JWT.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Anti-Theft Guard */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-5 text-primary" />
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                      Modo Anti-Furto & Alerta 24/7
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando ativo, qualquer movimento detectado sem a ignição ligada dispara um alerta sonoro e notificação push.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !antiTheftMode;
                    setAntiTheftMode(nextVal);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("rideon_antitheft", nextVal ? "1" : "0");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    antiTheftMode ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      antiTheftMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HARDWARE IOT & PROTOCOLOS (README_ADMIN.MD)                         */}
        {/* ========================================================================= */}
        {activeTab === "iot" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Broker & Ingestion Architecture */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Server className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                    Arquitetura do Broker IoT e Ingestão de Pacotes
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Acoplamento entre <code className="font-mono text-primary">rideon-broker</code> e a API REST.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Porta de Escuta TCP
                  </span>
                  <p className="text-xl font-black font-mono text-primary">:5023</p>
                  <p className="text-[11px] text-muted-foreground">
                    Recepção de telemetria binária bruta de rastreadores veiculares (ex: GT06, Teltonika).
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Identificador Canônico
                  </span>
                  <p className="text-xl font-black font-mono text-foreground">IMEI / Serial</p>
                  <p className="text-[11px] text-muted-foreground">
                    O campo <code className="font-mono text-primary">serial_number</code> na API indexa os pacotes no MongoDB.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Transmissão em Tempo Real
                  </span>
                  <p className="text-xl font-black font-mono text-emerald-400">WebSocket /ws</p>
                  <p className="text-[11px] text-muted-foreground">
                    Streaming de coordenadas direto para a interface do mapa via eventos push.
                  </p>
                </div>
              </div>
            </div>

            {/* Protocol Support Table (from README_ADMIN.md §5) */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                    Protocolos e Hardwares Suportados
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Conforme especificação da tabela do Guia do Administrador (README_ADMIN.md §5).
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/20">
                  7 Protocolos Ativos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 text-[10px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">Protocolo</th>
                      <th className="py-3 px-4">Identificador</th>
                      <th className="py-3 px-4">Canal / Mecanismo</th>
                      <th className="py-3 px-4">Cenário de Uso Recomendado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    <tr className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground font-sans">GT06</td>
                      <td className="py-3 px-4 text-primary">gt06</td>
                      <td className="py-3 px-4 text-muted-foreground">TCP :5023</td>
                      <td className="py-3 px-4 text-foreground font-sans">
                        Rastreadores veiculares comerciais populares (Concox, Coban, Accurate, J16 4G).
                      </td>
                    </tr>
                    <tr className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground font-sans">Teltonika</td>
                      <td className="py-3 px-4 text-primary">teltonika</td>
                      <td className="py-3 px-4 text-muted-foreground">Codec 8 / 8E</td>
                      <td className="py-3 px-4 text-foreground font-sans">
                        Rastreadores industriais e telemetria avançada de frotas pesadas.
                      </td>
                    </tr>
                    <tr className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground font-sans">Queclink</td>
                      <td className="py-3 px-4 text-primary">queclink</td>
                      <td className="py-3 px-4 text-muted-foreground">@Track</td>
                      <td className="py-3 px-4 text-foreground font-sans">
                        Módulos de alta precisão e dispositivos autônomos com bateria de longa duração.
                      </td>
                    </tr>
                    <tr className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground font-sans">MQTT</td>
                      <td className="py-3 px-4 text-primary">mqtt</td>
                      <td className="py-3 px-4 text-muted-foreground">Broker MQTT</td>
                      <td className="py-3 px-4 text-foreground font-sans">
                        Dispositivos IoT customizados baseados em ESP32 ou Raspberry Pi.
                      </td>
                    </tr>
                    <tr className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground font-sans">HTTP Gateway</td>
                      <td className="py-3 px-4 text-primary">http</td>
                      <td className="py-3 px-4 text-muted-foreground">POST /api/v1/telemetry</td>
                      <td className="py-3 px-4 text-foreground font-sans">
                        Simuladores de bancada, webhooks ou gateways REST diretos.
                      </td>
                    </tr>
                    <tr className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground font-sans">Smartphone</td>
                      <td className="py-3 px-4 text-primary">smartphone</td>
                      <td className="py-3 px-4 text-muted-foreground">GPS Nativo / App</td>
                      <td className="py-3 px-4 text-foreground font-sans">
                        App móvel RideOn funcionando como rastreador por software.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Link to Hardware Inventory for Admins */}
            {isAdminOrMgr && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
                <div className="space-y-1">
                  <h4 className="text-base font-black uppercase text-foreground">
                    Gerenciamento Avançado de Equipamentos
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Acesse o painel completo de provisionamento, ativação e vinculação de rastreadores a veículos.
                  </p>
                </div>
                <Link
                  href="/admin/devices"
                  className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90"
                >
                  <Cpu className="size-4" />
                  <span>Inventário de Dispositivos</span>
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PREFERÊNCIAS & NOTIFICAÇÕES                                        */}
        {/* ========================================================================= */}
        {activeTab === "preferences" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6">
              <h3 className="text-lg font-black uppercase tracking-tight text-foreground border-b border-border/60 pb-4">
                Alertas de Telemetria e Notificações
              </h3>

              <div className="space-y-4">
                {/* Alerta de Ignição */}
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/30 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                      Notificação de Ignição
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Receber alerta push instantâneo sempre que a ignição da moto for acionada ou desligada.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIgnitionAlerts(!ignitionAlerts)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      ignitionAlerts ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        ignitionAlerts ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Alerta de Bateria Fraca */}
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/30 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                      Alerta de Bateria Fraca do Rastreador
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avisar quando a tensão da bateria interna do hardware cair abaixo de 20%.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBatteryAlert(!batteryAlert)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      batteryAlert ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        batteryAlert ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Limite de Velocidade Slider */}
                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                        Limite de Excesso de Velocidade
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dispara um alerta visual e sonoro quando o veículo ultrapassar a velocidade configurada.
                      </p>
                    </div>
                    <span className="font-mono text-base font-black text-primary">
                      {maxSpeedKmH} {speedUnit === "kmh" ? "km/h" : "mph"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="60"
                    max="180"
                    step="5"
                    value={maxSpeedKmH}
                    onChange={(e) => setMaxSpeedKmH(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>60 km/h</span>
                    <span>120 km/h</span>
                    <span>180 km/h</span>
                  </div>
                </div>

                {/* Unidades de Medida */}
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/30 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                      Unidade de Medida de Velocidade
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Escolha entre Quilômetros por hora (km/h) ou Milhas por hora (mph).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setSpeedUnit("kmh")}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        speedUnit === "kmh"
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      km/h
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeedUnit("mph")}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        speedUnit === "mph"
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      mph
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Preferências */}
              <div className="flex justify-end pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 cursor-pointer"
                >
                  <Save className="size-4" />
                  <span>Salvar Preferências</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}
