"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  MapPin,
  Palette,
  Phone,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Unlock,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { Button } from "@/app/components/ui/button";
import { CalendarPicker } from "@/app/components/ui/calendar-picker";
import { LiveTelemetryModal } from "@/app/dashboard/components/live-telemetry-modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  VehicleMiniCard,
  type VehicleCardData,
} from "./components/vehicle-mini-card";
import { VehiclePlatePreview } from "./components/vehicle-plate-preview";
import {
  BrandQuickSelect,
  ColorQuickSelect,
} from "./components/brand-quick-select";

type PendingRider = {
  id?: string;
  name: string;
  date_of_birth: string;
  phone: string;
};

type RegisteredRider = {
  id?: string;
  name: string;
  date_of_birth: string;
  phone: string;
};

type View = "loading" | "new" | "pending-card" | "pending-form" | "success";

const ADMIN_PAGE_SIZE = 6;

export default function VehiclesPage() {
  const currentUser = useCurrentUser();
  const [view, setView] = useState<View>("loading");
  const [motorcycles, setMotorcycles] = useState<VehicleCardData[]>([]);
  const [pendingRider, setPendingRider] = useState<PendingRider | null>(null);
  const [registeredRider, setRegisteredRider] = useState<RegisteredRider | null>(null);
  const [useRegisteredRider, setUseRegisteredRider] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [adminPage, setAdminPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Filtro de busca (Admin ou multi-veículos)
  const [searchQuery, setSearchQuery] = useState("");

  // Live Telemetry Modal
  const [selectedTelemetryMoto, setSelectedTelemetryMoto] =
    useState<VehicleCardData | null>(null);

  // Form interactive state - Piloto
  const [formRiderName, setFormRiderName] = useState("");
  const [formRiderPhone, setFormRiderPhone] = useState("");
  const [formDob, setFormDob] = useState("");

  // Form interactive state - Motocicleta
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formColor, setFormColor] = useState("");

  const isAdmin =
    currentUser.status === "authenticated" && currentUser.user.role === "admin";

  const effectiveRider: RegisteredRider = registeredRider || {
    name:
      currentUser.status === "authenticated" && currentUser.user.email
        ? currentUser.user.email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
        : "Piloto Principal",
    phone: "(11) 99999-8888",
    date_of_birth: "1995-05-15",
  };

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
          riderProfile?: RegisteredRider | null;
          role?: string;
        };

        if (!active) return;

        const motos = Array.isArray(data.motorcycles) ? data.motorcycles : [];
        setMotorcycles(motos);
        setPendingRider(data.pendingRider ?? null);

        // Identifica perfil de piloto existente a partir do backend, motos anteriores ou storage
        let foundProfile = data.riderProfile ?? null;
        if (!foundProfile && motos.length > 0) {
          const firstWithRider = motos.find((m) => m.rider?.name);
          if (firstWithRider?.rider?.name) {
            foundProfile = {
              name: firstWithRider.rider.name,
              phone: firstWithRider.rider.phone || "",
              date_of_birth: "",
            };
          }
        }

        if (!foundProfile && typeof window !== "undefined") {
          try {
            const saved = localStorage.getItem("rideon_saved_rider");
            if (saved) {
              const parsed = JSON.parse(saved) as RegisteredRider;
              if (parsed && typeof parsed.name === "string" && parsed.name) {
                foundProfile = parsed;
              }
            }
          } catch {
            // ignore
          }
        }

        if (foundProfile) {
          setRegisteredRider(foundProfile);
        }

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

  // Handler para aplicar e travar campos com dados cadastrados
  const handleApplyRegisteredRider = () => {
    const riderToUse = registeredRider || effectiveRider;
    setFormRiderName(riderToUse.name || "");
    setFormRiderPhone(formatPhoneNumber(riderToUse.phone || ""));
    if (riderToUse.date_of_birth) {
      setFormDob(riderToUse.date_of_birth.slice(0, 10));
    }
    setUseRegisteredRider(true);
    setError("");
  };

  // Handler para destravar campos e permitir edição manual
  const handleUnlockRiderFields = () => {
    setUseRegisteredRider(false);
  };

  // Alterna o atalho de uso dos dados cadastrados
  const handleToggleRegisteredRider = () => {
    if (useRegisteredRider) {
      handleUnlockRiderFields();
    } else {
      handleApplyRegisteredRider();
    }
  };

  // Formatação de telefone em tempo real
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    let formatted = value;
    if (value.length > 6) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      formatted = `(${value}`;
    }
    setFormRiderPhone(formatted);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const rider = pendingRider ?? {
      name: (formRiderName || String(formData.get("name") ?? "")).trim(),
      date_of_birth: formDob || String(formData.get("date_of_birth") ?? ""),
      phone: (formRiderPhone || String(formData.get("phone") ?? "")).trim(),
    };

    if (!pendingRider) {
      if (!rider.name) {
        setError("Por favor, preencha o nome do piloto responsável.");
        setPending(false);
        return;
      }
      if (!rider.phone) {
        setError("Por favor, preencha o telefone de contato.");
        setPending(false);
        return;
      }
      if (!rider.date_of_birth) {
        setError("Por favor, selecione a data de nascimento.");
        setPending(false);
        return;
      }
    }

    const brand = formBrand || String(formData.get("brand") ?? "");
    const model = formModel || String(formData.get("model") ?? "");
    const color = formColor || String(formData.get("color") ?? "");
    const year = Number(formYear || formData.get("year"));
    const license_plate = (formPlate || String(formData.get("license_plate") ?? ""))
      .trim()
      .toUpperCase();

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
            brand,
            model,
            year,
            color,
            license_plate,
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

      // Salva os dados do piloto localmente para próximos cadastros
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("rideon_saved_rider", JSON.stringify(rider));
        } catch {
          // ignore
        }
      }
      setRegisteredRider(rider);

      setPendingRider(null);
      setView("success");
      setShowAddForm(false);
      // Reset form states
      setFormBrand("");
      setFormModel("");
      setFormPlate("");
      setFormColor("");
      setFormDob("");
      setFormRiderName("");
      setFormRiderPhone("");
      setUseRegisteredRider(false);
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

  // Filtragem e Paginação para Admin
  const filteredMotorcycles = motorcycles.filter((moto) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const plate = (moto.license_plate ?? "").toLowerCase();
    const brand = (moto.brand ?? "").toLowerCase();
    const model = (moto.model ?? "").toLowerCase();
    const riderName = (moto.rider?.name ?? "").toLowerCase();
    return (
      plate.includes(query) ||
      brand.includes(query) ||
      model.includes(query) ||
      riderName.includes(query)
    );
  });

  const totalAdminPages = Math.max(
    1,
    Math.ceil(filteredMotorcycles.length / ADMIN_PAGE_SIZE),
  );
  const currentAdminPage = Math.min(adminPage, totalAdminPages);
  const displayedMotorcycles = isAdmin
    ? filteredMotorcycles.slice(
      (currentAdminPage - 1) * ADMIN_PAGE_SIZE,
      currentAdminPage * ADMIN_PAGE_SIZE,
    )
    : motorcycles;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-10 py-4">
        {/* ========================================================================= */}
        {/* HERO HEADER & STATS SUMMARY BAR                                           */}
        {/* ========================================================================= */}
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-secondary/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Ambient Cyber Grid & Glow Accents */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary border border-primary/20">
                  <Sparkles className="size-3.5" />
                  Central RideOn
                </span>
                {isAdmin ? (
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-400 border border-amber-500/20">
                    Modo Frotas & Administrador
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                    {motorcycles.length > 0 ? "1 Moto Ativa" : "Pronto para Conectar"}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
                {isAdmin ? "Gestão de Veículos da Frota" : "Seus Veículos & Cadastro"}
              </h1>

              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {isAdmin
                  ? "Monitore e gerencie todos os veículos cadastrados na central com telemetria GPS e controle administrativo."
                  : "Acompanhe os dados da sua motocicleta vinculada, verifique a proteção em tempo real ou conclua o cadastro."}
              </p>
            </div>

            {/* Real-time Metrics Bar (4 Cards) */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3.5">
              {/* Metric 1: Total Veículos */}
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5 shadow-inner backdrop-blur-md">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bike className="size-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {isAdmin ? "Total Frota" : "Veículo"}
                  </p>
                  <p className="text-base font-black text-foreground">
                    {view === "loading" ? "..." : motorcycles.length}
                  </p>
                </div>
              </div>

              {/* Metric 2: Rastreamento Ativo */}
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5 shadow-inner backdrop-blur-md">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Radio className="size-4.5 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Rastreamento
                  </p>
                  <p className="text-base font-black text-emerald-400">
                    {view === "loading"
                      ? "..."
                      : motorcycles.length > 0
                        ? `${motorcycles.length} Ativo${motorcycles.length > 1 ? "s" : ""}`
                        : "0 Ativos"}
                  </p>
                </div>
              </div>

              {/* Metric 3: Prontidão de Telemetria */}
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5 shadow-inner backdrop-blur-md">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Activity className="size-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Telemetria
                  </p>
                  <p className="text-base font-black text-blue-400">
                    {motorcycles.length > 0 ? "100% Online" : "Standby"}
                  </p>
                </div>
              </div>

              {/* Metric 4: Alerta de Segurança */}
              {/* <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5 shadow-inner backdrop-blur-md">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <ShieldCheck className="size-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Segurança
                  </p>
                  <p className="text-base font-black text-amber-400">
                    Protegido 24/7
                  </p>
                </div>
              </div> */}
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xl border border-primary/60 bg-primary/10 p-4 text-sm font-medium text-primary shadow-lg"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-primary hover:opacity-75"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {view === "loading" && (
          <div className="rounded-2xl border border-border/80 bg-card/60 p-12 text-center shadow-lg backdrop-blur-md">
            <div className="relative mx-auto mb-4 flex size-14 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-25" />
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
                <Bike className="size-6 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">
              Sincronizando Veículos...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Carregando dados da telemetria e perfil da frota.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 1: VEÍCULOS CADASTRADOS (CARDS MODERNOS & BUSCA)                     */}
        {/* ========================================================================= */}
        {view !== "loading" && motorcycles.length > 0 && (
          <section aria-labelledby="registered-vehicles-title" className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bike className="size-4.5" />
                </div>
                <div>
                  <h2
                    id="registered-vehicles-title"
                    className="text-lg font-black uppercase tracking-tight text-foreground"
                  >
                    {isAdmin ? "Veículos Cadastrados na Frota" : "Sua Motocicleta Conectada"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {motorcycles.length === 1
                      ? "1 veículo monitorado em tempo real"
                      : `${motorcycles.length} veículos registrados`}
                  </p>
                </div>
              </div>

              {/* Barra de Busca para Admin ou se houver mais de 2 veículos */}
              {(isAdmin || motorcycles.length > 2) && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setAdminPage(1);
                      }}
                      placeholder="Buscar por placa, modelo ou piloto..."
                      className="w-full rounded-xl border border-border/80 bg-secondary/80 py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Grid dos Novos Cards Modernos */}
            {displayedMotorcycles.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {displayedMotorcycles.map((moto, index) => (
                  <VehicleMiniCard
                    key={moto.id || moto.license_plate || index}
                    vehicle={moto}
                    isAdmin={isAdmin}
                    onOpenTelemetry={(m) => setSelectedTelemetryMoto(m)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center text-xs text-muted-foreground">
                Nenhum veículo encontrado para a busca &quot;{searchQuery}&quot;.
              </div>
            )}

            {/* Paginação para Admin */}
            {isAdmin && totalAdminPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs">
                <span className="text-muted-foreground">
                  Mostrando página <b>{currentAdminPage}</b> de <b>{totalAdminPages}</b> ({filteredMotorcycles.length} veículos)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                    disabled={currentAdminPage <= 1}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 text-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-30"
                    title="Página Anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {Array.from({ length: totalAdminPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setAdminPage(pageNum)}
                      className={`size-8 rounded-lg text-xs font-bold transition-all ${pageNum === currentAdminPage
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "border border-border/80 bg-secondary/80 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
                    disabled={currentAdminPage >= totalAdminPages}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 text-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-30"
                    title="Próxima Página"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 2: BANNER DE PROTEÇÃO ATIVA (LIMITE 1 VEÍCULO PARA RIDER)           */}
        {/* ========================================================================= */}
        {hasReachedSingleVehicleLimit && view !== "loading" && (
          <section className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-card via-card/90 to-emerald-950/20 p-6 shadow-xl backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-emerald-500/10 blur-2xl" />

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                  <ShieldCheck className="size-7" />
                  <span className="absolute -right-1 -top-1 flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      Proteção RideOn Ativa • Limite de 1 Veículo Atingido
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
                    Sua moto está monitorada e segura
                  </h3>
                  <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Usuários padrão possuem direito a 1 motocicleta conectada simultaneamente.
                    Seu veículo já está vinculado à central de telemetria com rastreamento GPS e alerta antifurto.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary/90 hover:scale-[1.02]"
                >
                  <MapPin className="size-4" />
                  <span>Acessar Painel de Telemetria</span>
                  <ChevronRight className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-secondary px-4 py-3 text-xs font-black uppercase tracking-wider text-foreground transition-all duration-200 hover:border-primary hover:text-primary cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Cadastrar Outro Veículo</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 3: ETAPA PENDENTE DE CADASTRO (STEPPER MODERNO)                      */}
        {/* ========================================================================= */}
        {view === "pending-card" && pendingRider && (
          <section className="overflow-hidden rounded-3xl border border-primary/40 bg-card/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8 space-y-6 max-w-3xl mx-auto">
            {/* Stepper Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Etapa 2 de 2 • Finalizar Cadastro
                </span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                  Piloto Registrado, Moto Pendente
                </h2>
              </div>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary border border-primary/30">
                Aguardando Motocicleta
              </span>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Você já registrou os dados do piloto responsável. Agora basta adicionar as especificações da motocicleta para concluir o vínculo com o rastreador.
            </p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setView("pending-form");
              }}
              className="group flex w-full items-center gap-4 rounded-2xl border border-primary/40 bg-secondary/60 p-5 text-left transition-all duration-300 hover:border-primary hover:bg-secondary hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
                <UserRound className="size-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {pendingRider.name}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Tel: <b className="text-foreground font-mono">{pendingRider.phone}</b></span>
                  <span>•</span>
                  <span>Nascimento: <b className="text-foreground">{pendingRider.date_of_birth.slice(0, 10)}</b></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span>Vincular Moto</span>
                <ChevronRight className="size-4" />
              </div>
            </button>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 4: SUCESSO DE CADASTRO                                               */}
        {/* ========================================================================= */}
        {view === "success" && (
          <section className="overflow-hidden rounded-3xl border border-emerald-500/40 bg-card/90 p-8 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto space-y-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="size-9" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Operação Concluída com Sucesso
                </span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                  Veículo Cadastrado com Sucesso!
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  O piloto e a motocicleta foram conectados com sucesso à central RideOn. A telemetria já está ativa e pronta para acompanhamento em tempo real.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02]"
              >
                <span>Ir para o Painel de Telemetria</span>
                <ChevronRight className="size-4" />
              </Link>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setView("new");
                    setShowAddForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-secondary px-5 py-3 text-xs font-black uppercase tracking-wider text-foreground transition-all hover:border-primary hover:text-primary"
                >
                  <Plus className="size-4" />
                  <span>Cadastrar Outro Veículo</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}s
        {/* SEÇÃO 5: FORMULÁRIO DE CADASTRO COM PREVIEW DE PLACA EM TEMPO REAL        */}
        {/* ========================================================================= */}
        {((motorcycles.length === 0 && (view === "new" || view === "pending-form")) || showAddForm) && (
          <div id="vehicle-form-section" className="space-y-6">
            {motorcycles.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 px-5 py-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Info className="size-4 text-primary" />
                  <span>
                    {isAdmin
                      ? "Cadastro Administrativo de Novo Veículo na Frota"
                      : "Cadastro de Nova Motocicleta na Central"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-foreground transition-all cursor-pointer"
                >
                  <X className="size-3.5" />
                  <span>Fechar Formulário</span>
                </button>
              </div>
            )}

            <form onSubmit={submit} className="space-y-8">
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Coluna Esquerda: Dados da Moto (ACIMA) e Piloto (ABAIXO) */}
                <div className="space-y-8 lg:col-span-8">
                  {/* ========================================================= */}
                  {/* SEÇÃO 1 (ACIMA): DADOS DA MOTOCICLETA                     */}
                  {/* ========================================================= */}
                  <section className="relative z-20 rounded-3xl border border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <Bike className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                          Dados da Motocicleta
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Especifique a marca, modelo, ano, cor e placa do veículo
                        </p>
                      </div>
                    </div>

                    {/* Quick Selectors de Marca e Cor */}
                    <div className="space-y-4 rounded-2xl border border-border/60 bg-secondary/40 p-4">
                      <BrandQuickSelect
                        selectedBrand={formBrand}
                        onSelect={(brand) => setFormBrand(brand)}
                      />
                      <ColorQuickSelect
                        selectedColor={formColor}
                        onSelect={(color) => setFormColor(color)}
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        label="Marca"
                        name="brand"
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        icon={Bike}
                        placeholder="Ex: Yamaha, Honda, BMW"
                      />
                      <FormField
                        label="Modelo"
                        name="model"
                        value={formModel}
                        onChange={(e) => setFormModel(e.target.value)}
                        icon={Tag}
                        placeholder="Ex: MT-07, CB 500F, F 850 GS"
                      />
                      <FormField
                        label="Ano de Fabricação"
                        name="year"
                        value={formYear}
                        onChange={(e) => setFormYear(e.target.value)}
                        icon={CalendarDays}
                        type="number"
                        min="1900"
                        max={String(new Date().getFullYear() + 1)}
                        placeholder="Ex: 2024"
                      />
                      <FormField
                        label="Cor Predominante"
                        name="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        icon={Palette}
                        placeholder="Ex: Preto, Vermelho, Azul"
                      />
                      <FormField
                        label="Placa (Padrão Mercosul ou Tradicional)"
                        name="license_plate"
                        value={formPlate}
                        onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                        icon={Tag}
                        maxLength={8}
                        placeholder="Ex: BRA2E19 ou ABC1234"
                        className="sm:col-span-2"
                      />
                    </div>
                  </section>

                  {/* ========================================================= */}
                  {/* SEÇÃO 2 (ABAIXO): PILOTO RESPONSÁVEL COM ATALHO DE TRAVA  */}
                  {/* ========================================================= */}
                  <section className="relative z-10 rounded-3xl border border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8 space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-10 items-center justify-center rounded-xl transition-all duration-300 ${useRegisteredRider
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                              : "bg-primary/10 text-primary border border-primary/20"
                            }`}
                        >
                          {useRegisteredRider ? (
                            <ShieldCheck className="size-5.5" />
                          ) : (
                            <UserRound className="size-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                              Piloto Responsável
                            </h2>
                            {useRegisteredRider && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                                <Lock className="size-2.5" />
                                Dados Travados
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {pendingRider
                              ? "Piloto pré-registrado na etapa anterior"
                              : useRegisteredRider
                                ? "Preenchido e protegido com seu cadastro oficial"
                                : "Informe os dados de identificação do condutor"}
                          </p>
                        </div>
                      </div>

                      {/* Atalho de Preenchimento Automático e Trava */}
                      {!pendingRider && (
                        <button
                          type="button"
                          onClick={handleToggleRegisteredRider}
                          className={`group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md ${useRegisteredRider
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-primary text-white shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02]"
                            }`}
                          title={
                            useRegisteredRider
                              ? "Clique para destravar e editar os campos"
                              : "Preencher campos com dados cadastrados e travar"
                          }
                        >
                          {useRegisteredRider ? (
                            <>
                              <Lock className="size-3.5 text-emerald-400" />
                              <span>Usando Cadastro (Travado)</span>
                              <span className="text-[10px] lowercase text-emerald-400/80 font-normal">
                                [destravar]
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3.5 animate-pulse" />
                              <span>Preencher com Meus Dados</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {pendingRider ? (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <FixedField label="Nome Completo" value={pendingRider.name} />
                        <FixedField
                          label="Data de Nascimento"
                          value={pendingRider.date_of_birth.slice(0, 10)}
                        />
                        <FixedField label="Telefone" value={pendingRider.phone} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Barra Switch / Checkbox de Atalho Rápido */}
                        <div
                          onClick={handleToggleRegisteredRider}
                          className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${useRegisteredRider
                              ? "border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-500/5"
                              : "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors ${useRegisteredRider
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "border-2 border-muted-foreground/50 bg-background"
                                }`}
                            >
                              {useRegisteredRider && <Lock className="size-3.5" />}
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-foreground">
                                {useRegisteredRider
                                  ? "Dados do Piloto Travados com seu Cadastro"
                                  : "Preencher Automaticamente com Meus Dados"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {useRegisteredRider
                                  ? `Vinculado ao perfil: ${effectiveRider.name} (${formatPhoneNumber(effectiveRider.phone)})`
                                  : `Clique para autocompletar e travar os campos com os dados de ${effectiveRider.name}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {useRegisteredRider ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400">
                                <Unlock className="size-3" />
                                <span>Clique p/ Destravar</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                                <Sparkles className="size-3" />
                                <span>Ativar Atalho</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField
                            label="Nome Completo"
                            name="name"
                            icon={UserRound}
                            autoComplete="name"
                            placeholder="Ex: Carlos Silva"
                            value={formRiderName}
                            onChange={(e) => setFormRiderName(e.target.value)}
                            readOnly={useRegisteredRider}
                            isLocked={useRegisteredRider}
                            className="sm:col-span-2"
                          />
                          <FormField
                            label="Telefone com DDD"
                            name="phone"
                            icon={Phone}
                            type="tel"
                            autoComplete="tel"
                            placeholder="Ex: (11) 99999-8888"
                            value={formRiderPhone}
                            onChange={handlePhoneChange}
                            readOnly={useRegisteredRider}
                            isLocked={useRegisteredRider}
                          />
                          <CalendarPicker
                            label="Data de Nascimento"
                            name="date_of_birth"
                            value={formDob}
                            onChange={setFormDob}
                            placeholder="Selecione sua data de nascimento"
                            required
                            disabled={useRegisteredRider}
                            mode="birthdate"
                            maxDate={new Date().toISOString().split("T")[0]}
                          />
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                {/* Coluna Direita: Live Plate Preview & Resumo */}
                <div className="space-y-6 lg:col-span-4">
                  <div className="sticky top-6 space-y-6">
                    {/* Live Mercosul Plate Preview Box */}
                    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur-xl text-center space-y-4">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Zap className="size-3.5 text-primary" />
                        <span>Preview da Placa Mercosul</span>
                      </div>

                      <div className="flex justify-center py-2">
                        <VehiclePlatePreview
                          plate={formPlate || "RIDEON"}
                          size="lg"
                        />
                      </div>

                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        A placa é formatada e vinculada à sua central para identificação rápida nos alertas de telemetria.
                      </p>
                    </div>

                    {/* Card de Resumo Rápido */}
                    <div className="overflow-hidden rounded-3xl border border-border/70 bg-secondary/40 p-6 backdrop-blur-xl space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary">
                        Resumo do Cadastro
                      </h4>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between border-b border-border/40 pb-1.5">
                          <span className="text-muted-foreground">Marca/Modelo:</span>
                          <span className="font-bold text-foreground">
                            {formBrand || formModel
                              ? `${formBrand} ${formModel}`.trim()
                              : "Não informado"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/40 pb-1.5">
                          <span className="text-muted-foreground">Ano:</span>
                          <span className="font-bold text-foreground">
                            {formYear || "Não informado"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/40 pb-1.5">
                          <span className="text-muted-foreground">Cor:</span>
                          <span className="font-bold text-foreground">
                            {formColor || "Não informado"}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={pending}
                        className="w-full justify-center rounded-xl bg-primary py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02]"
                      >
                        {pending ? (
                          "Salvando Dados..."
                        ) : pendingRider ? (
                          "Concluir Vínculo do Veículo"
                        ) : (
                          "Salvar e Ativar Veículo"
                        )}
                        <ChevronRight className="size-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Botão para abrir formulário caso já tenha veículos e form esteja recolhido */}
        {!showAddForm && motorcycles.length > 0 && view !== "success" && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setTimeout(() => {
                  document.getElementById("vehicle-form-section")?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 bg-card/40 p-5 text-xs font-black uppercase tracking-widest text-muted-foreground backdrop-blur-md transition-all duration-300 hover:border-primary hover:bg-secondary hover:text-foreground hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Plus className="size-4" />
              </div>
              <span>{isAdmin ? "Cadastrar Novo Veículo na Frota RideOn" : "Cadastrar Nova Motocicleta na Central"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE TELEMETRIA AO VIVO (ACESSADO DIRETO DO CARD)                     */}
      {/* ========================================================================= */}
      {selectedTelemetryMoto && (
        <LiveTelemetryModal
          isOpen={Boolean(selectedTelemetryMoto)}
          onClose={() => setSelectedTelemetryMoto(null)}
          motorcycleId={selectedTelemetryMoto.id}
          motorcycleInfo={{
            model:
              `${selectedTelemetryMoto.brand ?? ""} ${selectedTelemetryMoto.model ?? ""}`.trim() ||
              "Motocicleta",
            licensePlate: selectedTelemetryMoto.license_plate || "SEM PLACA",
          }}
        />
      )}
    </DashboardShell>
  );
}

function FormField({
  label,
  name,
  icon: Icon,
  type = "text",
  className = "",
  value,
  onChange,
  disabled,
  readOnly,
  isLocked = false,
  ...props
}: {
  label: string;
  name: string;
  icon: typeof UserRound;
  type?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  isLocked?: boolean;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "type" | "className" | "value" | "onChange" | "disabled" | "readOnly"
>) {
  return (
    <label className={`grid gap-2 text-xs font-bold uppercase tracking-wider text-foreground ${className}`}>
      <span className="flex items-center justify-between">
        <span>{label}</span>
        {isLocked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
            <Lock className="size-2.5" />
            Travado
          </span>
        )}
      </span>
      <span
        className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-200 ${isLocked
            ? "border-emerald-500/40 bg-secondary/90 shadow-inner ring-1 ring-emerald-500/20"
            : disabled || readOnly
              ? "cursor-not-allowed opacity-75 bg-secondary/50 border-border/40"
              : "border-border/80 bg-secondary/80 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          }`}
      >
        <Icon className={`size-4 shrink-0 ${isLocked ? "text-emerald-400" : "text-muted-foreground"}`} />
        <input
          required
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          readOnly={readOnly || isLocked}
          className={`w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none ${isLocked ? "cursor-default font-semibold text-foreground selection:bg-emerald-500/20" : ""
            }`}
          {...props}
        />
        {isLocked && (
          <Lock className="size-3.5 shrink-0 text-emerald-400/80" />
        )}
      </span>
    </label>
  );
}

function FixedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/50 p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  const digits = cleaned.startsWith("55") && cleaned.length >= 12 ? cleaned.slice(2) : cleaned;
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function toIsoDate(value: string) {
  return value.includes("T") ? value : `${value}T00:00:00Z`;
}
