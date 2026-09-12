"use client";

import Link from "next/link";
import {
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Palette,
  Phone,
  Plus,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { Button } from "@/app/components/ui/button";
import {
  VehicleMiniCard,
  type VehicleCardData,
} from "@/app/dashboard/vehicles/components/vehicle-mini-card";
import { useCurrentUser } from "@/hooks/use-current-user";

type PendingRider = {
  name: string;
  date_of_birth: string;
  phone: string;
};

type View = "loading" | "new" | "pending-card" | "pending-form" | "success";

const ADMIN_PAGE_SIZE = 4;

export default function VehiclesPage() {
  const currentUser = useCurrentUser();
  const [view, setView] = useState<View>("loading");
  const [motorcycles, setMotorcycles] = useState<VehicleCardData[]>([]);
  const [pendingRider, setPendingRider] = useState<PendingRider | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [adminPage, setAdminPage] = useState(1);
  const [showAdminAddForm, setShowAdminAddForm] = useState(false);

  const isAdmin =
    currentUser.status === "authenticated" && currentUser.user.role === "admin";

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchVehicles() {
      try {
        const response = await fetch("/api/vehicles", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as {
          motorcycles?: VehicleCardData[];
          pendingRider?: PendingRider | null;
          role?: string;
        };

        if (!active) return;

        const motos = Array.isArray(data.motorcycles) ? data.motorcycles : [];
        setMotorcycles(motos);
        setPendingRider(data.pendingRider ?? null);

        if (data.pendingRider) {
          setView("pending-card");
        } else {
          setView("new");
        }
      } catch {
        if (!active) return;
        setError("Não foi possível carregar os dados de veículos.");
        setView("new");
      }
    }

    void fetchVehicles();

    return () => {
      active = false;
    };
  }, [reloadTrigger]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const rider = pendingRider ?? {
      name: String(formData.get("name") ?? ""),
      date_of_birth: String(formData.get("date_of_birth") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    };

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rider: {
            name: rider.name,
            date_of_birth: toIsoDate(rider.date_of_birth),
            phone: rider.phone,
          },
          motorcycle: {
            brand: formData.get("brand"),
            model: formData.get("model"),
            year: Number(formData.get("year")),
            color: formData.get("color"),
            license_plate: String(formData.get("license_plate") ?? "")
              .trim()
              .toUpperCase(),
          },
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        pending?: boolean;
        pendingRider?: PendingRider | null;
      };

      if (!response.ok) {
        if (data.pending && data.pendingRider) {
          setPendingRider(data.pendingRider);
          setView("pending-card");
        }
        throw new Error(
          data.message ?? "Não foi possível cadastrar o veículo.",
        );
      }

      setPendingRider(null);
      setView("success");
      setShowAdminAddForm(false);
      setReloadTrigger((prev) => prev + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível cadastrar o veículo.",
      );
    } finally {
      setPending(false);
    }
  }

  // Regra de Negócio: Usuário padrão não pode cadastrar mais de 1 veículo
  const hasReachedSingleVehicleLimit = !isAdmin && motorcycles.length >= 1;

  // Paginação para Admin
  const totalAdminPages = Math.max(
    1,
    Math.ceil(motorcycles.length / ADMIN_PAGE_SIZE),
  );
  const currentAdminPage = Math.min(adminPage, totalAdminPages);
  const displayedMotorcycles = isAdmin
    ? motorcycles.slice(
        (currentAdminPage - 1) * ADMIN_PAGE_SIZE,
        currentAdminPage * ADMIN_PAGE_SIZE,
      )
    : motorcycles;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl py-6 space-y-10">
        {/* Page Header */}
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <p className="section-kicker">Veículos</p>
            {isAdmin && (
              <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                Modo Admin
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold uppercase sm:text-4xl text-foreground">
            {isAdmin ? "Gestão de Veículos da Frota" : "Seus Veículos & Cadastro"}
          </h1>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-6 text-muted-foreground">
            {isAdmin
              ? "Visualize todos os veículos da central com paginação e realize novos cadastros administrativos."
              : "Acompanhe sua moto vinculada ou conclua o cadastro para iniciar o monitoramento em tempo real."}
          </p>
        </header>

        {/* Global Error Banner */}
        {error && (
          <p
            role="alert"
            className="border border-primary bg-primary/10 p-4 text-sm font-medium text-primary"
          >
            {error}
          </p>
        )}

        {/* Loading Indicator */}
        {view === "loading" && (
          <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <Bike className="mx-auto size-8 animate-pulse text-primary mb-3" />
            Carregando veículos cadastrados...
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 1: MINI CARDS DOS VEÍCULOS CADASTRADOS (LADO A LADO ACIMA DO FORM)   */}
        {/* ========================================================================= */}
        {view !== "loading" && motorcycles.length > 0 && (
          <section aria-labelledby="registered-vehicles-title" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <Bike className="size-5 text-primary" />
                <h2 id="registered-vehicles-title" className="text-lg font-bold uppercase tracking-tight text-foreground">
                  {isAdmin ? "Veículos Cadastrados na Frota" : "Sua Motocicleta"}
                </h2>
                <span className="rounded bg-secondary px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                  {motorcycles.length} {motorcycles.length === 1 ? "veículo" : "veículos"}
                </span>
              </div>

              {/* Controles de Paginação para Admin */}
              {isAdmin && totalAdminPages > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Pág. <b>{currentAdminPage}</b> de <b>{totalAdminPages}</b>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                      disabled={currentAdminPage <= 1}
                      className="grid size-7 place-items-center border border-border bg-secondary text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
                      title="Página Anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {Array.from({ length: totalAdminPages }, (_, idx) => idx + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setAdminPage(pageNum)}
                        className={`size-7 text-xs font-bold transition-colors ${
                          pageNum === currentAdminPage
                            ? "bg-primary text-white"
                            : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
                      disabled={currentAdminPage >= totalAdminPages}
                      className="grid size-7 place-items-center border border-border bg-secondary text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
                      title="Próxima Página"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Grid dos Mini Cards Lado a Lado */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedMotorcycles.map((moto, index) => (
                <VehicleMiniCard
                  key={moto.id || moto.license_plate || index}
                  vehicle={moto}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 2: FORMULÁRIOS / REGRA DE NEGÓCIO DE LIMITE DE 1 VEÍCULO            */}
        {/* ========================================================================= */}

        {/* Aviso de Limite Atingido para Usuário Padrão */}
        {hasReachedSingleVehicleLimit && view !== "loading" && (
          <section className="border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="size-6" />
              </span>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Limite de Cadastro Atingido
                </span>
                <h3 className="text-xl font-bold uppercase text-foreground">
                  Você já possui 1 veículo cadastrado
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Usuários com perfil de piloto comum têm direito ao cadastro de 1 veículo ativo por conta.
                  Sua moto já está cadastrada e visível no card acima com proteção e telemetria disponíveis.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 border border-primary bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/90"
              >
                <span>Acessar Monitoramento ao Vivo</span>
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Cadastro Pendente (Step 1 do cadastro por cookie) */}
        {view === "pending-card" && pendingRider && (
          <section className="border border-primary/50 bg-card p-6 space-y-3 max-w-2xl">
            <p className="section-kicker">Cadastro Pendente</p>
            <h2 className="text-xl font-bold uppercase">Piloto registrado, moto pendente</h2>
            <p className="text-xs text-muted-foreground">
              Você já iniciou o cadastro do piloto. Clique abaixo para finalizar a vinculação da motocicleta.
            </p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setView("pending-form");
              }}
              className="mt-3 flex w-full items-center gap-4 border border-primary bg-secondary p-4 text-left transition-colors hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="grid size-10 shrink-0 place-items-center bg-primary text-primary-foreground">
                <UserRound className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">
                  {pendingRider.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Tel: {pendingRider.phone} • Nasc: {pendingRider.date_of_birth.slice(0, 10)}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                <span>Continuar</span>
                <ChevronRight className="size-4" />
              </span>
            </button>
          </section>
        )}

        {/* Sucesso de Cadastro */}
        {view === "success" && (
          <section className="border border-primary bg-card p-6 sm:p-8 max-w-2xl space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 className="size-8" />
              <h2 className="text-2xl font-bold uppercase">Moto cadastrada com sucesso!</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-6">
              O piloto e a motocicleta já estão vinculados à sua central e prontos para monitoramento.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 border border-primary bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/90"
              >
                <span>Ir para a Dashboard</span>
                <ChevronRight className="size-4" />
              </Link>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setView("new");
                    setShowAdminAddForm(true);
                  }}
                  className="inline-flex items-center gap-2 border border-border bg-secondary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary"
                >
                  <Plus className="size-4" />
                  <span>Cadastrar Outro Veículo</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Formulário de Cadastro: exibido se não atingiu o limite ou se for admin */}
        {((!hasReachedSingleVehicleLimit && (view === "new" || view === "pending-form")) ||
          (isAdmin && showAdminAddForm)) && (
          <div className="space-y-6">
            {isAdmin && motorcycles.length > 0 && (
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-4 text-primary" />
                  <span>Cadastro Administrativo de Novo Veículo na Frota</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminAddForm(false)}
                  className="text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                >
                  Fechar Formulário
                </button>
              </div>
            )}

            <form onSubmit={submit} className="max-w-3xl space-y-8">
              {/* Piloto */}
              <section className="border border-border bg-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <UserRound className="size-5 text-primary" />
                  <h2 className="text-lg font-bold uppercase">Piloto Responsável</h2>
                </div>
                {pendingRider ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <FixedField label="Nome" value={pendingRider.name} />
                    <FixedField
                      label="Nascimento"
                      value={pendingRider.date_of_birth.slice(0, 10)}
                    />
                    <FixedField label="Telefone" value={pendingRider.phone} />
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Nome completo"
                      name="name"
                      icon={UserRound}
                      autoComplete="name"
                      placeholder="Ex: Carlos Silva"
                    />
                    <FormField
                      label="Telefone"
                      name="phone"
                      icon={Phone}
                      type="tel"
                      autoComplete="tel"
                      placeholder="Ex: +55 11 99999-8888"
                    />
                    <FormField
                      label="Data de nascimento"
                      name="date_of_birth"
                      icon={CalendarDays}
                      type="date"
                    />
                  </div>
                )}
              </section>

              {/* Motocicleta */}
              <section className="border border-border bg-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Bike className="size-5 text-primary" />
                  <h2 className="text-lg font-bold uppercase">Dados da Motocicleta</h2>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Marca"
                    name="brand"
                    icon={Bike}
                    placeholder="Ex: Yamaha, Honda, BMW"
                  />
                  <FormField
                    label="Modelo"
                    name="model"
                    icon={Tag}
                    placeholder="Ex: MT-07, CB 500F"
                  />
                  <FormField
                    label="Ano"
                    name="year"
                    icon={CalendarDays}
                    type="number"
                    min="1900"
                    max={String(new Date().getFullYear() + 1)}
                    placeholder="Ex: 2024"
                  />
                  <FormField
                    label="Cor"
                    name="color"
                    icon={Palette}
                    placeholder="Ex: Preto, Azul, Vermelho"
                  />
                  <FormField
                    label="Placa (Padrão Mercosul ou Tradicional)"
                    name="license_plate"
                    icon={Tag}
                    placeholder="Ex: BRA2E19"
                    className="sm:col-span-2"
                  />
                </div>
              </section>

              <Button type="submit" disabled={pending} className="w-full">
                {pending
                  ? "Salvando..."
                  : pendingRider
                    ? "Concluir cadastro do veículo"
                    : "Cadastrar moto"}
                <ChevronRight className="size-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Botão para Admin abrir formulário caso já tenha veículos e form esteja recolhido */}
        {isAdmin && !showAdminAddForm && motorcycles.length > 0 && view !== "success" && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdminAddForm(true)}
              className="flex items-center gap-2 border border-dashed border-border bg-card/60 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Plus className="size-4 text-primary" />
              <span>Cadastrar Mais um Veículo na Frota</span>
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function FormField({
  label,
  name,
  icon: Icon,
  type = "text",
  className = "",
  ...props
}: {
  label: string;
  name: string;
  icon: typeof UserRound;
  type?: string;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "type" | "className"
>) {
  return (
    <label className={`field-label ${className}`}>
      {label}
      <span className="input-wrap">
        <Icon className="size-4" />
        <input required name={name} type={type} {...props} />
      </span>
    </label>
  );
}

function FixedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 border-b border-border pb-2 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function toIsoDate(value: string) {
  return value.includes("T") ? value : `${value}T00:00:00Z`;
}

