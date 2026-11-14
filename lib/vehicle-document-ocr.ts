"use client";

import { parseVehicleText, type VehicleParseResult } from "./vehicle-parser";

export interface DocumentScanProgress {
  stage: "loading" | "extracting-pdf" | "rendering-pdf" | "ocr" | "parsing";
  progress: number; // 0..100
  message: string;
}

export interface DocumentScanResult {
  text: string;
  method: "pdf-text" | "pdf-ocr" | "image-ocr";
  parseResult: VehicleParseResult;
}

async function extractPdfTextWithLines(
  file: File,
  onProgress?: (p: DocumentScanProgress) => void,
): Promise<{ text: string; renderFirstPageToBlob: () => Promise<Blob> }> {
  onProgress?.({ stage: "loading", progress: 10, message: "Carregando leitor de PDF..." });
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const maxPages = Math.min(pdf.numPages, 3);
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    onProgress?.({
      stage: "extracting-pdf",
      progress: 15 + Math.round((pageNum / maxPages) * 35),
      message: `Lendo texto do documento (página ${pageNum}/${maxPages})...`,
    });
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items by Y coordinate so CRLV-e labels & values stay on clean lines
    const rows: Array<{ y: number; items: Array<{ x: number; str: string }> }> = [];
    for (const rawItem of content.items) {
      if (!("str" in rawItem) || !rawItem.str.trim()) continue;
      const transform = rawItem.transform as number[];
      const x = transform[4] ?? 0;
      const y = transform[5] ?? 0;
      let row = rows.find((r) => Math.abs(r.y - y) <= 4);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, str: rawItem.str });
    }

    rows.sort((a, b) => b.y - a.y);
    const lines = rows.map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    pageTexts.push(lines.join("\n"));
  }

  const renderFirstPageToBlob = async (): Promise<Blob> => {
    onProgress?.({
      stage: "rendering-pdf",
      progress: 45,
      message: "PDF escaneado detectado. Renderizando página para OCR...",
    });
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível inicializar o canvas para OCR.");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter página do PDF."))),
        "image/png",
      );
    });
  };

  return { text: pageTexts.join("\n"), renderFirstPageToBlob };
}

async function runOcrOnSource(
  source: Blob | File,
  onProgress?: (p: DocumentScanProgress) => void,
): Promise<string> {
  onProgress?.({ stage: "ocr", progress: 50, message: "Inicializando OCR (Português)..." });
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.({
          stage: "ocr",
          progress: 55 + Math.round(m.progress * 40),
          message: `Reconhecendo texto do documento (${Math.round(m.progress * 100)}%)...`,
        });
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(source);
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function scanVehicleDocument(
  file: File,
  onProgress?: (p: DocumentScanProgress) => void,
): Promise<DocumentScanResult> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const { text, renderFirstPageToBlob } = await extractPdfTextWithLines(file, onProgress);
    const compactLen = text.replace(/\s+/g, "").length;
    if (compactLen >= 40) {
      onProgress?.({ stage: "parsing", progress: 95, message: "Extraindo dados do CRLV-e..." });
      return {
        text,
        method: "pdf-text",
        parseResult: parseVehicleText(text),
      };
    }

    const blob = await renderFirstPageToBlob();
    const ocrText = await runOcrOnSource(blob, onProgress);
    onProgress?.({ stage: "parsing", progress: 95, message: "Extraindo dados do documento..." });
    return {
      text: ocrText,
      method: "pdf-ocr",
      parseResult: parseVehicleText(ocrText),
    };
  }

  onProgress?.({ stage: "loading", progress: 20, message: "Preparando imagem para leitura..." });
  const ocrText = await runOcrOnSource(file, onProgress);
  onProgress?.({ stage: "parsing", progress: 95, message: "Extraindo dados do documento..." });
  return {
    text: ocrText,
    method: "image-ocr",
    parseResult: parseVehicleText(ocrText),
  };
}
