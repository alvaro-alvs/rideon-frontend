"use client";

import {
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Palette,
  Phone,
  Tag,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { Button } from "@/app/components/ui/button";

type PendingRider = {
  name: string;
  date_of_birth: string;
  phone: string;
};

type View = "loading" | "new" | "pending-card" | "pending-form" | "success";

export default function VehiclesPage() {
  const [view, setView] = useState<View>("loading");
  const [pendingRider, setPendingRider] = useState<PendingRider | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPendingRider() {
      try {
        const response = await fetch("/api/vehicles", { cache: "no-store" });
        if (!response.ok) throw new Error();

        const data = (await response.json()) as {
          pendingRider?: PendingRider | null;
        };
        if (!active) return;

        setPendingRider(data.pendingRider ?? null);
        setView(data.pendingRider ? "pending-card" : "new");
      } catch {
        if (!active) return;
        setError("Nao foi possivel carregar seus cadastros pendentes.");
        setView("new");
      }
    }

    void loadPendingRider();
    return () => {
      active = false;
    };
  }, []);

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
          data.message ?? "Nao foi possivel cadastrar o veiculo.",
        );
      }

      setPendingRider(null);
      setView("success");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Nao foi possivel cadastrar o veiculo.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl py-6">
        <p className="section-kicker">Veiculos</p>
        <h1 className="mt-4 text-4xl font-bold uppercase">
          Cadastre sua moto.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Vincule o perfil do piloto e os dados da motocicleta a sua central.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 border border-primary bg-primary/10 p-4 text-sm text-primary"
          >
            {error}
          </p>
        )}

        {view === "loading" && (
          <div className="mt-10 border border-border bg-card p-6 text-sm text-muted-foreground">
            Carregando cadastro de veiculo...
          </div>
        )}

        {view === "pending-card" && pendingRider && (
          <section className="mt-10 max-w-2xl">
            <p className="section-kicker">Cadastro pendente</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setView("pending-form");
              }}
              className="mt-3 flex w-full items-center gap-4 border border-primary bg-card p-5 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="grid size-12 shrink-0 place-items-center bg-primary text-primary-foreground">
                <UserRound className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">
                  {pendingRider.name}
                </span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-[.1em] text-primary">
                  Veiculo pendente
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </button>
          </section>
        )}

        {view === "success" && (
          <section className="mt-10 max-w-2xl border border-primary bg-card p-6">
            <CheckCircle2 className="size-8 text-primary" />
            <h2 className="mt-5 text-2xl font-bold uppercase">
              Moto cadastrada.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              O piloto e a motocicleta ja estao vinculados a sua central.
            </p>
          </section>
        )}

        {(view === "new" || view === "pending-form") && (
          <form onSubmit={submit} className="mt-10 max-w-3xl space-y-8">
            <section className="border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-primary" />
                <h2 className="text-lg font-bold uppercase">Piloto</h2>
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
                  />
                  <FormField
                    label="Telefone"
                    name="phone"
                    icon={Phone}
                    type="tel"
                    autoComplete="tel"
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

            <section className="border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Bike className="size-5 text-primary" />
                <h2 className="text-lg font-bold uppercase">Motocicleta</h2>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FormField label="Marca" name="brand" icon={Bike} />
                <FormField label="Modelo" name="model" icon={Tag} />
                <FormField
                  label="Ano"
                  name="year"
                  icon={CalendarDays}
                  type="number"
                  min="1900"
                  max={String(new Date().getFullYear() + 1)}
                />
                <FormField label="Cor" name="color" icon={Palette} />
                <FormField
                  label="Placa"
                  name="license_plate"
                  icon={Tag}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <Button type="submit" disabled={pending} className="w-full">
              {pending
                ? "Salvando..."
                : pendingRider
                  ? "Concluir cadastro"
                  : "Cadastrar moto"}
              <ChevronRight className="size-4" />
            </Button>
          </form>
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
