"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bike,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Cpu,
  Radio,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";

import type { DeviceModelPreset } from "@/lib/types/device";

const MODEL_PRESETS: DeviceModelPreset[] = [
  {
    id: "j16-4g",
    name: "J16 4G LTE GPS Tracker (Padrão)",
    category: "4g",
    defaultProtocol: "GT06",
    defaultFirmware: "J16-v2.4.1",
    badge: "Recomendado",
    description: "4G Cat-1, leitura pós-chave (ACC), relé de corte e bateria interna.",
    voltageRange: "9V - 90V DC",
    features: ["4G LTE-M", "ACC Ignição", "Relé Corte", "Protocolo GT06"],
  },
  {
    id: "concox-gt06",
    name: "Concox / Wanway GT06N",
    category: "2g",
    defaultProtocol: "GT06",
    defaultFirmware: "GT06N-v4.0",
    badge: "Compatível",
    description: "Rastreador clássico 2G/GSM com protocolo binário padrão GT06.",
    voltageRange: "9V - 36V DC",
    features: ["2G GSM", "ACC Ignição", "Microfone", "Protocolo GT06"],
  },
  {
    id: "coban-tk303",
    name: "Coban TK303G / TK403",
    category: "4g",
    defaultProtocol: "Coban",
    defaultFirmware: "TK-v3.2",
    badge: "Popular",
    description: "Rastreador à prova d'água com trava remota e comandos SMS/GPRS.",
    voltageRange: "12V - 24V DC",
    features: ["4G / 2G", "Bloqueio", "Alarme SOS", "Protocolo Coban"],
  },
  {
    id: "suntech-st310",
    name: "Suntech ST310U / ST340",
    category: "hybrid",
    defaultProtocol: "ST300",
    defaultFirmware: "ST-v1.8",
    badge: "Frota",
    description: "Equipamento profissional de alta precisão e telemetria avançada.",
    voltageRange: "8V - 32V DC",
    features: ["4G LTE", "Acelerômetro 3D", "Antifurto", "Protocolo ST300"],
  },
  {
    id: "custom",
    name: "Dispositivo Personalizado / Outro",
    category: "custom",
    defaultProtocol: "GT06",
    defaultFirmware: "v1.0.0",
    badge: "Manual",
    description: "Configuração manual de protocolo e parâmetros para hardware customizado.",
    voltageRange: "Universal",
    features: ["Configuração Livre"],
  },
];

type MotorcycleOption = {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  rider?: { name?: string };
};

