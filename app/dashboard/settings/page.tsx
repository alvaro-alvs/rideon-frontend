"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Bell,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useTenant } from "@/app/components/tenant-provider";
import { notifyAuthChange, useCurrentUser } from "@/hooks/use-current-user";
import { isMasterAdmin, isManager, isPlatformOrTenantAdmin, type UserRole } from "@/lib/auth";
import { cleanPhone, formatPhone, validatePhone } from "@/lib/phone";
import { cleanDigits, formatCNPJ, validateTaxID } from "@/lib/cnpj";
import {
  enableNotificationsWithAppConsent,
  getBrowserNotificationDiagnostics,
  sendBrowserNotification,
  subscribeToNotificationPermission,
} from "@/lib/notifications/browser";
import {
  initAudioOnUserGesture,
  isSoundEnabled,
  setSoundEnabled,
  testNotificationSound,
} from "@/lib/notifications/sound";

type TabId = "profile" | "security" | "preferences";

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
  const [antiTheftMode, setAntiTheftMode] = useState(true);
  const [batteryAlert, setBatteryAlert] = useState(true);

  // Preferences State
  const [ignitionAlerts, setIgnitionAlerts] = useState(true);
  const [speedLimitAlert, setSpeedLimitAlert] = useState(true);
  const [adminAllVehiclesNotif, setAdminAllVehiclesNotif] = useState(false);
  const [maxSpeedKmH, setMaxSpeedKmH] = useState(110);
  const [speedUnit, setSpeedUnit] = useState<"kmh" | "mph">("kmh");
  const [prefSavedMessage, setPrefSavedMessage] = useState<string | null>(null);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(() => isSoundEnabled());
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | "unsupported">(() =>
    getBrowserNotificationDiagnostics().permission,
  );
  const [browserSecureCtx] = useState(() =>
    typeof window === "undefined" ? true : Boolean(window.isSecureContext),
  );

  useEffect(() => {
    return subscribeToNotificationPermission((perm) => {
      setBrowserPerm(perm);
    });
  }, []);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAntiTheft = localStorage.getItem("rideon_antitheft");
      if (storedAntiTheft !== null) setAntiTheftMode(storedAntiTheft === "1");

      const storedSpeed = localStorage.getItem("rideon_max_speed");
      if (storedSpeed) setMaxSpeedKmH(Number(storedSpeed));

      const storedAllVehicles = localStorage.getItem("rideon_admin_all_vehicles_notif");
      if (storedAllVehicles !== null) setAdminAllVehiclesNotif(storedAllVehicles === "true");

      const storedUnit = localStorage.getItem("rideon_speed_unit");
      if (storedUnit === "mph" || storedUnit === "kmh") setSpeedUnit(storedUnit);

      // Check URL hash on initial load
      if (window.location.hash === "#seguranca" || window.location.hash === "#security") {
        setActiveTab("security");
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
      <div className="w-full space-y-4">
        {/* Global Feedback Banners */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400"
            >
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>{saveSuccess}</span>
            </motion.div>
          )}

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400"
            >
              <AlertCircle className="size-4 shrink-0 text-red-400" />
              <span>{saveError}</span>
            </motion.div>
          )}

          {prefSavedMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary"
            >
              <Sparkles className="size-4 shrink-0 text-primary" />
              <span>{prefSavedMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unified Single Card (Expanded, No Harsh Dividers) */}
        <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6">
          {/* Header */}
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="size-3.5" />
                  Sessão Autenticada
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    isMaster
                      ? "bg-primary/15 text-primary"
                      : isMgr
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isMaster ? "Master Admin" : isMgr ? "Gestor de Frota" : "Piloto RideOn"}
                </span>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Configurações da Conta
              </h1>

              <p className="max-w-2xl text-sm text-muted-foreground">
                Gerencie seus dados cadastrais, preferências de segurança e notificações da sua conta.
              </p>
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => void loadProfile()}
                disabled={profileLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
                title="Recarregar dados do servidor"
              >
                <RefreshCw className={`size-3.5 ${profileLoading ? "animate-spin text-primary" : ""}`} />
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
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </header>

          {/* Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-background/50 p-1 w-fit overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="size-3.5" />
              <span>Perfil & Cadastro</span>
              {activeTab === "profile" && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-lg border border-primary/40 -z-10"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="size-3.5" />
              <span>Segurança</span>
              {activeTab === "security" && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-lg border border-primary/40 -z-10"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preferences")}
              className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "preferences"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bell className="size-3.5" />
              <span>Preferências</span>
              {activeTab === "preferences" && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-lg border border-primary/40 -z-10"
                />
              )}
            </button>
          </div>

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
            <div className="rounded-xl bg-background/40 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-rose-600 font-black text-lg text-white shadow-md shadow-primary/25">
                    {userInitials || "RO"}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-foreground">
                        {fullName || email.split("@")[0]}
                      </h2>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Ativo
                      </span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {profileData?.rider
                        ? "Perfil de piloto ativo."
                        : "Conta de usuário ativa (complete seus dados cadastrais abaixo)."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 rounded-xl bg-secondary/50 px-4 py-3 sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tipo de Conta
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {isMaster ? "Master Admin" : isMgr ? "Gestor de Frota" : "Piloto / Rider"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Organização: {tenant.branding?.brand_name || tenant.trade_name || "RideOn Default"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cadastral Form */}
            <div className="rounded-xl bg-background/40 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b border-border/50 pb-3.5">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Edição de Dados Cadastrais
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Edite as informações cadastrais vinculadas ao seu perfil de piloto e conta.
                  </p>
                </div>
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
                      O e-mail é utilizado para acesso à sua conta. Para alterá-lo, contate o administrador.
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
                        ? "Data de nascimento registrada no perfil de piloto (não pode ser alterada após o cadastro)."
                        : "Obrigatório para completar seu cadastro de piloto."}
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
                        Identificação fiscal da pessoa jurídica vinculada à frota.
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
        {/* TAB 2: SEGURANÇA                                                          */}
        {/* ========================================================================= */}
        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Anti-Theft Guard */}
            <div className="rounded-xl bg-background/40 p-5 sm:p-6">
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
        {/* TAB 3: PREFERÊNCIAS & NOTIFICAÇÕES                                        */}
        {/* ========================================================================= */}
        {activeTab === "preferences" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="rounded-xl bg-background/40 p-5 sm:p-6 space-y-6">
              <h3 className="font-display text-base font-bold text-foreground border-b border-border/50 pb-3.5">
                Alertas de Telemetria e Notificações
              </h3>

              <div className="space-y-4">
                {/* Notificações do Navegador (após permissão na aplicação) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BellRing className="size-4 text-primary shrink-0" />
                      <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                        Notificações do Navegador
                      </p>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          browserPerm === "granted"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : browserPerm === "denied"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-zinc-500/20 text-zinc-300"
                        }`}
                      >
                        {browserPerm === "granted"
                          ? "Ativas"
                          : browserPerm === "denied"
                            ? "Bloqueadas pelo Navegador"
                            : browserPerm === "unsupported"
                              ? "Indisponível"
                              : "Aguardando Permissão"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {browserPerm === "granted"
                        ? "Alertas nativos do navegador e avisos em segundo plano estão habilitados."
                        : browserPerm === "denied"
                          ? browserSecureCtx
                            ? "O navegador bloqueou as notificações por padrão. Clique no ícone de cadeado/configurações na barra de endereço para permitir Notificações e depois clique em Verificar."
                            : "Notificações nativas exigem conexão segura (HTTPS ou localhost). Os alertas sonoros no app continuam ativos."
                          : "Autorize na aplicação para ativar os sons e disparar o pedido de permissão do navegador."}
                    </p>
                  </div>

                  {browserPerm !== "granted" && browserPerm !== "unsupported" && (
                    <button
                      type="button"
                      onClick={async () => {
                        initAudioOnUserGesture();
                        setSoundEnabled(true);
                        setSoundAlertsEnabled(true);
                        const { browserPermission } = await enableNotificationsWithAppConsent();
                        setBrowserPerm(browserPermission);
                        testNotificationSound("default");
                        if (browserPermission === "granted") {
                          await sendBrowserNotification("RideOn • Notificações Ativadas", {
                            body: "Alertas do navegador e sons reforçados configurados com sucesso.",
                          });
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all shrink-0"
                    >
                      <Sparkles className="size-3.5" />
                      <span>{browserPerm === "denied" ? "Verificar Permissão" : "Permitir Notificações"}</span>
                    </button>
                  )}
                </div>

                {/* Sons de Alerta Reforçados */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-secondary/30 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {soundAlertsEnabled ? (
                        <Volume2 className="size-4 text-primary shrink-0" />
                      ) : (
                        <VolumeX className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                        Alertas Sonoros no Aplicativo
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reproduz avisos sonoros distintos para ignição, telemetria e alertas críticos, mesmo se pop-ups estiverem bloqueados.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSoundEnabled(true);
                        setSoundAlertsEnabled(true);
                        testNotificationSound("urgent");
                      }}
                      className="rounded-xl border border-border bg-background/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition-colors"
                    >
                      Testar Som
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        initAudioOnUserGesture();
                        const next = !soundAlertsEnabled;
                        setSoundAlertsEnabled(next);
                        setSoundEnabled(next);
                        if (next) {
                          testNotificationSound("default");
                        }
                      }}
                      aria-label="Alternar alertas sonoros"
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        soundAlertsEnabled ? "bg-primary" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          soundAlertsEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {/* Opção para Admins: Notificações de Todos os Veículos (Desabilitada por padrão) */}
                {isPlatformOrTenantAdmin(profileData?.user?.role || "rider") && (
                  <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                          Notificações de Toda a Frota
                        </p>
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Admin
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Por padrão desabilitado. Habilite para acompanhar alertas e notificações de todos os veículos da organização.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !adminAllVehiclesNotif;
                        setAdminAllVehiclesNotif(next);
                        if (typeof window !== "undefined") {
                          localStorage.setItem("rideon_admin_all_vehicles_notif", String(next));
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        adminAllVehiclesNotif ? "bg-primary" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          adminAllVehiclesNotif ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}

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
      </div>
    </DashboardShell>
  );
}
