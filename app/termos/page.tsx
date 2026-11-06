import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LegalContent } from './legal-content';

export const metadata: Metadata = {
  title: 'Termos de Uso e Adesão | RideOn Telemetria & Rastreamento',
  description:
    'Termos de uso, regulamentação do plano de adesão com permanência mínima de 4 meses, homologação ANATEL e conformidade com a LGPD.',
};

export default function TermosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
          Carregando termos e políticas...
        </div>
      }
    >
      <LegalContent initialTab="termos" />
    </Suspense>
  );
}
