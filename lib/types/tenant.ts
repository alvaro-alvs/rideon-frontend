export interface TenantBranding {
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  support_email: string;
  custom_css?: string;
}

export interface TenantPublicConfig {
  slug: string;
  legal_name: string;
  trade_name: string;
  status: string;
  branding: TenantBranding;
  language: string;
  timezone: string;
  modules: string[];
}

export const DEFAULT_TENANT_CONFIG: TenantPublicConfig = {
  slug: "rideon",
  legal_name: "RideOn Telemetria e Rastreamento Ltda",
  trade_name: "RideOn",
  status: "active",
  branding: {
    brand_name: "RideOn",
    logo_url: "",
    favicon_url: "/favicon.ico",
    primary_color: "#ef251b",
    secondary_color: "#1d1d1d",
    accent_color: "#ff3b30",
    support_email: "suporte@rideon.app",
  },
  language: "pt-BR",
  timezone: "America/Sao_Paulo",
  modules: ["telemetry", "tracking", "devices", "motorcycles", "riders"],
};
