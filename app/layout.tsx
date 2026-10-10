import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

import { fetchTenantConfig } from "@/lib/tenant";
import { TenantProvider } from "@/app/components/tenant-provider";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("x-tenant-host") || headersList.get("host") || "";
  const tenant = await fetchTenantConfig(host);
  const brandName = tenant.branding.brand_name || "RideOn";

  return {
    title: `${brandName} | Rastreamento e Segurança`,
    description: `Localização em tempo real, telemetria e gestão inteligente com ${brandName}.`,
    icons: {
      icon: tenant.branding.favicon_url || "/favicon.ico",
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const host = headersList.get("x-tenant-host") || headersList.get("host") || "";
  const tenant = await fetchTenantConfig(host);

  const primaryColor = tenant.branding.primary_color || "#ef251b";
  const secondaryColor = tenant.branding.secondary_color || "#1d1d1d";
  const accentColor = tenant.branding.accent_color || "#ff3b30";

  return (
    <html lang={tenant.language || "pt-BR"} className="h-full antialiased">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --primary: ${primaryColor};
                --color-primary: ${primaryColor};
                --secondary: ${secondaryColor};
                --color-secondary: ${secondaryColor};
                --accent: ${accentColor};
              }
              ${tenant.branding.custom_css || ""}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TenantProvider tenant={tenant}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
