'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  ShieldCheck,
  FileText,
  Lock,
  Radio,
  Clock,
  Wifi,
  AlertTriangle,
  Server,
  KeyRound,
  CheckCircle2,
  ChevronRight,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Share2,
  HelpCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { PublicHeader } from '@/app/components/public-header';
import { FooterSection } from '@/app/components/landing/footer-section';

export type LegalTab = 'termos' | 'privacidade' | 'completo';

interface LegalContentProps {
  initialTab?: LegalTab;
}

export function LegalContent({ initialTab = 'termos' }: LegalContentProps) {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get('tab') as LegalTab | null;

  const [activeTab, setActiveTab] = useState<LegalTab>(
    tabFromQuery && ['termos', 'privacidade', 'completo'].includes(tabFromQuery)
      ? tabFromQuery
      : initialTab
  );

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (tabFromQuery && ['termos', 'privacidade', 'completo'].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?tab=${activeTab}`;
      void navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const termosSections = [
    { id: 'termo-objeto', title: '1. Objeto e Natureza dos Serviços de Telemetria' },
    { id: 'termo-anatel', title: '2. Homologação Obrigatória ANATEL dos Equipamentos' },
    { id: 'termo-fidelidade', title: '3. Plano de Adesão, Fidelidade (4 Meses) e Multa Rescisória' },
    { id: 'termo-conectividade', title: '4. Conectividade, Cobertura Celular e Áreas de Sombra' },
    { id: 'termo-bloqueio', title: '5. Bloqueio Preventivo e Comandos Remotos de Segurança' },
    { id: 'termo-pagamentos', title: '6. Valores, Faturamento, Inadimplência e Suspensão' },
    { id: 'termo-obrigacoes', title: '7. Deveres do Cliente e Boas Práticas Automotivas' },
    { id: 'termo-vigencia', title: '8. Vigência, Renovação e Disposições Gerais' },
  ];

  const privacidadeSections = [
    { id: 'priv-compromisso', title: '1. Compromisso com a Privacidade e Conformidade LGPD' },
    { id: 'priv-dados', title: '2. Categorias de Dados Coletados (Cadastro e Telemetria)' },
    { id: 'priv-finalidade', title: '3. Finalidades e Bases Legais de Tratamento' },
    { id: 'priv-infra', title: '4. Infraestrutura em Nuvem, Criptografia e Segurança' },
    { id: 'priv-compartilhamento', title: '5. Compartilhamento e Não Comercialização de Dados' },
    { id: 'priv-retencao', title: '6. Retenção, Histórico e Eliminação de Registros' },
    { id: 'priv-direitos', title: '7. Seus Direitos como Titular de Dados (Art. 18 LGPD)' },
    { id: 'priv-dpo', title: '8. Canal do DPO (Encarregado de Proteção de Dados)' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-white">
      <PublicHeader />

      <main className="pt-24 pb-20">
        {/* Hero Header */}
        <div className="relative border-b border-border/60 bg-gradient-to-b from-card/80 via-background to-background py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                <span>Voltar ao início</span>
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  title="Copiar link desta página"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="size-3.5" />
                      <span>Compartilhar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  title="Imprimir documento oficial"
                >
                  <Printer className="size-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>

            <div className="mt-8 max-w-3xl">
              <span className="section-kicker">Termos Legais e Segurança</span>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Termos de Uso e Política de Privacidade
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Conheça as diretrizes operacionais de nossos serviços de telemetria e rastreamento inteligente,
                as regras do plano de adesão e as garantias de conformidade com a regulamentação brasileira
                (ANATEL e LGPD).
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" />
                  Última revisão: Novembro de 2026
                </span>
                <span>•</span>
                <span>Versão 2.4 - Vigente em território nacional</span>
              </div>
            </div>

            {/* Core Business Metrics Cards */}
            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {/* Card 1: Uptime */}
              <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Activity className="size-4" />
                  </span>
                  <span className="size-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                </div>
                <p className="mt-4 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                  99.98%
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">
                  UPTIME DO SISTEMA
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Servidores em nuvem de alta disponibilidade
                </p>
              </div>

              {/* Card 2: Envio de Alertas */}
              <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Clock className="size-4" />
                  </span>
                  <span className="size-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                </div>
                <p className="mt-4 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                  &lt; 1.5S
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">
                  ENVIO DE ALERTAS
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Notificação instantânea em caso de violação
                </p>
              </div>

              {/* Card 3: Cobertura Nacional */}
              <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Wifi className="size-4" />
                  </span>
                  <span className="size-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                </div>
                <p className="mt-4 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                  4G LTE
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">
                  COBERTURA NACIONAL
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Multi-operadora com chip M2M dedicado
                </p>
              </div>

              {/* Card 4: Monitoramento Ativo */}
              <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card/60 p-5 sm:p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <ShieldCheck className="size-4" />
                  </span>
                  <span className="size-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                </div>
                <p className="mt-4 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                  24 / 7
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">
                  MONITORAMENTO ATIVO
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Proteção ininterrupta onde seu veículo estiver
                </p>
              </div>
            </div>

            {/* Interactive Tab Controller */}
            <div className="mt-10 flex flex-wrap items-center justify-center sm:justify-start border-t border-border/60 pt-6">
              <div className="inline-flex rounded-xl bg-card p-1.5 border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('termos')}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'termos'
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <FileText className="size-4" />
                  <span>Termos de Uso</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('privacidade')}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'privacidade'
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Lock className="size-4" />
                  <span>Política de Privacidade</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('completo')}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'completo'
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <FileCheck2 className="size-4" />
                  <span className="hidden sm:inline">Exibir</span> Ambos os Textos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="mx-auto max-w-7xl px-5 lg:px-8 pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-4 xl:col-span-3">
              <div className="sticky top-28 space-y-6 rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-md">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                    Índice do Documento
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Clique para saltar diretamente à seção:
                  </p>
                </div>

                {(activeTab === 'termos' || activeTab === 'completo') && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Termos de Uso
                    </span>
                    <nav className="space-y-1">
                      {termosSections.map((sec) => (
                        <a
                          key={sec.id}
                          href={`#${sec.id}`}
                          className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <span className="truncate">{sec.title}</span>
                          <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100 text-primary" />
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                {(activeTab === 'privacidade' || activeTab === 'completo') && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Privacidade & LGPD
                    </span>
                    <nav className="space-y-1">
                      {privacidadeSections.map((sec) => (
                        <a
                          key={sec.id}
                          href={`#${sec.id}`}
                          className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <span className="truncate">{sec.title}</span>
                          <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100 text-primary" />
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                {/* Direct Contact Card */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <HelpCircle className="size-4 text-primary" />
                    <span>Dúvidas Jurídicas?</span>
                  </div>
                  <p className="mt-1.5 text-muted-foreground leading-relaxed">
                    Nossa equipe de compliance e nosso Encarregado de Proteção de Dados (DPO) estão à disposição.
                  </p>
                  <a
                    href="mailto:contato@rideonbrasil.com"
                    className="mt-3 inline-block font-semibold text-primary hover:underline"
                  >
                    contato@rideonbrasil.com
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Documents Content */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-12">
              {/* SECTION: TERMOS DE USO */}
              {(activeTab === 'termos' || activeTab === 'completo') && (
                <article className="space-y-8 rounded-2xl border border-border bg-card/30 p-6 md:p-10 shadow-xl">
                  {/* Header Badge */}
                  <div className="border-b border-border/80 pb-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <FileText className="size-3.5" />
                      <span>Instrumento Contratual Oficial</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                      Termos Gerais de Uso e Contrato de Prestação de Serviços de Telemetria Veicular
                    </h2>
                    <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                      Regulamenta o fornecimento de tecnologia de telemetria, rastreamento georreferenciado, conectividade M2M e aplicação digital RideOn.
                    </p>
                  </div>

                  {/* Cláusula 1 */}
                  <section id="termo-objeto" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      1. Objeto e Natureza dos Serviços de Telemetria
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      1.1. O presente instrumento regula a contratação, pelo CLIENTE, dos serviços de telemetria veicular,
                      monitoramento e transmissão de dados georreferenciados ofertados pela <strong className="text-foreground">RideOn Tecnologia</strong>,
                      mediante utilização de dispositivo telemático conectado à rede móvel e aplicação em nuvem (web/mobile).
                    </p>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
                        <div className="text-xs text-amber-200/90 leading-relaxed">
                          <strong className="text-amber-100 font-bold block mb-1">
                            AVISO IMPORTANTE - NATUREZA NÃO SECURITÁRIA:
                          </strong>
                          Os serviços prestados pela RideOn constituem ferramentas tecnológicas de telemetria, gestão veicular,
                          localização e segurança preventiva. A RideOn <strong>não é seguradora</strong>, não opera no regime de seguro veicular
                          e a contratação da plataforma <strong>não substitui a contratação de apólice de seguro</strong>. A RideOn não se
                          responsabiliza por perdas patrimoniais, furtos, roubos, desastres naturais ou acidentes,
                          restando sua obrigação circunscrita à disponibilização da tecnologia e seus sistemas de monitoramento.
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Cláusula 2 - ANATEL */}
                  <section id="termo-anatel" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Radio className="size-5 text-emerald-400" />
                      <span>2. Homologação Obrigatória dos Equipamentos junto à ANATEL</span>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      2.1. <strong className="text-foreground">Conformidade Regulatória Total:</strong> Todos os equipamentos de rastreamento,
                      transceptores GPS/GNSS, antenas integradas e modems de comunicação celular (2G, 4G LTE, Cat-M1 e NB-IoT) disponibilizados,
                      instalados ou homologados pela RideOn para uso em território nacional são rigorosamente
                      <strong className="text-foreground"> certificados e homologados pela Agência Nacional de Telecomunicações (ANATEL)</strong>,
                      em estrito cumprimento à Lei Geral de Telecomunicações (Lei Federal nº 9.472/1997) e à Resolução ANATEL nº 717/2019.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      2.2. A homologação ANATEL atesta que os equipamentos operam dentro dos limites legais de radiofrequência,
                      possuem compatibilidade eletromagnética com os módulos eletrônicos de veículos automotores (sem risco à central de injeção ou chicote original)
                      e não causam interferências prejudiciais aos serviços de telecomunicações do país.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      2.3. <strong className="text-foreground">Vedação de Adulteração e Lacres:</strong> O CLIENTE compromete-se a não violar,
                      abrir, clonar, remover lacres técnicos ou modificar o firmware e a estrutura física dos dispositivos instalados,
                      sob pena de perda imediata da garantia operacional e imputação de perdas e danos decorrentes.
                    </p>
                  </section>

                  {/* Cláusula 3 - PLANO DE ADESÃO E FIDELIDADE */}
                  <section id="termo-fidelidade" className="scroll-mt-28 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Clock className="size-5 text-primary" />
                      <span>3. Plano de Adesão, Período de Fidelidade Mínima (4 Meses) e Multa Rescisória</span>
                    </h3>

                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="size-5 shrink-0 text-primary mt-0.5" />
                        <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                          <p className="text-sm font-bold text-foreground">
                            Regra do Plano de Adesão - Permanência Mínima de 4 (Quatro) Meses
                          </p>
                          <p>
                            3.1. A contratação dos serviços por meio do <strong className="text-foreground">Plano de Adesão </strong>
                            compreende a disponibilização da infraestrutura de software, o fornecimento ou cessão do equipamento rastreador
                            devidamente homologado pela ANATEL e a ativação de linha dedicada de transmissão de dados (chip telemático M2M/IoT).
                          </p>
                          <p>
                            3.2. Em razão dos custos operacionais de ativação, logística, integração técnica de hardware e provisionamento de linha,
                            o CLIENTE adere expressamente ao compromisso de <strong className="text-foreground">permanência mínima ininterrupta
                              de pelo menos 4 (quatro) meses</strong> na assinatura do Plano Básico (ou plano contratado).
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 sm:p-5">
                      <h4 className="text-sm font-bold text-destructive-foreground flex items-center gap-2">
                        <AlertTriangle className="size-4 text-primary" />
                        <span>Rescisão Antecipada e Cálculo da Multa Rescisória</span>
                      </h4>
                      <div className="mt-2 text-xs text-muted-foreground leading-relaxed space-y-2">
                        <p>
                          3.3. <strong className="text-foreground">Incidência de Multa Contratual:</strong> Caso o CLIENTE solicite o cancelamento,
                          distrato, rescisão antecipada da assinatura ou dê causa ao cancelamento por inadimplência antes de completados
                          os <strong className="text-foreground">4 (quatro) meses iniciais de permanência mínima</strong>, será gerada e cobrada
                          uma multa compensatória rescisória.
                        </p>
                        <p>
                          3.4. <strong className="text-foreground">Critério de Cálculo da Multa:</strong> A multa rescisória corresponderá
                          exatamente ao <strong className="text-foreground">valor integral de todas as mensalidades restantes</strong> até
                          o atingimento do período mínimo de 4 meses do plano contratado, acrescido do vencimento corrente proporcional aos serviços já prestados:
                        </p>
                        <div className="mt-3 rounded-lg bg-card/80 p-3 font-mono text-[11px] text-foreground border border-border">
                          MULTA RESCISÓRIA = (4 - Meses Efetivamente Adimplidos) × Valor da Mensalidade do Plano Básico
                        </div>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-[11px]">
                          <li>Cancelamento no 1º mês: Multa equivalente a 3 (três) mensalidades restantes;</li>
                          <li>Cancelamento no 2º mês: Multa equivalente a 2 (duas) mensalidades restantes;</li>
                          <li>Cancelamento no 3º mês: Multa equivalente a 1 (uma) mensalidade restante;</li>
                          <li>Cancelamento a partir do término do 4º mês: <strong>Isenção integral de multa rescisória</strong>.</li>
                        </ul>
                        <p className="pt-2">
                          3.5. <strong className="text-foreground">Equipamentos sob Comodato:</strong> Sendo o equipamento fornecido sob modalidade de comodato ou locação,
                          o CLIENTE deverá proceder à sua devolução ou permitir o agendamento de desinstalação técnica em até 10 (dez) dias corridos
                          após o término do contrato, sob pena de cobrança do valor de reposição de mercado do hardware.
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      3.6. <strong className="text-foreground">Término do Período de Fidelidade:</strong> Concluídos os 4 (quatro) meses de carência,
                      a assinatura prosseguirá por prazo indeterminado, podendo o CLIENTE solicitar a rescisão a qualquer momento,
                      sem aplicação de penalidade por fidelidade, mediante aviso prévio formal de 30 (trinta) dias e quitação da fatura do mês em curso.
                    </p>
                  </section>

                  {/* Cláusula 4 */}
                  <section id="termo-conectividade" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      4. Conectividade, Cobertura Celular e Áreas de Sombra
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      4.1. O envio das posições de telemetria depende conjuntamente da recepção de satélites de navegação (GPS/GLONASS)
                      e da disponibilidade de rede de dados das concessionárias de telefonia celular no Brasil.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      4.2. Em locais conhecidos como &ldquo;áreas de sombra&rdquo; (subsolos profundos, garagens subterrâneas com blindagem,
                      túneis longos, áreas remotas sem cobertura de sinal de telecomunicações) ou quando houver utilização criminosa de dispositivos
                      inibidores ilegais de frequência (&ldquo;jammers&rdquo;), a comunicação poderá sofrer oscilações ou atrasos até o restabelecimento
                      do sinal de rádio, gravando os dados em memória interna (buffer) do rastreador para posterior sincronização.
                    </p>
                  </section>

                  {/* Cláusula 5 */}
                  <section id="termo-bloqueio" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      5. Bloqueio Preventivo e Comandos Remotos de Segurança
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      5.1. Quando o plano contratado contemplar a funcionalidade de corte ou bloqueio remoto da ignição, o acionamento é de
                      responsabilidade e iniciativa exclusiva do CLIENTE ou de sua autorização expressa à central de monitoramento.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      5.2. Em observância às normas do Conselho Nacional de Trânsito (CONTRAN) e à segurança viária, os comandos de bloqueio
                      são configurados com validação telemática de velocidade e parada segura, a fim de evitar acidentes e preservar a integridade
                      dos ocupantes da via pública.
                    </p>
                  </section>

                  {/* Cláusula 6 */}
                  <section id="termo-pagamentos" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      6. Valores, Faturamento, Inadimplência e Suspensão
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      6.1. O valor das mensalidades e taxas de adesão será cobrado nos moldes escolhidos no ato do cadastro
                      (Cartão de Crédito, Boleto Bancário ou PIX).
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      6.2. O inadimplemento superior a 15 (quinze) dias ensejará a suspensão provisória dos acessos à plataforma e
                      ao tráfego do chip telemático. Atrasos superiores a 45 (quarenta e cinco) dias ensejam a rescisão motivada,
                      com a aplicação imediata da multa prevista na Cláusula 3 caso ainda vigente o período de fidelidade mínima.
                    </p>
                  </section>

                  {/* Cláusula 7 */}
                  <section id="termo-obrigacoes" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      7. Deveres do Cliente e Boas Práticas Automotivas
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      7.1. O CLIENTE obriga-se a manter a parte elétrica e bateria do veículo em bom estado de conservação, garantindo
                      alimentação estável ao equipamento de telemetria;
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      7.2. Manter seus dados cadastrais, números de telefone de emergência e condutores autorizados devidamente atualizados no aplicativo;
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      7.3. Comunicar imediatamente à RideOn qualquer indício de mau funcionamento ou avaria no equipamento instalado.
                    </p>
                  </section>

                  {/* Cláusula 8 */}
                  <section id="termo-vigencia" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      8. Vigência, Foro e Disposições Gerais
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      8.1. O presente instrumento é regido pelas leis da República Federativa do Brasil. Para dirimir eventuais litígios
                      decorrentes deste contrato, as partes elegem o foro da Comarca de domicílio do CLIENTE para relações de consumo, ou a comarca
                      da sede da contratada para pessoas jurídicas, com expressa renúncia a qualquer outro.
                    </p>
                  </section>
                </article>
              )}

              {/* SECTION: POLÍTICA DE PRIVACIDADE */}
              {(activeTab === 'privacidade' || activeTab === 'completo') && (
                <article className="space-y-8 rounded-2xl border border-border bg-card/30 p-6 md:p-10 shadow-xl">
                  {/* Header Badge */}
                  <div className="border-b border-border/80 pb-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                      <Lock className="size-3.5" />
                      <span>Lei Geral de Proteção de Dados Pessoais</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                      Política de Privacidade, Proteção de Dados e Segurança da Informação (LGPD)
                    </h2>
                    <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                      Entenda como coletamos, tratamos, criptografamos e protegemos seus dados pessoais e telemáticos, em plena conformidade com a Lei Federal nº 13.709/2018 (LGPD).
                    </p>
                  </div>

                  {/* Seção 1 */}
                  <section id="priv-compromisso" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <ShieldCheck className="size-5 text-blue-400" />
                      <span>1. Compromisso com a Privacidade e Conformidade com a LGPD</span>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      1.1. A <strong className="text-foreground">RideOn Tecnologia</strong> reafirma seu compromisso inegociável com a segurança,
                      confidencialidade e integridade dos dados pessoais de seus usuários e clientes. Nossas operações de tratamento de dados
                      obedecem estritamente aos princípios de finalidade, necessidade, transparência, segurança, prevenção e não discriminação
                      estabelecidos pela Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018 - LGPD), pelo Marco Civil da Internet
                      (Lei nº 12.965/2014) e pelas diretrizes da Autoridade Nacional de Proteção de Dados (ANPD).
                    </p>
                  </section>

                  {/* Seção 2 */}
                  <section id="priv-dados" className="scroll-mt-28 space-y-4">
                    <h3 className="text-lg font-bold text-foreground">
                      2. Categorias de Dados Coletados (Cadastro e Telemetria)
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Para operacionalizar a prestação de serviços de rastreamento veicular e gestão de frotas, realizamos o tratamento das seguintes categorias de dados:
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                          A. Dados Cadastrais e de Identificação
                        </span>
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <li>• Nome completo ou Razão Social</li>
                          <li>• CPF ou CNPJ</li>
                          <li>• Endereço de e-mail e telefone de contato</li>
                          <li>• Endereço para instalação ou faturamento</li>
                          <li>• Contatos de emergência designados pelo titular</li>
                        </ul>
                      </div>

                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                          B. Dados do Veículo Monitorado
                        </span>
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <li>• Placa de identificação veicular</li>
                          <li>• Número do Chassi e RENAVAM</li>
                          <li>• Marca, modelo, ano de fabricação e cor</li>
                          <li>• Identificador único do dispositivo rastreador (IMEI)</li>
                        </ul>
                      </div>

                      <div className="rounded-xl border border-border bg-card/60 p-4 sm:col-span-2">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                          C. Dados de Telemetria e Geolocalização Contínua
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Emitidos pelos sensores do rastreador homologado e transmitidos via rede de dados:
                        </p>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>• Coordenadas GPS (Lat/Long/Alt)</div>
                          <div>• Velocidade instantânea e média</div>
                          <div>• Status de ignição ligada/desligada</div>
                          <div>• Tensão da bateria do veículo</div>
                          <div>• Eventos de desaceleração ou impacto</div>
                          <div>• Histórico de paradas e deslocamentos</div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Seção 3 */}
                  <section id="priv-finalidade" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      3. Finalidades e Bases Legais de Tratamento
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Cada atividade de tratamento realizada pela RideOn possui fundamento expresso em uma das bases legais previstas no Artigo 7º da LGPD:
                    </p>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Execução de Contrato (Art. 7º, V, LGPD):</strong> Viabilizar a localização em tempo real,
                          alimentação do painel web/mobile, envio de alertas de ignição, rotas e manutenção preventiva do veículo.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Legítimo Interesse e Segurança Patrimonial (Art. 7º, IX, LGPD):</strong> Prevenção de sinistros,
                          recuperação em casos de roubo/furto comunicados e melhoria contínua de estabilidade dos servidores.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Cumprimento de Obrigação Legal e Regulatória (Art. 7º, II, LGPD):</strong> Guarda de registros de conexão
                          pelo prazo de 6 meses nos termos do Marco Civil da Internet (Lei nº 12.965/2014) e emissão de notas fiscais junto aos órgãos fazendários.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Proteção ao Crédito e Prevenção a Fraudes (Art. 7º, X, LGPD):</strong> Verificação de autenticidade cadastral
                          e processamento seguro de pagamentos.
                        </span>
                      </li>
                    </ul>
                  </section>

                  {/* Seção 4 - INFRAESTRUTURA E CRIPTOGRAFIA */}
                  <section id="priv-infra" className="scroll-mt-28 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Server className="size-5 text-amber-400" />
                      <span>4. Infraestrutura em Nuvem, Criptografia e Medidas de Segurança</span>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      4.1. <strong className="text-foreground">Infraestrutura em Nuvem de Alta Confiabilidade:</strong> Os servidores da RideOn estão hospedados
                      em data centers certificados de classe mundial (Tier III, compatíveis com certificações ISO/IEC 27001 e SOC 2), providos de redundância energética,
                      defesa distribuída contra negação de serviço (DDoS) e cópias de segurança (backups) diárias e criptografadas.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      4.2. <strong className="text-foreground">Criptografia em Trânsito e em Repouso:</strong>
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <Lock className="size-4 text-emerald-400" />
                          <span>Em Trânsito (TLS 1.3 / HTTPS)</span>
                        </div>
                        <p className="mt-2 text-muted-foreground leading-relaxed">
                          Toda a comunicação entre navegadores, smartphones, servidores de telemetria e APIs é protegida por certificados SSL/TLS modernos com cifras fortes.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <KeyRound className="size-4 text-amber-400" />
                          <span>Em Repouso (AES-256)</span>
                        </div>
                        <p className="mt-2 text-muted-foreground leading-relaxed">
                          Bancos de dados e mídias de armazenamento empregam criptografia avançada AES-256 bits, com segregação de credenciais e chaves criptográficas gerenciadas.
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      4.3. <strong className="text-foreground">Conectividade Móvel Segura:</strong> A comunicação entre o rastreador homologado e nossos servidores
                      de telemetria trafega por meio de canais de dados celulares providos por operadoras de telefonia móvel autorizadas pela ANATEL,
                      com transmissão protegida para envio seguro das coordenadas e parâmetros telemáticos.
                    </p>
                  </section>

                  {/* Seção 5 */}
                  <section id="priv-compartilhamento" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      5. Compartilhamento e Não Comercialização de Dados
                    </h3>
                    <div className="rounded-xl border border-border/80 bg-secondary/50 p-4">
                      <p className="text-xs text-foreground font-semibold">
                        NÃO VENDEMOS SEUS DADOS.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        A RideOn jamais comercializa, aluga, troca ou licencia dados cadastrais, logs de rota ou posições de telemetria para anunciantes,
                        empresas de publicidade ou corretores de dados terceiros.
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      5.1. O compartilhamento estritamente necessário ocorre apenas com:
                    </p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                      <li>Concessionárias de telecomunicações operadoras do link de dados M2M homologadas pela ANATEL;</li>
                      <li>Gateways de pagamento bancário autorizados pelo Banco Central para liquidação de faturas;</li>
                      <li>Provedores de infraestrutura de computação em nuvem que atuam sob acordos estritos de confidencialidade e DPA (Data Processing Agreement);</li>
                      <li>Autoridades policiais, bombeiros ou Poder Judiciário, mediante requisição legal competente ou protocolo formal de emergência de roubo/furto.</li>
                    </ul>
                  </section>

                  {/* Seção 6 */}
                  <section id="priv-retencao" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      6. Retenção, Histórico e Eliminação de Registros
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      6.1. O histórico detalhado de posições de telemetria e rotas é mantido ativo para consulta pelo CLIENTE
                      durante o prazo contratual aplicável ao seu plano (ex: 30 a 90 dias no plano básico).
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      6.2. Após o encerramento do contrato, os dados serão conservados exclusivamente pelos prazos necessários ao cumprimento
                      de obrigações fiscais e legais (5 anos pelo Código Tributário Nacional e Código de Defesa do Consumidor; 6 meses para logs de aplicação pelo Marco Civil),
                      sendo em seguida descartados com rotinas de deleção segura.
                    </p>
                  </section>

                  {/* Seção 7 */}
                  <section id="priv-direitos" className="scroll-mt-28 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      7. Seus Direitos como Titular de Dados (Artigo 18 da LGPD)
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Na condição de titular de dados pessoais, o CLIENTE pode, a qualquer momento e de forma gratuita, mediante requisição formal:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                      <div className="rounded-lg border border-border p-2.5">
                        <strong className="text-foreground">Confirmação e Acesso:</strong> Confirmar a existência de tratamento e acessar seus dados.
                      </div>
                      <div className="rounded-lg border border-border p-2.5">
                        <strong className="text-foreground">Correção:</strong> Solicitar a retificação de dados incompletos, inexatos ou desatualizados.
                      </div>
                      <div className="rounded-lg border border-border p-2.5">
                        <strong className="text-foreground">Anonimização ou Bloqueio:</strong> Requerer anonimização de dados desnecessários ou tratados em desconformidade.
                      </div>
                      <div className="rounded-lg border border-border p-2.5">
                        <strong className="text-foreground">Portabilidade:</strong> Solicitar transferência dos seus dados a outro prestador de serviços.
                      </div>
                      <div className="rounded-lg border border-border p-2.5">
                        <strong className="text-foreground">Eliminação:</strong> Requerer a exclusão dos dados tratados com base no consentimento, ressalvadas hipóteses legais.
                      </div>
                      <div className="rounded-lg border border-border p-2.5">
                        <strong className="text-foreground">Revogação:</strong> Revogar consentimento previamente concedido, sendo informado das consequências.
                      </div>
                    </div>
                  </section>

                  {/* Seção 8 */}
                  <section id="priv-dpo" className="scroll-mt-28 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <KeyRound className="size-5 text-primary" />
                      <span>8. Canal do DPO (Encarregado de Proteção de Dados Pessoais)</span>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      8.1. Em atenção ao Artigo 41 da Lei nº 13.709/2018, a RideOn mantém um canal direto com seu Encarregado pelo Tratamento de Dados Pessoais (Data Protection Officer - DPO).
                    </p>

                    <div className="rounded-xl border border-border bg-card/80 p-5 space-y-3">
                      <div className="text-xs space-y-1">
                        <p className="text-muted-foreground">
                          <strong className="text-foreground">Encarregado (DPO):</strong> Setor de Segurança da Informação e Conformidade Regulatória RideOn
                        </p>
                        <p className="text-muted-foreground">
                          <strong className="text-foreground">Canal Exclusivo para Titulares e Contato:</strong>{' '}
                          <a href="mailto:contato@rideonbrasil.com" className="text-primary hover:underline font-semibold">
                            contato@rideonbrasil.com
                          </a>
                        </p>
                        <p className="text-muted-foreground">
                          <strong className="text-foreground">Prazo de Resposta:</strong> Em até 15 (quinze) dias corridos a contar da confirmação de identidade do titular,
                          conforme disposições normativas da ANPD.
                        </p>
                      </div>
                    </div>
                  </section>
                </article>
              )}
            </div>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
