"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Bike,
  Brain,
  Building2,
  CheckCircle2,
  Cpu,
  Gauge,
  Globe,
  ImageIcon,
  Layers,
  Loader2,
  Palette,
  Plus,
  Radio,
  Save,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
  Webhook,
  X,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";
import { formatCNPJ, validateTaxID } from "@/lib/cnpj";
import { AVAILABLE_MODULES, type TenantItem, type TenantStats } from "@/lib/types/tenant";

const PRESET_COLORS = [
  { name: "RideOn Red", hex: "#EF251B" },
  { name: "Nitro Orange", hex: "#FF6600" },
  { name: "Electric Blue", hex: "#2563EB" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Deep Violet", hex: "#8B5CF6" },
  { name: "Cyber Amber", hex: "#F59E0B" },
  { name: "Carbon Dark", hex: "#18181B" },
];

export default function OrganizationsAdminPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, TenantStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal: Theme / Branding
  const [themeModalTenant, setThemeModalTenant] = useState<TenantItem | null>(null);
  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#EF251B");
  const [secondaryColor, setSecondaryColor] = useState("#1D1D1D");
  const [accentColor, setAccentColor] = useState("#FF3B30");
  const [logoUrl, setLogoUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal: Quotas & Feature Flags
  const [settingsModalTenant, setSettingsModalTenant] = useState<TenantItem | null>(null);
  const [deviceLimit, setDeviceLimit] = useState(50);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Modal: Domains & DNS
  const [domainsModalTenant, setDomainsModalTenant] = useState<TenantItem | null>(null);

  // Modal: Create Tenant
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newLegalName, setNewLegalName] = useState("");
  const [newTradeName, setNewTradeName] = useState("");
  const [newTaxID, setNewTaxID] = useState("");
  const [newPrimaryColor, setNewPrimaryColor] = useState("#EF251B");
  const [newDeviceLimit, setNewDeviceLimit] = useState(100);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const [taxIDTouched, setTaxIDTouched] = useState(false);

  const taxIDValidation = validateTaxID(newTaxID);

  const handleTaxIDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setNewTaxID(formatted);
    if (!taxIDTouched) setTaxIDTouched(true);
    if (createModalError) setCreateModalError(null);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateModalError(null);
    setTaxIDTouched(false);
  };

  // Role Protection
  useEffect(() => {
    if (currentUser.status === "loading") return;
    if (currentUser.status === "unauthenticated") {
      router.replace(`/login?expired=1&from=${encodeURIComponent("/admin/tenants")}`);
      return;
    }
    if (currentUser.status === "authenticated" && !isPlatformOrTenantAdmin(currentUser.user.role)) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const fetchTenantStats = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/stats`);
      if (res.ok) {
        const stats: TenantStats = await res.json();
        setStatsMap((prev) => ({ ...prev, [tenantId]: stats }));
      }
    } catch {
      // Ignore stats fetch failure
    }
  }, []);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tenants");
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.location.replace("/login?expired=1&from=" + encodeURIComponent("/admin/tenants"));
        }
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const list: TenantItem[] = Array.isArray(data) ? data : [];
        setTenants(list);
        list.forEach((t) => void fetchTenantStats(t.id));
      }
    } catch {
      // Falha transitória
    } finally {
      setLoading(false);
    }
  }, [fetchTenantStats]);

  useEffect(() => {
    if (currentUser.status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadTenants();
    }
  }, [currentUser, loadTenants]);

  // Open Theme Modal
  const openThemeModal = (tenant: TenantItem) => {
    setThemeModalTenant(tenant);
    setBrandName(tenant.branding?.brand_name || tenant.trade_name || "");
    setPrimaryColor(tenant.branding?.primary_color || "#EF251B");
    setSecondaryColor(tenant.branding?.secondary_color || "#1D1D1D");
    setAccentColor(tenant.branding?.accent_color || "#FF3B30");
    setLogoUrl(tenant.branding?.logo_url || "");
    setSupportEmail(tenant.branding?.support_email || "");
    setCustomCss(tenant.branding?.custom_css || "");
    setBrandingError(null);
  };

  const closeThemeModal = () => {
    setThemeModalTenant(null);
    setBrandingError(null);
  };

  // Handle local file selection for logo
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setBrandingError("O arquivo de imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
        setBrandingError(null);
      }
    };
    reader.onerror = () => {
      setBrandingError("Erro ao ler o arquivo selecionado da sua máquina.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeModalTenant) return;

    setSavingBranding(true);
    setBrandingError(null);

    try {
      const res = await fetch(`/api/admin/tenants/${themeModalTenant.id}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          logo_url: logoUrl,
          support_email: supportEmail,
          custom_css: customCss,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Erro ao salvar alterações visuais.");
      }

      const updated: TenantItem = await res.json();
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      closeThemeModal();
      setFeedback({
        type: "success",
        message: `Identidade visual da organização "${updated.trade_name}" atualizada com sucesso!`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : "Erro desconhecido ao salvar tema.");
    } finally {
      setSavingBranding(false);
    }
  };

  // Open Settings / Quota Modal
  const openSettingsModal = (tenant: TenantItem) => {
    setSettingsModalTenant(tenant);
    setDeviceLimit(tenant.settings?.device_limit || 50);
    setEnabledModules(tenant.settings?.enabled_modules || ["telemetry", "tracking"]);
    setSettingsError(null);
  };

  const closeSettingsModal = () => {
    setSettingsModalTenant(null);
    setSettingsError(null);
  };

  const toggleModule = (moduleId: string) => {
    setEnabledModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsModalTenant) return;

    setSavingSettings(true);
    setSettingsError(null);

    try {
      const res = await fetch(`/api/admin/tenants/${settingsModalTenant.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled_modules: enabledModules,
          device_limit: Number(deviceLimit),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Erro ao salvar configurações do plano.");
      }

      const updated: TenantItem = await res.json();
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      void fetchTenantStats(updated.id);
      closeSettingsModal();
      setFeedback({
        type: "success",
        message: `Módulos e cotas de "${updated.trade_name}" salvos com sucesso!`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Erro ao atualizar plano.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaxIDTouched(true);

    if (!taxIDValidation.isValid) {
      setCreateModalError(taxIDValidation.message || "Por favor, informe um CNPJ / Tax ID válido.");
      return;
    }

    setCreating(true);
    setCreateModalError(null);

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug.trim().toLowerCase(),
          legal_name: newLegalName.trim(),
          trade_name: newTradeName.trim(),
          tax_id: newTaxID.trim(),
          branding: {
            brand_name: newTradeName.trim(),
            primary_color: newPrimaryColor,
            secondary_color: "#18181B",
            accent_color: newPrimaryColor,
            support_email: `suporte@${newSlug.trim().toLowerCase()}.com.br`,
          },
          settings: {
            subdomain: newSlug.trim().toLowerCase(),
            custom_domains: [`app.${newSlug.trim().toLowerCase()}.com.br`],
            enabled_modules: ["telemetry", "tracking", "devices", "motorcycles", "riders"],
            device_limit: Number(newDeviceLimit) || 100,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Falha ao provisionar parceiro.");
      }

      const created: TenantItem = await res.json();
      setTenants((prev) => [...prev, created]);
      void fetchTenantStats(created.id);
      setShowCreateModal(false);
      setNewSlug("");
      setNewLegalName("");
      setNewTradeName("");
      setNewTaxID("");
      setTaxIDTouched(false);
      setCreateModalError(null);
      setFeedback({
        type: "success",
        message: `Organização "${created.trade_name}" criada com sucesso!`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setCreateModalError(err instanceof Error ? err.message : "Erro ao provisionar organização.");
    } finally {
      setCreating(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.trade_name.toLowerCase().includes(q) ||
      t.legal_name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.tax_id && t.tax_id.toLowerCase().includes(q))
    );
  });

  const getModuleIcon = (id: string) => {
    switch (id) {
      case "telemetry":
        return <Radio className="size-4 text-sky-400" />;
      case "devices":
        return <Cpu className="size-4 text-emerald-400" />;
      case "motorcycles":
        return <Bike className="size-4 text-amber-400" />;
      case "fleet":
        return <Layers className="size-4 text-purple-400" />;
      case "risk_ai":
        return <Brain className="size-4 text-rose-400" />;
      case "geofence":
        return <ShieldAlert className="size-4 text-orange-400" />;
      case "reports":
        return <BarChart3 className="size-4 text-blue-400" />;
      case "webhooks":
        return <Webhook className="size-4 text-indigo-400" />;
      default:
        return <Cpu className="size-4 text-primary" />;
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 py-4">
        {/* Header Hero Conciso */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-secondary/40 p-6 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  Gestão White-Label &amp; Multi-Tenant B2B
                </p>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                Organizações &amp; White-Label
              </h1>
              <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
                Gerencie todos os parceiros do ecossistema, personalize identidades visuais em modais dedicados, regule limites de cotas e domínios CNAME.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95"
              >
                <Plus className="size-4 stroke-[3]" />
                <span>Nova Organização</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold transition-all ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-5 shrink-0" />
            ) : (
              <AlertCircle className="size-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Barra de Busca e Filtro */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, razão social, slug ou CNPJ..."
              className="w-full rounded-2xl border border-border bg-card/60 pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>Total de Organizações:</span>
            <span className="font-bold text-foreground">{tenants.length}</span>
          </div>
        </div>

        {/* Grade de Organizações (Visual Conciso e Elegante) */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-border bg-card">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider">Carregando organizações...</p>
            </div>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
            <Building2 className="size-12 text-muted-foreground/50" />
            <h3 className="text-sm font-bold uppercase text-foreground">Nenhuma organização encontrada</h3>
            <p className="max-w-md text-xs text-muted-foreground">
              {searchQuery
                ? "Nenhum parceiro corresponde à sua pesquisa. Tente outro termo."
                : "Cadastre sua primeira organização white-label no botão acima para começar."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTenants.map((t) => {
              const stats = statsMap[t.id];
              const deviceCount = stats?.device_count || 0;
              const limit = t.settings?.device_limit || 50;
              const usagePercent = limit > 0 ? Math.round((deviceCount / limit) * 100) : 0;
              const primaryColorValue = t.branding?.primary_color || "#EF251B";
              const currentLogo = t.branding?.logo_url;

              return (
                <div
                  key={t.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/75 p-6 shadow-xl transition-all duration-300 hover:border-primary/50 hover:shadow-primary/5"
                >
                  <div className="space-y-4">
                    {/* Header do Card com Identidade da Organização */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-inner"
                          style={{ backgroundColor: `${primaryColorValue}15` }}
                        >
                          {currentLogo && currentLogo !== "/logo.svg" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={currentLogo}
                              alt={t.trade_name}
                              className="size-8 object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span
                              className="text-base font-black uppercase text-foreground"
                              style={{ color: primaryColorValue }}
                            >
                              {(t.trade_name || t.slug).charAt(0)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black uppercase tracking-tight text-foreground">
                            {t.trade_name || t.legal_name}
                          </h3>
                          <p className="truncate text-[11px] text-muted-foreground font-mono">
                            {t.legal_name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                          t.status === "active"
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border border-border bg-secondary text-muted-foreground"
                        }`}
                      >
                        {t.status === "active" ? "Ativo" : t.status}
                      </span>
                    </div>

                    {/* CNPJ & Subdomínio */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-border/60 bg-secondary/40 p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-muted-foreground">CNPJ / Tax ID</span>
                        <span className="font-mono text-[11px] font-semibold text-foreground truncate block">
                          {formatCNPJ(t.tax_id) || t.tax_id || "--"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-secondary/40 p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-muted-foreground">Slug / Domínio</span>
                        <span className="font-mono text-[11px] font-semibold text-primary truncate block">
                          {t.slug}.rideon.app
                        </span>
                      </div>
                    </div>

                    {/* Consumo de Cotas Compacto */}
                    <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                          <Gauge className="size-3.5 text-primary" />
                          Rastreadores
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {deviceCount} <span className="text-muted-foreground font-normal">/ {limit}</span>
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
                        <div
                          className={`h-full transition-all duration-500 ${
                            usagePercent >= 90
                              ? "bg-destructive"
                              : usagePercent >= 70
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Módulos Badge Preview */}
                    <div className="flex flex-wrap items-center gap-1">
                      {(t.settings?.enabled_modules || ["telemetry", "tracking"]).slice(0, 4).map((mod) => (
                        <span
                          key={mod}
                          className="rounded-md border border-border/60 bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
                        >
                          {mod}
                        </span>
                      ))}
                      {(t.settings?.enabled_modules?.length || 0) > 4 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          +{(t.settings?.enabled_modules?.length || 0) - 4}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas no Card */}
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
                    <button
                      type="button"
                      onClick={() => openThemeModal(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                      title="Personalizar Identidade Visual e Tema"
                    >
                      <Palette className="size-3.5" />
                      <span>Tema</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openSettingsModal(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-2.5 py-2 text-xs font-bold text-foreground hover:bg-secondary hover:border-foreground/20 transition-all"
                      title="Configurar Cotas e Módulos"
                    >
                      <Sliders className="size-3.5" />
                      <span>Plano</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDomainsModalTenant(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-2.5 py-2 text-xs font-bold text-foreground hover:bg-secondary hover:border-foreground/20 transition-all"
                      title="Apontamentos DNS e SSL"
                    >
                      <Globe className="size-3.5" />
                      <span>DNS</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL 1: Personalizar Tema / Edição de Tema Separada */}
        {themeModalTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
              <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Palette className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                      Personalizar Identidade Visual &amp; Tema
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Organização: {themeModalTenant.trade_name} ({themeModalTenant.slug})
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeThemeModal}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBranding} className="space-y-6">
                {brandingError && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-500 font-semibold">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{brandingError}</p>
                  </div>
                )}

                {/* Nome da Marca */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nome da Marca Comercial
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ex: Alpha Tracker, FleetExpress"
                    className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                {/* Seletor de Cores */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Paleta de Cores da Interface
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Cor Primária</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="size-10 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Cor Secundária</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="size-10 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                        />
                        <input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Cor de Destaque</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="size-10 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                        />
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Presets Rápidos de Cores */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">Presets:</span>
                    {PRESET_COLORS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(p.hex);
                          setAccentColor(p.hex);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-foreground/40 transition-colors"
                      >
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: p.hex }} />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* COMPONENTE DE BUSCA DE ARQUIVO NA MÁQUINA + EXIBIÇÃO DA IMAGEM ATUAL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Logotipo da Organização
                    </label>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      PNG, SVG, JPG ou WEBP (máx 2MB)
                    </span>
                  </div>

                  {/* Input de arquivo nativo oculto acionado pelo botão/card */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleImageFileSelect}
                    className="hidden"
                  />

                  {/* Exibição da Imagem Atual ou Área de Upload */}
                  {logoUrl ? (
                    <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative flex h-20 w-32 items-center justify-center rounded-xl border border-white/10 bg-[#0d0d0d] p-2 shadow-inner">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={logoUrl}
                              alt="Logotipo"
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>

                          <div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              Logotipo Ativo
                            </span>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Esta imagem será exibida na barra de navegação e telas de login dos clientes.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                          >
                            <UploadCloud className="size-3.5 text-primary" />
                            <span>Substituir Arquivo</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition-colors"
                            title="Remover logotipo"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/20 p-6 text-center transition-all hover:border-primary/60 hover:bg-primary/5"
                    >
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                        <UploadCloud className="size-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                          Selecionar logotipo da sua máquina
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Clique aqui para buscar o arquivo SVG, PNG ou JPG no seu computador.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-sm group-hover:border-primary/50">
                        <ImageIcon className="size-3.5" />
                        Navegar nos Arquivos
                      </span>
                    </div>
                  )}
                </div>

                {/* Email de Suporte */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    E-mail de Suporte aos Clientes
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="suporte@minhaempresa.com.br"
                    className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Preview em Tempo Real Compacto */}
                <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-foreground">
                      <Sparkles className="size-3.5 text-primary" />
                      Pré-visualização do Topbar
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Live Preview</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo Preview" className="h-6 w-auto object-contain" />
                      ) : (
                        <span
                          className="grid size-6 place-items-center rounded text-xs font-black text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {(brandName || "R").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-sm font-black uppercase italic tracking-wide text-white">
                        {brandName || "RideOn"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Acessar Painel
                    </button>
                  </div>
                </div>

                {/* Botões do Rodapé */}
                <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                  <button
                    type="button"
                    onClick={closeThemeModal}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingBranding}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingBranding ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Salvando Identidade...</span>
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        <span>Salvar Tema</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Cotas & Módulos Licenciados */}
        {settingsModalTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
              <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Sliders className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                      Plano, Módulos &amp; Cotas
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Organização: {settingsModalTenant.trade_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeSettingsModal}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                {settingsError && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-500 font-semibold">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{settingsError}</p>
                  </div>
                )}

                {/* Quota de Dispositivos */}
                <div className="rounded-2xl border border-border/80 bg-secondary/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Limite Máximo de Dispositivos Conectados
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">0 = Ilimitado</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Novos rastreadores que excederem esta cota serão bloqueados com status 403.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={deviceLimit}
                      onChange={(e) => setDeviceLimit(Number(e.target.value))}
                      className="w-32 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">dispositivos licenciados</span>
                  </div>
                </div>

                {/* Módulos Habilitados */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Módulos Funcionais Contratados
                  </label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isEnabled = enabledModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModule(mod.id)}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                            isEnabled
                              ? "border-primary/50 bg-primary/5 shadow-sm"
                              : "border-border/60 bg-secondary/20 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="mt-0.5">{getModuleIcon(mod.id)}</div>
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold uppercase tracking-wide text-foreground truncate">
                              {mod.name}
                            </span>
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                              {mod.description}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => {}}
                            className="mt-1 size-4 accent-primary"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                  <button
                    type="button"
                    onClick={closeSettingsModal}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Salvando Plano...</span>
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        <span>Salvar Cotas</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Domínios CNAME & DNS */}
        {domainsModalTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
              <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Globe className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                      Apontamento DNS &amp; Domínio Próprio
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Organização: {domainsModalTenant.trade_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDomainsModalTenant(null)}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-secondary/50 p-4">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Subdomínio Nativo Ativo:</p>
                  <p className="mt-1 font-mono text-sm font-bold text-primary">
                    {domainsModalTenant.settings?.subdomain || domainsModalTenant.slug}.rideon.app
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Para que este parceiro acesse com o próprio domínio (ex: <code className="text-primary font-mono">app.suaempresa.com.br</code>), crie o apontamento CNAME na Zona DNS:
                  </p>

                  <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-secondary/30">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border/70 bg-secondary/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2">Tipo</th>
                          <th className="px-4 py-2">Host</th>
                          <th className="px-4 py-2">Destino</th>
                          <th className="px-4 py-2">SSL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-mono text-xs">
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-primary">CNAME</td>
                          <td className="px-4 py-2.5 text-foreground">app</td>
                          <td className="px-4 py-2.5 text-emerald-400">cname.rideon.app</td>
                          <td className="px-4 py-2.5 text-emerald-400">Automático</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setDomainsModalTenant(null)}
                    className="rounded-xl border border-border px-5 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary/60"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: Provisionar Nova Organização */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black uppercase text-foreground">
                      Provisionar Nova Organização
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Crie uma conta parceira white-label isolada no SaaS.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-4">
                {createModalError && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-500 font-semibold">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{createModalError}</p>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    Identificador Único (Slug da URL)
                  </label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="ex: frota-express, alpha-tracker"
                    className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={newLegalName}
                    onChange={(e) => setNewLegalName(e.target.value)}
                    placeholder="Alpha Rastreamento e Logística Ltda"
                    className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={newTradeName}
                      onChange={(e) => setNewTradeName(e.target.value)}
                      placeholder="Alpha Tracker"
                      className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase text-muted-foreground">
                        CNPJ / Tax ID
                      </label>
                      {newTaxID && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            taxIDValidation.isValid
                              ? "text-emerald-500"
                              : taxIDValidation.status === "incomplete"
                              ? "text-amber-500"
                              : "text-rose-500"
                          }`}
                        >
                          {taxIDValidation.isValid ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              <span>Válido</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3" />
                              <span>{taxIDValidation.status === "incomplete" ? "Incompleto" : "Inválido"}</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newTaxID}
                      onChange={handleTaxIDChange}
                      onBlur={() => setTaxIDTouched(true)}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className={`w-full rounded-xl border bg-secondary/60 px-3.5 py-2 text-sm text-foreground transition-colors focus:outline-none ${
                        taxIDTouched && !taxIDValidation.isValid
                          ? "border-rose-500/80 focus:border-rose-500"
                          : taxIDValidation.isValid
                          ? "border-emerald-500/80 focus:border-emerald-500"
                          : "border-border focus:border-primary"
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                      Cor Primária
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newPrimaryColor}
                        onChange={(e) => setNewPrimaryColor(e.target.value)}
                        className="size-9 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                      />
                      <input
                        type="text"
                        value={newPrimaryColor}
                        onChange={(e) => setNewPrimaryColor(e.target.value)}
                        className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-1.5 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                      Cota Inicial (Dispositivos)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newDeviceLimit}
                      onChange={(e) => setNewDeviceLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Provisionando...</span>
                      </>
                    ) : (
                      <span>Criar Organização</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