interface DeviceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeviceCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: DeviceCreateModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("j16-4g");
  const [imei, setImei] = useState<string>("");
  const [protocol, setProtocol] = useState<string>("GT06");
  const [firmware, setFirmware] = useState<string>("J16-v2.4.1");
  const [motorcycleId, setMotorcycleId] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [motorcycles, setMotorcycles] = useState<MotorcycleOption[]>([]);
  const [loadingMotos, setLoadingMotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Carrega lista de motocicletas para associação
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    async function loadMotos() {
      setLoadingMotos(true);
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { motorcycles?: MotorcycleOption[] };
          if (active && Array.isArray(data.motorcycles)) {
            setMotorcycles(data.motorcycles);
          }
        }
      } catch {
        // Silently ignore or set empty
      } finally {
        if (active) setLoadingMotos(false);
      }
    }

    void loadMotos();
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Atualiza protocolo e firmware quando o preset muda
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = MODEL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setProtocol(preset.defaultProtocol);
      setFirmware(preset.defaultFirmware);
    }
  };

  // Sanitiza e limpa IMEI
  const cleanImeiString = (raw: string): string => {
    // Remove prefixos como IMEI:, SN:, espaços, hífens e quebras de linha
    return raw
      .replace(/^(imei|sn|serial|id)[:\s-]*/i, "")
      .replace(/[\s\-_]/g, "")
      .trim();
  };

  // Atalho de Colar da Área de Transferência
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        // Fallback se permissão não suportada
        setError("Não foi possível acessar a área de transferência do navegador.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === "") {
        setError("A área de transferência está vazia.");
        return;
      }

      const cleaned = cleanImeiString(text);
      setImei(cleaned);
      setError(null);
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2500);
    } catch {
      setError("Permissão negada para ler da área de transferência.");
    }
  };

  // Gerador de IMEI J16 de teste (para testes rápidos)
  const handleGenerateSampleImei = () => {
    // Gera IMEI de teste no padrão J16 (iniciado em 86...)
    const prefix = "86940205";
    const randomSuffix = Math.floor(1000000 + Math.random() * 9000000).toString();
    const generated = `${prefix}${randomSuffix}`;
    setImei(generated);
    setError(null);
  };

  const is15Digits = /^\d{15}$/.test(imei);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanedImei = cleanImeiString(imei);
    if (!cleanedImei) {
      setError("Por favor, informe o IMEI ou número serial do dispositivo.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_number: cleanedImei,
          protocol: protocol || "GT06",
          firmware_version: firmware || "J16-v2.4.1",
          motorcycle_id: motorcycleId || null,
          status,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Erro ao cadastrar dispositivo.");
      }

      // Sucesso!
      onSuccess();
      onClose();
      // Reset form
      setImei("");
      setMotorcycleId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao salvar dispositivo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl shadow-black/90 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Glowing Accent */}
        <header className="relative overflow-hidden border-b border-border/70 bg-gradient-to-r from-card via-card/90 to-secondary/70 px-6 py-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/15 blur-2xl" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-sm">
                <Cpu className="size-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Cadastro de Hardware
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary border border-primary/20">
                    <Sparkles className="size-2.5" />
                    Base J16 4G
                  </span>
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
                  Novo Dispositivo GPS
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/50 bg-primary/10 p-3.5 text-xs text-primary shadow-sm animate-in fade-in">
              <AlertCircle className="size-4 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Section 1: Modelo Base Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Zap className="size-3.5 text-primary" />
                1. Selecione o Modelo Base de Hardware
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                J16 4G padrão da frota
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {MODEL_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`relative flex flex-col text-left rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/15 ring-1 ring-primary/40"
                        : "border-border/70 bg-secondary/40 hover:border-border hover:bg-secondary/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-secondary text-muted-foreground border border-border/70"
                        }`}
                      >
                        {preset.badge}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="size-4 text-primary shrink-0" />
                      )}
                    </div>

                    <p className="mt-2 text-xs font-bold text-foreground line-clamp-1">
                      {preset.name}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                      {preset.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
                      {preset.features.slice(0, 2).map((f) => (
                        <span
                          key={f}
                          className="rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: IMEI / Serial com Atalho de Colar */}
          <div className="space-y-2.5 rounded-2xl border border-border/70 bg-gradient-to-br from-card to-secondary/30 p-4.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Radio className="size-3.5 text-primary" />
                2. Número Serial / IMEI do Rastreador
              </label>

              {/* Atalho de colar e gerar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    pasteSuccess
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                  }`}
                  title="Colar IMEI da área de transferência (Ctrl+V)"
                >
                  {pasteSuccess ? (
                    <>
                      <Check className="size-3.5" />
                      <span>Colado!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardPaste className="size-3.5" />
                      <span>Colar IMEI</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateSampleImei}
                  className="hidden sm:flex items-center gap-1 rounded-xl border border-border/70 bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:border-border hover:text-foreground cursor-pointer"
                  title="Gerar IMEI J16 fictício para testes"
                >
                  <Wand2 className="size-3" />
                  <span>Gerar Teste</span>
                </button>
              </div>
            </div>

            {/* Input wrap */}
            <div className="relative">
              <div className="flex items-center rounded-2xl border border-border/90 bg-background px-4 py-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <span className="text-xs font-mono font-bold text-primary mr-2">
                  IMEI:
                </span>
                <input
                  type="text"
                  value={imei}
                  onChange={(e) => setImei(cleanImeiString(e.target.value))}
                  placeholder="Ex: 869402058491823 (15 dígitos J16)"
                  className="w-full bg-transparent py-2.5 font-mono text-sm sm:text-base font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none tracking-wider"
                  maxLength={20}
                  required
                />
                {imei && (
                  <button
                    type="button"
                    onClick={() => setImei("")}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Limpar"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Validation & helper indicator */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground px-1">
              <div className="flex items-center gap-1.5">
                {is15Digits ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                    <CheckCircle2 className="size-3.5" />
                    Formato Padrão 15 Dígitos (Válido)
                  </span>
                ) : imei.length > 0 ? (
                  <span className="font-mono text-amber-400">
                    {imei.length}/15 dígitos inseridos
                  </span>
                ) : (
                  <span>Cole ou digite o código IMEI impresso no adesivo do J16.</span>
                )}
              </div>

              <span className="text-[10px] text-muted-foreground/80">
                Atalho: <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] border border-border">Ctrl</kbd> + <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] border border-border">V</kbd>
              </span>
            </div>
          </div>

          {/* Section 3: Protocolo & Firmware (Auto-configurados) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                <span>Protocolo de Rede</span>
                <span className="text-[10px] text-primary font-mono font-bold">
                  {selectedPreset === "j16-4g" ? "GT06 Padrão" : protocol}
                </span>
              </label>
              <input
                type="text"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                placeholder="Ex: GT06, Coban, ST300"
                className="w-full rounded-xl border border-border/80 bg-secondary/80 px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                <span>Versão do Firmware</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Compatibilidade
                </span>
              </label>
              <input
                type="text"
                value={firmware}
                onChange={(e) => setFirmware(e.target.value)}
                placeholder="Ex: J16-v2.4.1"
                className="w-full rounded-xl border border-border/80 bg-secondary/80 px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Associação com Motocicleta */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Bike className="size-3.5 text-primary" />
              3. Vincular a uma Motocicleta (Opcional)
            </label>

            <select
              value={motorcycleId}
              onChange={(e) => setMotorcycleId(e.target.value)}
              disabled={loadingMotos}
              className="w-full rounded-xl border border-border/80 bg-secondary px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="">
                — Deixar em Estoque (Sem Veículo Vinculado) —
              </option>
              {motorcycles.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.license_plate}] {m.brand} {m.model}{" "}
                  {m.rider?.name ? `• Piloto: ${m.rider.name}` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Você pode cadastrar o rastreador no estoque agora e vinculá-lo a uma moto posteriormente.
            </p>
          </div>

          {/* Section 5: Status Inicial */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Status Operacional Inicial
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`flex-1 rounded-xl border py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  status === "active"
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm"
                    : "border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                Ativo / Em Operação
              </button>
              <button
                type="button"
                onClick={() => setStatus("inactive")}
                className={`flex-1 rounded-xl border py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  status === "inactive"
                    ? "border-neutral-500 bg-neutral-800 text-neutral-300 shadow-sm"
                    : "border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                Inativo / Standby
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-secondary/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border/80 bg-secondary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !imei.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Cadastrar Dispositivo</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
