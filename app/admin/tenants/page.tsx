"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe,
  Layers,
  Loader2,
  Palette,
  Plus,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { useTenant } from "@/app/components/tenant-provider";

interface TenantRecord {
  id: string;
  slug: string;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  status: string;
  branding: {
    brand_name: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    support_email: string;
    custom_css?: string;
  };
  settings: {
    custom_domains: string[];
    subdomain: string;
    default_language: string;
    timezone: string;
    enabled_modules: string[];
    device_limit: number;
  };
}

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
  const { tenant: activePublicTenant } = useTenant();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // New Tenant Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newLegalName, setNewLegalName] = useState("");
  const [newTradeName, setNewTradeName] = useState("");
  const [newTaxID, setNewTaxID] = useState("");
  const [newPrimaryColor, setNewPrimaryColor] = useState("#FF6600");

  const selectTenant = useCallback((t: TenantRecord) => {
    setSelectedTenant(t);
    setBrandName(t.branding.brand_name || t.trade_name || "");
    setPrimaryColor(t.branding.primary_color || "#EF251B");
    setSecondaryColor(t.branding.secondary_color || "#1D1D1D");
    setAccentColor(t.branding.accent_color || "#FF3B30");
    setLogoUrl(t.branding.logo_url || "");
    setFaviconUrl(t.branding.favicon_url || "");
    setSupportEmail(t.branding.support_email || "");
    setCustomCss(t.branding.custom_css || "");
    setFeedback(null);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadTenants() {
      try {
        const res = await fetch("/api/admin/tenants");
        if (!ignore && res.ok) {
          const data = await res.json();
          const list: TenantRecord[] = Array.isArray(data) ? data : [];
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
  }, [activePublicTenant.slug, selectTenant]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setSaving(true);
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

      const updated = await res.json();
      setFeedback({
        type: "success",
        message: "Identidade visual atualizada com sucesso! As alterações já estão ativas.",
      });

      // Update in state
      setSelectedTenant(updated);
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

      // Apply live root variable for immediate visual gratification in current session
      document.documentElement.style.setProperty("--primary", primaryColor);
      document.documentElement.style.setProperty("--color-primary", primaryColor);
      document.documentElement.style.setProperty("--secondary", secondaryColor);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao salvar.",
      });
    } finally {
      setSaving(false);
    }
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
            device_limit: 100,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Falha ao provisionar parceiro.");
      }

      const created: TenantRecord = await res.json();
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
                Gestão White-Label &amp; Multi-Tenant
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Customização de Marcas &amp; Domínios
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure identidades visuais personalizadas, CNAMEs e módulos para clientes parceiros.
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
                    style={{ backgroundColor: t.branding.primary_color || "#EF251B" }}
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

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
            {/* Left Column: Customizer Form */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur sm:p-7">
                <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
                  <div>
                    <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                      Identidade Visual do Parceiro
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Tokens aplicados em tempo de execução via CSS variables no frontend.
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-400">
                    {selectedTenant?.status || "active"}
                  </span>
                </div>

                {feedback && (
                  <div
                    className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold ${
                      feedback.type === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0 text-red-400" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                )}

                <form onSubmit={handleSaveBranding} className="space-y-5">
                  {/* Brand Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Nome Comercial da Marca
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Ex: Alpha Track, Frota Express..."
                      className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      required
                    />
                  </div>

                  {/* Color Swatches & Primary Hex */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Cor Primária (Destaques, Botões e Logotipos)
                    </label>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setPrimaryColor(color.hex)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                            primaryColor.toUpperCase() === color.hex.toUpperCase()
                              ? "border-white bg-white/10 text-white font-bold"
                              : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span
                            className="size-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
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
                        placeholder="#EF251B"
                        className="w-36 rounded-xl border border-border bg-secondary/60 px-3.5 py-2 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Secondary & Accent Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Cor Secundária (Superfícies)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="size-9 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                        />
                        <input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Cor de Destaque (Accent)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="size-9 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                        />
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      URL do Logotipo (PNG ou SVG transparente)
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://sua-empresa.com.br/logo.svg (Deixe em branco para badge tipográfico)"
                      className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
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
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? (
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

            {/* Right Column: Live Studio Preview & CNAME Info */}
            <div className="space-y-6">
              {/* Live Preview Card */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Visualização em Tempo Real (Live Studio)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Preview Dinâmico
                  </span>
                </div>

                {/* Mock Application Header & Card */}
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

                  {/* Mock Metric Card */}
                  <div
                    className="rounded-lg p-3.5 text-white"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Frota Monitorada
                      </span>
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                    </div>
                    <p className="mt-1 text-2xl font-black">48 Motos</p>
                    <p
                      className="mt-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: primaryColor }}
                    >
                      &bull; 100% dos rastreadores ativos
                    </p>
                  </div>

                  {/* Mock Telemetry Alert Banner */}
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-2.5 text-[11px] text-muted-foreground">
                    <Radio
                      className="size-3.5 animate-pulse"
                      style={{ color: primaryColor }}
                    />
                    <span>Telemetria transmitindo a 2.4k eventos/seg</span>
                  </div>
                </div>
              </div>

              {/* Domains & DNS Configuration Card */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                <div className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3">
                  <Globe className="size-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Domínios Próprios &amp; CNAME
                  </h3>
                </div>

                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    O parceiro pode apontar o próprio domínio para sua infraestrutura. O sistema detecta o hostname e aplica a marca instantaneamente.
                  </p>

                  <div className="rounded-xl border border-border/60 bg-secondary/50 p-3">
                    <p className="text-[11px] font-bold uppercase text-foreground">
                      Subdomínio Nativo:
                    </p>
                    <p className="font-mono text-xs text-primary">
                      {selectedTenant?.settings?.subdomain || selectedTenant?.slug || "parceiro"}.rideon.app
                    </p>
                  </div>

                  {selectedTenant?.settings?.custom_domains &&
                    selectedTenant.settings.custom_domains.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase text-muted-foreground">
                          Domínios CNAME Ativos:
                        </p>
                        {selectedTenant.settings.custom_domains.map((dom) => (
                          <div
                            key={dom}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs font-mono text-foreground"
                          >
                            <span>{dom}</span>
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
                              <ShieldCheck className="size-3" /> SSL Ativo
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              {/* Licensed Modules */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur">
                <div className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3">
                  <Layers className="size-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Módulos &amp; Recursos Licenciados
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(selectedTenant?.settings?.enabled_modules || ["telemetry", "tracking"]).map((mod) => (
                    <span
                      key={mod}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase text-primary"
                    >
                      <CheckCircle2 className="size-3" />
                      {mod}
                    </span>
                  ))}
                </div>

                <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">Limite Contratado: </span>
                  {selectedTenant?.settings?.device_limit || 50} dispositivos simultâneos
                </div>
              </div>
            </div>
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
                  Nome Fantasia (Marca)
                </label>
                <input
                  type="text"
                  value={newTradeName}
                  onChange={(e) => setNewTradeName(e.target.value)}
                  placeholder="Ex: Frota Express Rastreamento"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={newLegalName}
                    onChange={(e) => setNewLegalName(e.target.value)}
                    placeholder="Frota Express Ltda"
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
                    placeholder="00.000.000/0001-00"
                    className="w-full rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                  Cor Primária da Marca
                </label>
                <div className="flex items-center gap-3">
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
                    className="w-32 rounded-xl border border-border bg-secondary/60 px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  <span>Provisionar Parceiro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
