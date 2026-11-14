"use client";

import { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  MessageSquareText,
  ScanLine,
  Sparkles,
  Upload,
  AlertCircle,
} from "lucide-react";
import {
  parseVehicleText,
  type ParsedVehicleData,
  type VehicleParseResult,
} from "@/lib/vehicle-parser";
import {
  scanVehicleDocument,
  type DocumentScanProgress,
} from "@/lib/vehicle-document-ocr";

interface VehicleSmartImportProps {
  onApply: (data: ParsedVehicleData) => void;
  compact?: boolean;
  defaultOpen?: boolean;
}

const WHATSAPP_PLACEHOLDER =
  "Cole aqui as mensagens do WhatsApp ou texto com os dados do veículo...";

export function VehicleSmartImport({
  onApply,
  compact = false,
  defaultOpen = false,
}: VehicleSmartImportProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<"document" | "whatsapp">("document");
  const [whatsappText, setWhatsappText] = useState("");
  const [parseResult, setParseResult] = useState<VehicleParseResult | null>(null);
  const [scanProgress, setScanProgress] = useState<DocumentScanProgress | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [appliedBanner, setAppliedBanner] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const applyExtracted = (result: VehicleParseResult) => {
    onApply(result.fields);
    setAppliedBanner(true);
    setTimeout(() => setAppliedBanner(false), 3000);
  };

  const handleDocumentFile = async (file: File | undefined | null) => {
    if (!file) return;
    setScanning(true);
    setScanError(null);
    setAppliedBanner(false);
    setScanProgress({ stage: "loading", progress: 5, message: "Iniciando leitura..." });

    try {
      const res = await scanVehicleDocument(file, setScanProgress);
      setParseResult(res.parseResult);
      if (res.parseResult.detectedCount === 0) {
        setScanError(
          "Não foi possível identificar campos do veículo neste arquivo. Tente uma foto mais nítida ou o PDF digital do CRLV-e.",
        );
      } else {
        applyExtracted(res.parseResult);
      }
    } catch (err) {
      setScanError(
        err instanceof Error
          ? err.message
          : "Erro ao processar o documento. Verifique o arquivo e tente novamente.",
      );
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  const handleWhatsappChange = (value: string) => {
    setWhatsappText(value);
    setScanError(null);
    setAppliedBanner(false);
    if (!value.trim()) {
      setParseResult(null);
      return;
    }
    const parsed = parseVehicleText(value);
    setParseResult(parsed);
  };

  const handleExtractAndApplyWhatsapp = () => {
    if (!whatsappText.trim()) return;
    const parsed = parseVehicleText(whatsappText);
    setParseResult(parsed);
    if (parsed.detectedCount === 0) {
      setScanError("Nenhum dado de veículo identificado no texto colado.");
      return;
    }
    applyExtracted(parsed);
  };

  const fields = parseResult?.fields;
  const detectedItems = fields
    ? ([
        fields.brand && { label: "Marca", value: fields.brand },
        fields.model && { label: "Modelo", value: fields.model },
        fields.year && { label: "Ano", value: String(fields.year) },
        fields.color && { label: "Cor", value: fields.color },
        fields.license_plate && {
          label: "Placa",
          value: fields.license_plate,
          badge: parseResult?.plateFormat === "mercosul" ? "Mercosul" : "Padrão",
        },
        fields.renavam && {
          label: "RENAVAM",
          value: fields.renavam,
          badge: parseResult?.renavamValid ? "Válido" : undefined,
        },
        fields.chassis && { label: "Chassi", value: fields.chassis },
        fields.fuel_type && { label: "Combustível", value: fields.fuel_type },
      ].filter(Boolean) as Array<{ label: string; value: string; badge?: string }>)
    : [];

  return (
    <div
      className={`rounded-2xl border border-primary/25 bg-primary/[0.04] transition-all ${
        compact ? "p-3.5" : "p-4 sm:p-5"
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Preenchimento Inteligente
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                CRLV-e & WhatsApp
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Escaneie o documento oficial (PDF/foto) ou cole mensagens do WhatsApp
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/70 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("document");
                setScanError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "document"
                  ? "bg-card text-foreground shadow-sm border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ScanLine className="size-3.5 text-primary" />
              <span>Escanear CRLV / Doc</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("whatsapp");
                setScanError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "whatsapp"
                  ? "bg-card text-foreground shadow-sm border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquareText className="size-3.5 text-emerald-500" />
              <span>Colar WhatsApp</span>
            </button>
          </div>

          {activeTab === "document" ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  handleDocumentFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleDocumentFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDocumentFile(e.dataTransfer.files?.[0]);
                }}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/90 bg-background/60 p-4 text-center"
              >
                {scanning && scanProgress ? (
                  <div className="w-full max-w-xs space-y-2 py-2">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
                      <Loader2 className="size-4 animate-spin" />
                      <span>{scanProgress.message}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${scanProgress.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <FileText className="size-4 text-primary" />
                      <span>Arraste o PDF do CRLV-e ou uma foto do documento</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        <span>Selecionar PDF / Imagem</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-foreground hover:border-primary/50 transition-all cursor-pointer"
                      >
                        <Camera className="size-3.5" />
                        <span>Tirar Foto</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={compact ? 4 : 5}
                value={whatsappText}
                onChange={(e) => handleWhatsappChange(e.target.value)}
                placeholder={WHATSAPP_PLACEHOLDER}
                className="w-full rounded-xl border border-border bg-background/80 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Copie e cole mensagens do whatsapp com infomações do veículo aqui
                </span>
                <button
                  type="button"
                  disabled={!whatsappText.trim()}
                  onClick={handleExtractAndApplyWhatsapp}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Sparkles className="size-3.5" />
                  <span>Extrair e Preencher</span>
                </button>
              </div>
            </div>
          )}

          {scanError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {detectedItems.length > 0 && (
            <div className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Campos Detectados ({detectedItems.length})
                </span>
                {appliedBanner ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                    <CheckCircle2 className="size-3.5" />
                    Aplicado ao formulário!
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => parseResult && applyExtracted(parseResult)}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Aplicar novamente
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedItems.map((item) => (
                  <div
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/70 px-2.5 py-1 text-[11px]"
                  >
                    <span className="font-semibold text-muted-foreground">{item.label}:</span>
                    <span className="font-bold text-foreground">{item.value}</span>
                    {item.badge && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-500">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
