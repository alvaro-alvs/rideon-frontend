"use client";

import { useCallback, useEffect, useState } from "react";
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
  Layers,
  Loader2,
  Lock,
  Palette,
  Plus,
  Radio,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Webhook,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useTenant } from "@/app/components/tenant-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPlatformOrTenantAdmin } from "@/lib/auth";
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

export default function WhiteLabelAdminPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { tenant: activePublicTenant } = useTenant();

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
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantItem | null>(null);
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"branding" | "licensing" | "domains">("branding");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Branding Form State (Live synced with preview)
  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#EF251B");
  const [secondaryColor, setSecondaryColor] = useState("#1D1D1D");
  const [accentColor, setAccentColor] = useState("#FF3B30");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [customCss, setCustomCss] = useState("");

  // Licensing & Quota State
  const [deviceLimit, setDeviceLimit] = useState(50);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  // New Tenant Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newLegalName, setNewLegalName] = useState("");
  const [newTradeName, setNewTradeName] = useState("");
  const [newTaxID, setNewTaxID] = useState("");
  const [newPrimaryColor, setNewPrimaryColor] = useState("#FF6600");
  const [newDeviceLimit, setNewDeviceLimit] = useState(100);

  const fetchTenantStats = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/stats`);
      if (res.ok) {
        const stats: TenantStats = await res.json();
        setTenantStats(stats);
      }
    } catch {
      // Ignore stats fetch failure
    }
  }, []);

  const selectTenant = useCallback(
    (t: TenantItem) => {
      setSelectedTenant(t);
      setBrandName(t.branding?.brand_name || t.trade_name || "");
      setPrimaryColor(t.branding?.primary_color || "#EF251B");
      setSecondaryColor(t.branding?.secondary_color || "#1D1D1D");
      setAccentColor(t.branding?.accent_color || "#FF3B30");
      setLogoUrl(t.branding?.logo_url || "");
      setFaviconUrl(t.branding?.favicon_url || "");
      setSupportEmail(t.branding?.support_email || "");
      setCustomCss(t.branding?.custom_css || "");
      setDeviceLimit(t.settings?.device_limit || 50);
      setEnabledModules(t.settings?.enabled_modules || ["telemetry", "tracking"]);
      setFeedback(null);
      fetchTenantStats(t.id);
    },
    [fetchTenantStats],
  );

  useEffect(() => {
    if (currentUser.status !== "authenticated" || !isPlatformOrTenantAdmin(currentUser.user.role)) {
      return;
    }
    let ignore = false;
    async function loadTenants() {
      try {
        const res = await fetch("/api/admin/tenants");
        if (res.status === 401) {
          if (typeof window !== "undefined") {
            window.location.replace("/login?expired=1&from=" + encodeURIComponent("/admin/tenants"));
          }
          return;
        }
        if (!ignore && res.ok) {
          const data = await res.json();
          const list: TenantItem[] = Array.isArray(data) ? data : [];
          setTenants(list);
          if (list.length > 0) {
            const defaultT =
              list.find((t) => t.slug === activePublicTenant.slug) || list[0];
            selectTenant(defaultT);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadTenants();
    return () => {
      ignore = true;
    };
  }, [currentUser, activePublicTenant.slug, selectTenant]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setSavingBranding(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          support_email: supportEmail,
          custom_css: customCss,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Erro ao salvar alterações visuais.");
      }

      const updated: TenantItem = await res.json();
      setFeedback({
        type: "success",
        message: "Identidade visual atualizada com sucesso! As alterações já estão ativas.",
      });

      setSelectedTenant(updated);
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

      // Live update CSS variables
      document.documentElement.style.setProperty("--primary", primaryColor);
      document.documentElement.style.setProperty("--color-primary", primaryColor);
      document.documentElement.style.setProperty("--secondary", secondaryColor);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao salvar.",
      });
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setSavingSettings(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/settings`, {
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
      setFeedback({
        type: "success",
        message: "Módulos licenciados e cotas de dispositivos atualizados com sucesso!",
      });

      setSelectedTenant(updated);
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      fetchTenantStats(updated.id);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao atualizar plano.",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setEnabledModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

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
      selectTenant(created);
      setShowCreateModal(false);
      setNewSlug("");
      setNewLegalName("");
      setNewTradeName("");
      setNewTaxID("");
      setFeedback({
        type: "success",
        message: `Parceiro White-Label "${created.trade_name}" provisionado com sucesso!`,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar parceiro.");
    } finally {
      setCreating(false);
    }
  };

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
        return <Webhook className="size-4 text-teal-400" />;
      default:
        return <CheckCircle2 className="size-4 text-primary" />;
    }
  };

  const usagePercent =
    tenantStats?.device_usage_percent ??
    (selectedTenant && selectedTenant.settings?.device_limit > 0
      ? Math.round(((tenantStats?.device_count || 0) / selectedTenant.settings.device_limit) * 100)
      : 0);

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="size-4" />
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Gestão White-Label &amp; Multi-Tenant B2B
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Portal White-Label &amp; Licenciamento
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure identidades visuais personalizadas, feature flags de módulos e limites de cotas de hardware.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
            >
              <Plus className="size-4" />
              <span>Novo Parceiro White-Label</span>
            </button>
          </div>
        </div>

        {/* Tenant Selector Chips */}
        {tenants.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Ambiente Ativo:
            </span>
            {tenants.map((t) => {
              const isSelected = selectedTenant?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTenant(t)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border/70 bg-card/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  }`}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: t.branding?.primary_color || "#EF251B" }}
                  />
                  <span>{t.trade_name || t.slug}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    ({t.slug})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-3">
          <button
            onClick={() => setActiveTab("branding")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "branding"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            <Palette className="size-3.5" />
            <span>Identidade Visual &amp; Live Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("licensing")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "licensing"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Feature Flags &amp; Cotas de Hardware</span>
          </button>
          <button
            onClick={() => setActiveTab("domains")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "domains"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            <Globe className="size-3.5" />
            <span>Domínios CNAME &amp; SSL</span>
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : !selectedTenant ? (
          <div className="rounded-2xl border border-border bg-card/40 p-12 text-center">
            <Building2 className="mx-auto size-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-base font-bold uppercase text-foreground">
              Nenhum Parceiro Cadastrado
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre seu primeiro parceiro White-Label para iniciar a customização.
            </p>
          </div>
        ) : (
          <div>
            {feedback && (
              <div
                className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
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

            {/* TAB 1: IDENTIDADE VISUAL */}
            {activeTab === "branding" && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Left Column: Form */}
                <div className="space-y-6 lg:col-span-7">
                  <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                    <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
                      <div className="flex items-center gap-2.5">
                        <Palette className="size-4.5 text-primary" />
                        <h2 className="text-base font-bold uppercase tracking-tight text-foreground">
                          Tokens de Cores &amp; Tipografia
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        Tenant ID: {selectedTenant.id.slice(0, 8)}...
                      </span>
                    </div>

                    <form onSubmit={handleSaveBranding} className="space-y-5">
                      {/* Brand Name */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Nome da Marca Comercial
                        </label>
                        <input
                          type="text"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="Ex: RastreiaMais, FleetTrack"
                          className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                          required
                        />
                      </div>

                      {/* Color Palette Grid */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Cor Primária (Hex)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                            />
                            <input
                              type="text"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 font-mono text-xs text-foreground uppercase focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Cor Secundária (Fundo)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                            />
                            <input
                              type="text"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 font-mono text-xs text-foreground uppercase focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Cor de Destaque
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                            />
                            <input
                              type="text"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 font-mono text-xs text-foreground uppercase focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Presets Quick Selector */}
                      <div>
                        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Paletas Rápidas Pré-definidas
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_COLORS.map((p) => (
                            <button
                              key={p.hex}
                              type="button"
                              onClick={() => {
                                setPrimaryColor(p.hex);
                                setAccentColor(p.hex);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/50 px-2.5 py-1.5 text-xs text-foreground hover:border-primary"
                            >
                              <span
                                className="size-3 rounded-full"
                                style={{ backgroundColor: p.hex }}
                              />
                              <span>{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Logo URL */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          URL do Logotipo (SVG / PNG Transparente)
                        </label>
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://cdn.meudominio.com/logo.svg"
                          className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      {/* Favicon URL & Support Email */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            URL do Favicon
                          </label>
                          <input
                            type="text"
                            value={faviconUrl}
                            onChange={(e) => setFaviconUrl(e.target.value)}
                            placeholder="/favicon.ico"
                            className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            E-mail de Suporte ao Usuário
                          </label>
                          <input
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            placeholder="suporte@empresa.com.br"
                            className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingBranding}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingBranding ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              <span>Gravando Alterações...</span>
                            </>
                          ) : (
                            <>
                              <Save className="size-4" />
                              <span>Salvar Identidade Visual</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right Column: Live Studio Preview */}
                <div className="space-y-6 lg:col-span-5">
                  <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                    <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Live Studio (Preview em Tempo Real)
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        Tema Dinâmico
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0d0d0d] p-4 shadow-inner">
                      {/* Mock Navbar */}
                      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={logoUrl}
                              alt="Logo"
                              className="h-6 w-auto object-contain"
                            />
                          ) : (
                            <span
                              className="grid size-6 place-items-center rounded text-xs font-black text-white"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {(brandName || "R").charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="text-sm font-black italic tracking-wide text-white uppercase">
                            {brandName || "RideOn"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Acessar Painel
                        </button>
                      </div>

                      {/* Mock Dashboard Widget */}
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase">
                            Status do Rastreador
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold text-white uppercase"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Online
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/60">
                          Dispositivo GT06 conectado. Transmissão a cada 10s.
                        </p>
                      </div>

                      {/* Mock Buttons Preview */}
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Botão Primário
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg border border-white/20 bg-white/10 py-2 text-xs font-bold uppercase tracking-wider text-white"
                        >
                          Secundário
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LICENCIAMENTO & COTAS DE HARDWARE */}
            {activeTab === "licensing" && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Left: Modules Matrix & Quota Form */}
                <div className="space-y-6 lg:col-span-8">
                  <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                    <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
                      <div className="flex items-center gap-2.5">
                        <Sliders className="size-4.5 text-primary" />
                        <div>
                          <h2 className="text-base font-bold uppercase tracking-tight text-foreground">
                            Feature Flags &amp; Módulos Habilitados
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Ligue ou desligue módulos de acordo com o plano contratado pelo parceiro.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      {/* Module Grid */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {AVAILABLE_MODULES.map((mod) => {
                          const isEnabled = enabledModules.includes(mod.id);
                          return (
                            <div
                              key={mod.id}
                              onClick={() => toggleModule(mod.id)}
                              className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                                isEnabled
                                  ? "border-primary/50 bg-primary/5 shadow-sm"
                                  : "border-border/60 bg-secondary/30 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <div className="mt-0.5">{getModuleIcon(mod.id)}</div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                                    {mod.name}
                                  </span>
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                      mod.category === "core"
                                        ? "bg-sky-500/10 text-sky-400"
                                        : mod.category === "premium"
                                        ? "bg-purple-500/10 text-purple-400"
                                        : "bg-amber-500/10 text-amber-400"
                                    }`}
                                  >
                                    {mod.category}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">
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

                      {/* Device Limit Section */}
                      <div className="rounded-xl border border-border/80 bg-secondary/40 p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gauge className="size-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                              Limite Máximo de Dispositivos Conectados (Quota)
                            </span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            0 = Ilimitado
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Rastreadores que tentarem se conectar além deste teto serão rejeitados com erro 403 (QUOTA_DEVICE_LIMIT_EXCEEDED).
                        </p>
                        <div className="mt-4 flex items-center gap-4">
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            value={deviceLimit}
                            onChange={(e) => setDeviceLimit(Number(e.target.value))}
                            className="w-32 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                          />
                          <span className="text-xs text-muted-foreground">
                            dispositivos permitidos
                          </span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingSettings ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              <span>Salvando Plano &amp; Cotas...</span>
                            </>
                          ) : (
                            <>
                              <Save className="size-4" />
                              <span>Salvar Módulos &amp; Quota de Hardware</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right: Real-time Quota Consumption Meter */}
                <div className="space-y-6 lg:col-span-4">
                  <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                    <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
                      <div className="flex items-center gap-2">
                        <Gauge className="size-4 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Consumo de Quota em Tempo Real
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-emerald-400">
                        Ativo
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black text-foreground">
                          {tenantStats?.device_count || 0}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground">
                          de {selectedTenant.settings?.device_limit || deviceLimit} dispositivos
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/80">
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

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Utilização Atual</span>
                        <span className="font-bold text-foreground">
                          {usagePercent}%
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
                        {usagePercent >= 90 ? (
                          <p className="flex items-center gap-1.5 font-semibold text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            Atenção: Quota próxima do esgotamento. Novos vínculos podem ser rejeitados.
                          </p>
                        ) : (
                          <p className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="size-4 shrink-0" />
                            Capacidade estável dentro dos parâmetros contratados.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Plan Badge Card */}
                  <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Resumo da Assinatura
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Status do Tenant:</span>
                        <span className="font-bold uppercase text-emerald-400">
                          {selectedTenant.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Módulos Habilitados:</span>
                        <span className="font-bold text-foreground">
                          {enabledModules.length} de {AVAILABLE_MODULES.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Isolamento de Dados:</span>
                        <span className="font-mono text-emerald-400">MongoDB Sharded Logical</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DOMÍNIOS & DNS */}
            {activeTab === "domains" && (
              <div className="max-w-3xl space-y-6">
                <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                  <div className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3">
                    <Globe className="size-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-tight text-foreground">
                      Apontamento DNS &amp; CNAME Customizado
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Para que seus clientes parceiros acessem o SaaS com o domínio próprio deles (ex:{" "}
                    <code className="text-primary font-mono">app.suaempresa.com.br</code>), instrua o parceiro a criar a seguinte entrada na Zona DNS:
                  </p>

                  <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-secondary/30">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border/70 bg-secondary/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5">Tipo</th>
                          <th className="px-4 py-2.5">Nome / Host</th>
                          <th className="px-4 py-2.5">Destino / Valor</th>
                          <th className="px-4 py-2.5">TTL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-mono text-xs">
                        <tr>
                          <td className="px-4 py-3 font-bold text-primary">CNAME</td>
                          <td className="px-4 py-3 text-foreground">app ou rastreamento</td>
                          <td className="px-4 py-3 text-emerald-400">cname.rideon.app</td>
                          <td className="px-4 py-3 text-muted-foreground">3600 (Automático)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-xl border border-border/60 bg-secondary/50 p-3.5">
                      <p className="text-[11px] font-bold uppercase text-foreground">
                        Subdomínio Nativo Imediato:
                      </p>
                      <p className="font-mono text-xs text-primary">
                        {selectedTenant?.settings?.subdomain || selectedTenant?.slug || "parceiro"}.rideon.app
                      </p>
                    </div>

                    {selectedTenant?.settings?.custom_domains &&
                      selectedTenant.settings.custom_domains.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold uppercase text-muted-foreground">
                            Domínios Próprios Verificados:
                          </p>
                          {selectedTenant.settings.custom_domains.map((dom) => (
                            <div
                              key={dom}
                              className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2.5 text-xs font-mono text-foreground"
                            >
                              <span>{dom}</span>
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
                                <ShieldCheck className="size-3.5" /> SSL Automático Ativo
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Novo Parceiro White-Label */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-base font-bold uppercase text-foreground">
                    Provisionar Novo Parceiro
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Crie uma nova conta white-label isolada no SaaS.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
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
                  Razão Social (Empresa)
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
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    CNPJ / Tax ID
                  </label>
                  <input
                    type="text"
                    value={newTaxID}
                    onChange={(e) => setNewTaxID(e.target.value)}
                    placeholder="12.345.678/0001-90"
                    className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
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
                    Cota de Dispositivos (Limite)
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
                  onClick={() => setShowCreateModal(false)}
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
                    <span>Criar Parceiro</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
