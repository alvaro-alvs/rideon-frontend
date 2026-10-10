import { DEFAULT_TENANT_CONFIG, type TenantPublicConfig } from "@/lib/types/tenant";
import { getApiUrl } from "@/lib/auth";

/**
 * Fetches the public white-label branding configuration for the given hostname or tenant slug.
 * Uses Next.js fetch caching (revalidates every 60s) for high performance.
 */
export async function fetchTenantConfig(hostOrSlug?: string): Promise<TenantPublicConfig> {
  const apiUrl = getApiUrl();
  const cleanHost = hostOrSlug?.split(":")[0]?.trim() || "";

  try {
    const url = new URL(`${apiUrl}/api/v1/tenant/config`);
    if (cleanHost && cleanHost !== "localhost" && cleanHost !== "127.0.0.1") {
      url.searchParams.set("tenant", cleanHost);
    }

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return DEFAULT_TENANT_CONFIG;
    }

    const data = await res.json();
    return {
      slug: data.slug || DEFAULT_TENANT_CONFIG.slug,
      legal_name: data.legal_name || DEFAULT_TENANT_CONFIG.legal_name,
      trade_name: data.trade_name || DEFAULT_TENANT_CONFIG.trade_name,
      status: data.status || DEFAULT_TENANT_CONFIG.status,
      branding: {
        brand_name: data.branding?.brand_name || DEFAULT_TENANT_CONFIG.branding.brand_name,
        logo_url: data.branding?.logo_url || "",
        favicon_url: data.branding?.favicon_url || "/favicon.ico",
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
  } catch {
    return DEFAULT_TENANT_CONFIG;
  }
}
