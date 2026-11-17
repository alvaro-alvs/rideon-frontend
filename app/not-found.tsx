import type { Metadata } from "next";

import { PublicHeader } from "@/app/components/public-header";
import { NotFoundView } from "@/app/components/not-found-view";
import { FooterSection } from "@/app/components/landing/footer-section";

export const metadata: Metadata = {
  title: "404 — Página não encontrada",
  description:
    "A rota solicitada não foi encontrada. Retorne ao início ou acesse o painel de monitoramento.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground antialiased selection:bg-primary selection:text-white">
      <PublicHeader />
      <NotFoundView />
      <FooterSection />
    </div>
  );
}
