'use client';

import Link from 'next/link';
import { RideOnLogo } from '@/app/components/rideon-logo';

export function FooterSection() {
  return (
    <footer className="border-t border-border/70 bg-surface/90 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="sm:col-span-2">
            <RideOnLogo compact={false} />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Plataforma de alta tecnologia para rastreamento, telemetria e proteção veicular 24h em todo o território nacional.
            </p>
            {/* Live Operational Status */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Todos os sistemas operacionais</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
              Navegação
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link href="/#recursos" className="transition-colors hover:text-primary">
                  Recursos & Sensores
                </Link>
              </li>
              <li>
                <Link href="/#plataforma" className="transition-colors hover:text-primary">
                  Cockpit da Plataforma
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors hover:text-primary">
                  Criar Minha Conta
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-primary">
                  Acessar Painel
                </Link>
              </li>
            </ul>
          </div>

          {/* Support / Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
              Segurança & Suporte
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <span className="text-muted-foreground">Criptografia Ponta a Ponta</span>
              </li>
              <li>
                <span className="text-muted-foreground">Homologado Anatel</span>
              </li>
              <li>
                <span className="text-muted-foreground">Central de Atendimento 24h</span>
              </li>
              <li>
                <a href="mailto:contato@rideonbrasil.com" className="hover:text-primary transition-colors">
                  contato@rideonbrasil.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RideOn. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/termos" className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade & LGPD
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

