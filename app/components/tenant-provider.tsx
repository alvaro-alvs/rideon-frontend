"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_TENANT_CONFIG, type TenantPublicConfig } from "@/lib/types/tenant";

interface TenantContextValue {
  tenant: TenantPublicConfig;
  branding: TenantPublicConfig["branding"];
  isModuleEnabled: (moduleName: string) => boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: DEFAULT_TENANT_CONFIG,
  branding: DEFAULT_TENANT_CONFIG.branding,
  isModuleEnabled: () => true,
});

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantPublicConfig;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    return {
      tenant,
      branding: tenant.branding,
      isModuleEnabled: (name: string) =>
        tenant.modules.some((m) => m.toLowerCase() === name.toLowerCase()),
    };
  }, [tenant]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
