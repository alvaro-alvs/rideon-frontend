import type { Metadata } from "next";
import { Fustat, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

import { fetchTenantConfig } from "@/lib/tenant";
import { TenantProvider } from "@/app/components/tenant-provider";

const fustat = Fustat({
  subsets: ["latin"],
  variable: "--font-fustat",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("x-tenant-host") || headersList.get("host") || "";
  const tenant = await fetchTenantConfig(host);
  const brandName = tenant.branding.brand_name || "RideOn";

  const faviconUrl = tenant.branding.favicon_url || "/favicon.svg";

  return {
    title: `${brandName} | Rastreamento e Segurança`,
    description: `Localização em tempo real, telemetria e gestão inteligente com ${brandName}.`,
    icons: {
      icon: [
        { url: faviconUrl, type: faviconUrl.endsWith(".svg") ? "image/svg+xml" : undefined },
        { url: "/favicon.ico" },
      ],
      shortcut: "/favicon.ico",
      apple: faviconUrl,
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
    <html
      lang={tenant.language || "pt-BR"}
      className={`h-full antialiased ${fustat.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
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
