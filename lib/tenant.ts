import { cache } from "react";
import { DEFAULT_TENANT_CONFIG, type TenantPublicConfig } from "@/lib/types/tenant";
import { getApiUrl } from "@/lib/auth";

const TENANT_CACHE_TTL_MS = 60_000;
const TENANT_FETCH_TIMEOUT_MS = 1_500;

const tenantMemoryCache = new Map<
  string,
  { config: TenantPublicConfig; expiresAt: number }
>();

/**
 * Fetches the public white-label branding configuration for the given hostname or tenant slug.
 * Deduplicated per SSR request via React.cache, backed by an in-memory TTL cache and fast timeout
 * so landing page SSR never blocks on redundant or slow network requests.
 */
export const fetchTenantConfig = cache(
  async (hostOrSlug?: string): Promise<TenantPublicConfig> => {
    const cleanHost = hostOrSlug?.split(":")[0]?.trim().toLowerCase() || "";

    // Default local/platform hosts use the default RideOn branding without a network roundtrip
    if (!cleanHost || cleanHost === "localhost" || cleanHost === "127.0.0.1") {
      return DEFAULT_TENANT_CONFIG;
    }

    const now = Date.now();
    const cached = tenantMemoryCache.get(cleanHost);
    if (cached && cached.expiresAt > now) {
      return cached.config;
    }

    const apiUrl = getApiUrl();

    try {
      const url = new URL(`${apiUrl}/api/v1/tenant/config`);
      url.searchParams.set("tenant", cleanHost);

      const res = await fetch(url.toString(), {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(TENANT_FETCH_TIMEOUT_MS),
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        tenantMemoryCache.set(cleanHost, {
          config: DEFAULT_TENANT_CONFIG,
          expiresAt: now + TENANT_CACHE_TTL_MS,
        });
        return DEFAULT_TENANT_CONFIG;
      }

      const data = await res.json();
      const resolvedConfig: TenantPublicConfig = {
        slug: data.slug || DEFAULT_TENANT_CONFIG.slug,
        legal_name: data.legal_name || DEFAULT_TENANT_CONFIG.legal_name,
        trade_name: data.trade_name || DEFAULT_TENANT_CONFIG.trade_name,
        status: data.status || DEFAULT_TENANT_CONFIG.status,
        branding: {
          brand_name: data.branding?.brand_name || DEFAULT_TENANT_CONFIG.branding.brand_name,
          logo_url: data.branding?.logo_url || DEFAULT_TENANT_CONFIG.branding.logo_url,
          favicon_url: data.branding?.favicon_url || DEFAULT_TENANT_CONFIG.branding.favicon_url,
          primary_color: data.branding?.primary_color || DEFAULT_TENANT_CONFIG.branding.primary_color,
          secondary_color: data.branding?.secondary_color || DEFAULT_TENANT_CONFIG.branding.secondary_color,
          accent_color: data.branding?.accent_color || DEFAULT_TENANT_CONFIG.branding.accent_color,
          support_email: data.branding?.support_email || DEFAULT_TENANT_CONFIG.branding.support_email,
          custom_css: data.branding?.custom_css,
        },
        language: data.language || DEFAULT_TENANT_CONFIG.language,
        timezone: data.timezone || DEFAULT_TENANT_CONFIG.timezone,
        modules: Array.isArray(data.modules) ? data.modules : DEFAULT_TENANT_CONFIG.modules,
      };

      tenantMemoryCache.set(cleanHost, {
        config: resolvedConfig,
        expiresAt: now + TENANT_CACHE_TTL_MS,
      });

      return resolvedConfig;
    } catch {
      tenantMemoryCache.set(cleanHost, {
        config: DEFAULT_TENANT_CONFIG,
        expiresAt: now + 15_000,
      });
      return DEFAULT_TENANT_CONFIG;
    }
  }
);
