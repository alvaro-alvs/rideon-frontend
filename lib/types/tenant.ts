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

export interface TenantSettings {
  custom_domains: string[];
  subdomain: string;
  default_language: string;
  timezone: string;
  enabled_modules: string[];
  device_limit: number;
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

export interface TenantStats {
  tenant_id: string;
  slug: string;
  device_count: number;
  device_limit: number;
  device_usage_percent: number;
  enabled_modules: string[];
  status: string;
}

export interface TenantItem {
  id: string;
  slug: string;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  status: string;
  branding: TenantBranding;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'premium' | 'enterprise';
  icon: string;
}

export const AVAILABLE_MODULES: ModuleDefinition[] = [
  { id: 'telemetry', name: 'Telemetria & Rastreamento', description: 'Transmissão de posições, ignição e velocidade', category: 'core', icon: 'Radio' },
  { id: 'devices', name: 'Rastreadores & Hardware', description: 'Gestão de seriais, status de conexão e firmwares', category: 'core', icon: 'Cpu' },
  { id: 'motorcycles', name: 'Gestão de Veículos', description: 'Inventário de motocicletas e associação com condutores', category: 'core', icon: 'Bike' },
  { id: 'fleet', name: 'Frotas Corporativas', description: 'Gestão avançada de frotas, manutenções e checklists', category: 'premium', icon: 'Layers' },
  { id: 'risk_ai', name: 'Inteligência de Risco IA', description: 'Telemetria preditiva e pontuação comportamental', category: 'premium', icon: 'Brain' },
  { id: 'geofence', name: 'Cercas Virtuais (Geofence)', description: 'Polígonos geográficos e alertas de perímetro', category: 'premium', icon: 'ShieldAlert' },
  { id: 'reports', name: 'Relatórios Analíticos', description: 'Exportação gerencial em XLSX, PDF e dashboards BI', category: 'enterprise', icon: 'BarChart3' },
  { id: 'webhooks', name: 'Webhooks & Integrações', description: 'Disparo de eventos em tempo real para ERPs e sistemas', category: 'enterprise', icon: 'Webhook' },
];

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
  modules: ["telemetry", "tracking", "devices", "motorcycles", "riders", "fleet", "risk_ai", "geofence", "reports", "webhooks"],
};

