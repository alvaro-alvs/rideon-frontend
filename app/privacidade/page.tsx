import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LegalContent } from '../termos/legal-content';

export const metadata: Metadata = {
  title: 'Política de Privacidade e LGPD | RideOn Telemetria & Rastreamento',
  description:
    'Diretrizes de privacidade, segurança da informação, tratamento de dados de telemetria e conformidade com a LGPD e homologação ANATEL da RideOn.',
};

export default function PrivacidadePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
          Carregando política de privacidade...
        </div>
      }
    >
      <LegalContent initialTab="privacidade" />
    </Suspense>
  );
}
