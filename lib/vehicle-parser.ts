export interface ParsedVehicleData {
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  renavam?: string;
  chassis?: string;
  fuel_type?: string;
}

export interface VehicleParseResult {
  fields: ParsedVehicleData;
  sourceType: "whatsapp" | "crlv" | "text";
  detectedCount: number;
  renavamValid?: boolean;
  plateFormat?: "mercosul" | "tradicional";
  cleanedLines: string[];
}

const KNOWN_BRANDS: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "Honda", aliases: ["honda", "h/honda"] },
  { canonical: "Yamaha", aliases: ["yamaha", "ymh"] },
  { canonical: "Suzuki", aliases: ["suzuki", "jtz/suzuki"] },
  { canonical: "Kawasaki", aliases: ["kawasaki", "kawasak"] },
  { canonical: "BMW", aliases: ["bmw", "i/bmw"] },
  { canonical: "Triumph", aliases: ["triumph", "i/triumph"] },
  { canonical: "Ducati", aliases: ["ducati", "i/ducati"] },
  { canonical: "Royal Enfield", aliases: ["royal enfield", "royalenfield", "royal"] },
  { canonical: "Harley-Davidson", aliases: ["harley-davidson", "harley davidson", "harley", "hd"] },
  { canonical: "Dafra", aliases: ["dafra"] },
  { canonical: "Shineray", aliases: ["shineray"] },
  { canonical: "Haojue", aliases: ["haojue", "jtz/haojue"] },
  { canonical: "Zontes", aliases: ["zontes"] },
  { canonical: "Bajaj", aliases: ["bajaj"] },
  { canonical: "KTM", aliases: ["ktm"] },
  { canonical: "Husqvarna", aliases: ["husqvarna"] },
  { canonical: "MV Agusta", aliases: ["mv agusta", "mvagusta"] },
  { canonical: "Aprilia", aliases: ["aprilia"] },
  { canonical: "Vespa", aliases: ["vespa"] },
  { canonical: "Piaggio", aliases: ["piaggio"] },
  { canonical: "Kymco", aliases: ["kymco"] },
  { canonical: "Mottu", aliases: ["mottu"] },
  { canonical: "Voltz", aliases: ["voltz"] },
  { canonical: "Watts", aliases: ["watts"] },
  { canonical: "Traxx", aliases: ["traxx"] },
  { canonical: "Kasinski", aliases: ["kasinski"] },
  { canonical: "Sundown", aliases: ["sundown"] },
  { canonical: "Bull", aliases: ["bull"] },
  // Car / utility brands (vehicle support)
  { canonical: "Volkswagen", aliases: ["volkswagen", "vw"] },
  { canonical: "Fiat", aliases: ["fiat"] },
  { canonical: "Chevrolet", aliases: ["chevrolet", "gm"] },
  { canonical: "Ford", aliases: ["ford"] },
  { canonical: "Toyota", aliases: ["toyota"] },
  { canonical: "Hyundai", aliases: ["hyundai"] },
  { canonical: "Renault", aliases: ["renault"] },
  { canonical: "Jeep", aliases: ["jeep"] },
  { canonical: "Nissan", aliases: ["nissan"] },
  { canonical: "Peugeot", aliases: ["peugeot"] },
  { canonical: "Citroën", aliases: ["citroen", "citroën"] },
  { canonical: "Mitsubishi", aliases: ["mitsubishi"] },
  { canonical: "Kia", aliases: ["kia"] },
  { canonical: "BYD", aliases: ["byd"] },
  { canonical: "GWM", aliases: ["gwm"] },
  { canonical: "Caoa Chery", aliases: ["caoa chery", "chery"] },
  { canonical: "Mercedes-Benz", aliases: ["mercedes-benz", "mercedes benz", "mercedes", "m.benz"] },
  { canonical: "Audi", aliases: ["audi"] },
  { canonical: "Volvo", aliases: ["volvo"] },
  { canonical: "Iveco", aliases: ["iveco"] },
  { canonical: "Scania", aliases: ["scania"] },
];

const COLOR_MAP: Record<string, string> = {
  preto: "Preto",
  preta: "Preto",
  negro: "Preto",
  negra: "Preto",
  vermelho: "Vermelho",
  vermelha: "Vermelho",
  azul: "Azul",
  branco: "Branco",
  branca: "Branco",
  cinza: "Cinza",
  prata: "Prata",
  prateado: "Prata",
  prateada: "Prata",
  grafite: "Grafite",
  verde: "Verde",
  amarelo: "Amarelo",
  amarela: "Amarelo",
  laranja: "Laranja",
  marrom: "Marrom",
  bege: "Bege",
  dourado: "Dourado",
  dourada: "Dourado",
  roxo: "Roxo",
  roxa: "Roxo",
  vinho: "Vinho",
  fantasia: "Fantasia",
};

const FUEL_RULES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(?:alcool\s*\/\s*gasolina|álcool\s*\/\s*gasolina|gasolina\s*\/\s*etanol|etanol\s*\/\s*gasolina|bicombust[ií]vel|flex)\b/i, canonical: "Flex" },
  { pattern: /\b(?:gasolina\s*\/\s*gnv|gnv\s*\/\s*gasolina)\b/i, canonical: "Gasolina/GNV" },
  { pattern: /\b(?:gasolina|gas\.?)\b/i, canonical: "Gasolina" },
  { pattern: /\b(?:etanol|[aá]lcool)\b/i, canonical: "Etanol" },
  { pattern: /\b(?:diesel)\b/i, canonical: "Diesel" },
  { pattern: /\b(?:el[eé]tric[oa]|ev)\b/i, canonical: "Elétrico" },
  { pattern: /\b(?:h[ií]brid[oa])\b/i, canonical: "Híbrido" },
  { pattern: /\b(?:gnv)\b/i, canonical: "GNV" },
];

const UPPERCASE_TOKENS = new Set([
  "ES", "EX", "ESD", "ESDD", "ABS", "CBS", "GS", "GSA", "GT", "GTS", "MT", "FZ",
  "CG", "XRE", "PCX", "NMAX", "ADV", "CB", "CBR", "CRF", "XR", "YZF", "R1", "R3",
  "R6", "R15", "ZX", "GSX", "DL", "NC", "SH", "XY", "LED", "SE", "SL", "SX", "SR",
  "RS", "SS", "RR", "HP", "DX", "LX", "GL", "GTI", "TSI", "TDI", "4X4", "4X2",
]);

const WHATSAPP_PREFIX_PATTERNS: RegExp[] = [
  // [09:32, 11/14/2026] +55 11 99255-5916: message
  // [14/11/2026, 09:32:15] João Silva: message
  // [14/11/26 09:32] ~Maria: message
  /^\s*\[[^\]]{6,35}\]\s*[^:\n]{1,60}:\s*/,
  // 14/11/2026 09:32 - +55 11 99255-5916: message
  // 11/14/26, 9:32 AM - João: message
  // 09:32, 11/14/2026 - Maria: message
  /^\s*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}(?:,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?\s*[-–]\s*[^:\n]{1,60}:\s*/i,
  /^\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?(?:,?\s+\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})?\s*[-–]\s*[^:\n]{1,60}:\s*/i,
];

const WHATSAPP_NOISE_PATTERNS: RegExp[] = [
  /^<\s*m[ií]dia oculta\s*>$/i,
  /^<\s*media omitted\s*>$/i,
  /^(?:mensagem apagada|this message was deleted|apagada)$/i,
  /^(?:encaminhada|forwarded)$/i,
  /as mensagens e chamadas s[aã]o protegidas/i,
  /messages and calls are end-to-end encrypted/i,
];

const CRLV_MARKERS = [
  "RENAVAM",
  "CERTIFICADO DE REGISTRO",
  "CRLV",
  "SENATRAN",
  "DENATRAN",
  "DETRAN",
  "COR PREDOMINANTE",
  "ANO FABRICA",
  "MARCA / MODELO",
  "MARCA/MODELO",
  "CHASSI",
];

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Validates an 11-digit (or 9-10 digit zero-padded) Brazilian RENAVAM using the official mod-11 check digit.
 */
export function isValidRenavam(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 11) return false;
  const padded = digits.padStart(11, "0");
  if (/^(\d)\1{10}$/.test(padded)) return false;

  const base = padded.slice(0, 10).split("").reverse();
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(base[i]) * weights[i];
  }
  const mod = (sum * 10) % 11;
  const expected = mod >= 10 ? 0 : mod;
  return expected === Number(padded[10]);
}

export function normalizePlate(raw: string): { plate: string; format: "mercosul" | "tradicional" } | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleaned)) {
    return { plate: cleaned, format: "mercosul" };
  }
  if (/^[A-Z]{3}[0-9]{4}$/.test(cleaned)) {
    return { plate: cleaned, format: "tradicional" };
  }
  return null;
}

export function normalizeChassis(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[\s*]+/g, "").replace(/[^A-Z0-9]/g, "");
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export function normalizeColor(raw: string): string | undefined {
  const key = stripDiacritics(raw.trim().toLowerCase());
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (new RegExp(`\\b${k}\\b`, "i").test(key)) {
      return v;
    }
  }
  return undefined;
}

export function normalizeFuelType(raw: string): string | undefined {
  for (const rule of FUEL_RULES) {
    if (rule.pattern.test(raw)) {
      return rule.canonical;
    }
  }
  return undefined;
}

function formatModelName(raw: string): string {
  const cleaned = raw
    .replace(/^[\s\-–/:.,;*•]+|[\s\-–/:.,;*•]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((token) => {
      const upper = token.toUpperCase();
      if (UPPERCASE_TOKENS.has(upper)) return upper;
      // Preserve patterns like 110i, 160, 125cc
      if (/^\d+[a-z]{1,2}$/i.test(token)) {
        return token.toLowerCase();
      }
      if (/^\d+$/.test(token)) return token;
      // Keep mixed alphanumeric like MT-07, CB500F, F850GS
      if (/[a-zA-Z]/.test(token) && /\d/.test(token) && token.length <= 6) {
        return token.toUpperCase();
      }
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

function stripWhatsAppMarkdownAndBullets(line: string): string {
  return line
    // Remove WhatsApp formatting wrappers (*bold*, _italic_, ~strike~, `code`) without eating trailing * on VIN if attached to 17 chars
    .replace(/(^|\s)[*_~`]([^*_~`\n]+)[*_~`](?=\s|$|[.,;:])/g, "$1$2")
    .replace(/^\s*(?:[•▪▸▹►✓✔✅🚗🏍️🛵📋📌🔹🔸▪️]+|[-–]|(?:\d{1,2}[.)]))\s+/u, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanWhatsAppLines(input: string): { lines: string[]; hadWhatsAppPrefix: boolean } {
  const rawLines = input.replace(/\r\n/g, "\n").split("\n");
  let hadWhatsAppPrefix = false;
  const cleaned: string[] = [];

  for (const rawLine of rawLines) {
    let line = rawLine.trim();
    if (!line) continue;

    for (const prefixRe of WHATSAPP_PREFIX_PATTERNS) {
      if (prefixRe.test(line)) {
        hadWhatsAppPrefix = true;
        line = line.replace(prefixRe, "").trim();
        break;
      }
    }

    line = stripWhatsAppMarkdownAndBullets(line);
    if (!line) continue;

    if (WHATSAPP_NOISE_PATTERNS.some((re) => re.test(line))) {
      hadWhatsAppPrefix = true;
      continue;
    }

    cleaned.push(line);
  }

  return { lines: cleaned, hadWhatsAppPrefix };
}

function detectBrandInText(text: string): { brand: string; matched: string } | null {
  const lower = stripDiacritics(text.toLowerCase());
  // Sort aliases by length descending so "royal enfield" matches before "royal"
  const candidates: Array<{ canonical: string; alias: string }> = [];
  for (const b of KNOWN_BRANDS) {
    for (const a of b.aliases) {
      candidates.push({ canonical: b.canonical, alias: stripDiacritics(a.toLowerCase()) });
    }
  }
  candidates.sort((a, b) => b.alias.length - a.alias.length);

  for (const c of candidates) {
    const escaped = c.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[\\s/\\-,;:])${escaped}(?=$|[\\s/\\-,;:])`, "i");
    const m = lower.match(re);
    if (m) {
      return { brand: c.canonical, matched: c.alias };
    }
  }
  return null;
}

function extractBrandAndModelFromPhrase(phrase: string): {
  brand?: string;
  model?: string;
  fuel_type?: string;
  year?: number;
  color?: string;
} {
  let working = phrase.trim();
  const result: {
    brand?: string;
    model?: string;
    fuel_type?: string;
    year?: number;
    color?: string;
  } = {};

  // Handle CRLV prefix like "I/BMW F 850 GS" or "HONDA/POP 110I ES" or "H/HONDA CG 160"
  // Strip origin prefixes "I/" (importado) or "H/" first so "I/BMW F 850 GS" becomes "BMW F 850 GS"
  working = working.replace(/^[IH]\/\s*/i, "");
  const crlvSlash = working.match(/^([A-ZÀ-ÿ0-9.\s-]+?)\/(.+)$/i);
  if (crlvSlash) {
    const left = crlvSlash[1].trim();
    const right = crlvSlash[2].trim();
    const brandMatch = detectBrandInText(left);
    if (brandMatch) {
      result.brand = brandMatch.brand;
      working = right;
    } else if (left.length > 1 && left.length <= 20) {
      result.brand = formatModelName(left);
      working = right;
    }
  }

  // Extract fuel inline
  for (const rule of FUEL_RULES) {
    if (rule.pattern.test(working)) {
      result.fuel_type = rule.canonical;
      working = working.replace(rule.pattern, " ");
      break;
    }
  }

  // Extract year inline (e.g. 2026 or 2025/2026)
  const currentMaxYear = new Date().getFullYear() + 2;
  const yearRangeMatch = working.match(/\b((?:19[6-9]\d|20[0-3]\d))\s*\/\s*((?:19[6-9]\d|20[0-3]\d))\b/);
  if (yearRangeMatch) {
    const y2 = Number(yearRangeMatch[2]);
    if (y2 >= 1960 && y2 <= currentMaxYear) {
      result.year = y2;
      working = working.replace(yearRangeMatch[0], " ");
    }
  } else {
    const yearMatch = working.match(/\b(19[6-9]\d|20[0-3]\d)\b/);
    if (yearMatch) {
      const y = Number(yearMatch[1]);
      if (y >= 1960 && y <= currentMaxYear) {
        result.year = y;
        working = working.replace(yearMatch[0], " ");
      }
    }
  }

  // Extract color inline if present at word boundary (only if not part of model name)
  for (const [k, canonicalColor] of Object.entries(COLOR_MAP)) {
    const colorRe = new RegExp(`(?:^|\\s)${k}(?=\\s|$)`, "i");
    if (colorRe.test(stripDiacritics(working.toLowerCase()))) {
      result.color = canonicalColor;
      working = working.replace(new RegExp(`(?:^|\\s)${k}(?=\\s|$)`, "i"), " ");
      break;
    }
  }

  // Extract brand if not already extracted from slash
  if (!result.brand) {
    const brandMatch = detectBrandInText(working);
    if (brandMatch) {
      result.brand = brandMatch.brand;
      const escaped = brandMatch.matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      working = working.replace(new RegExp(`(?:^|[\\s/\\-])${escaped}(?=$|[\\s/\\-])`, "i"), " ");
    }
  }

  const formattedModel = formatModelName(working);
  if (formattedModel) {
    result.model = formattedModel;
  }

  return result;
}

function parseLabeledValue(lines: string[], labelPatterns: RegExp[]): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = stripDiacritics(line);
    for (const re of labelPatterns) {
      const m = normalizedLine.match(re);
      if (m) {
        const inlineVal = (m[1] ?? "").trim();
        if (inlineVal) return inlineVal;
        // Check next line if value is on the following line (common in CRLV-e PDFs)
        if (i + 1 < lines.length) {
          return lines[i + 1].trim();
        }
      }
    }
  }
  return undefined;
}

function detectSourceType(rawInput: string, hadWhatsAppPrefix: boolean): "whatsapp" | "crlv" | "text" {
  const upper = stripDiacritics(rawInput.toUpperCase());
  const crlvHits = CRLV_MARKERS.filter((marker) => upper.includes(marker)).length;
  if (crlvHits >= 2) return "crlv";
  if (hadWhatsAppPrefix) return "whatsapp";
  return "text";
}

/**
 * Parses vehicle data from WhatsApp messages (any formatting), CRLV/CRLV-e OCR/PDF text, or freeform text.
 */
export function parseVehicleText(input: string): VehicleParseResult {
  const { lines, hadWhatsAppPrefix } = cleanWhatsAppLines(input);
  const sourceType = detectSourceType(input, hadWhatsAppPrefix);
  const fields: ParsedVehicleData = {};
  let renavamValid: boolean | undefined;
  let plateFormat: "mercosul" | "tradicional" | undefined;

  // Expand lines that contain multiple delimited segments (e.g. "Placa: ABC1D23 | Cor: Azul | Ano: 2025")
  const tokens: string[] = [];
  for (const line of lines) {
    if (/[|;]/.test(line)) {
      for (const part of line.split(/[|;]+/)) {
        const p = part.trim();
        if (p) tokens.push(p);
      }
    } else {
      tokens.push(line);
    }
  }

  // 1. Labeled extraction (works for both CRLV-e and structured WhatsApp messages)
  const labeledPlate = parseLabeledValue(tokens, [
    /^placa(?:\s*\/\s*uf)?\s*[:\-–]?\s*(.*)$/i,
  ]);
  if (labeledPlate) {
    const plateMatch = labeledPlate.match(/\b([A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2})\b/i);
    if (plateMatch) {
      const norm = normalizePlate(plateMatch[1]);
      if (norm) {
        fields.license_plate = norm.plate;
        plateFormat = norm.format;
      }
    }
  }

  const labeledRenavam = parseLabeledValue(tokens, [
    /^(?:c[oó]digo\s+)?renavam\s*[:\-–]?\s*(.*)$/i,
  ]);
  if (labeledRenavam) {
    const digits = labeledRenavam.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 11) {
      fields.renavam = digits;
      renavamValid = isValidRenavam(digits);
    }
  }

  const labeledChassis = parseLabeledValue(tokens, [
    /^chassi(?:s)?(?:\s*\/\s*vin)?\s*[:\-–]?\s*(.*)$/i,
    /^vin\s*[:\-–]?\s*(.*)$/i,
  ]);
  if (labeledChassis) {
    const vinMatch = labeledChassis.match(/([A-HJ-NPR-Z0-9]{17})\*?/i);
    if (vinMatch) {
      const norm = normalizeChassis(vinMatch[1]);
      if (norm) fields.chassis = norm;
    }
  }

  const labeledColor = parseLabeledValue(tokens, [
    /^cor(?:\s+predominante)?\s*[:\-–]?\s*(.*)$/i,
  ]);
  if (labeledColor) {
    fields.color = normalizeColor(labeledColor) ?? formatModelName(labeledColor);
  }

  const labeledFuel = parseLabeledValue(tokens, [
    /^combust[ií]vel\s*[:\-–]?\s*(.*)$/i,
  ]);
  if (labeledFuel) {
    fields.fuel_type = normalizeFuelType(labeledFuel) ?? formatModelName(labeledFuel);
  }

  const labeledYearMod =
    parseLabeledValue(tokens, [
      /^ano\s+modelo\s*[:\-–]?\s*(.*)$/i,
      /^ano\s*\/\s*mod(?:elo)?\s*[:\-–]?\s*(.*)$/i,
      /^fab\s*\/\s*mod\s*[:\-–]?\s*(.*)$/i,
    ]) ??
    parseLabeledValue(tokens, [
      /^ano(?:\s+fab(?:rica[cç][aã]o)?)?\s*[:\-–]?\s*(.*)$/i,
    ]);
  if (labeledYearMod) {
    const yrs = [...labeledYearMod.matchAll(/\b(19[6-9]\d|20[0-3]\d)\b/g)].map((m) => Number(m[1]));
    if (yrs.length > 0) {
      fields.year = yrs[yrs.length - 1];
    }
  }

  const labeledBrandModel = parseLabeledValue(tokens, [
    /^marca\s*\/\s*modelo(?:\s*\/\s*vers[aã]o)?\s*[:\-–]?\s*(.*)$/i,
    /^ve[ií]culo\s*[:\-–]?\s*(.*)$/i,
  ]);
  if (labeledBrandModel) {
    const parsed = extractBrandAndModelFromPhrase(labeledBrandModel);
    if (parsed.brand) fields.brand = parsed.brand;
    if (parsed.model) fields.model = parsed.model;
    if (parsed.fuel_type && !fields.fuel_type) fields.fuel_type = parsed.fuel_type;
    if (parsed.year && !fields.year) fields.year = parsed.year;
  }

  const labeledBrand = parseLabeledValue(tokens, [/^marca\s*[:\-–]\s*(.+)$/i]);
  if (labeledBrand && !fields.brand) {
    fields.brand = detectBrandInText(labeledBrand)?.brand ?? formatModelName(labeledBrand);
  }

  const labeledModel = parseLabeledValue(tokens, [/^modelo\s*[:\-–]\s*(.+)$/i]);
  if (labeledModel && !fields.model) {
    const parsed = extractBrandAndModelFromPhrase(labeledModel);
    fields.model = parsed.model ?? formatModelName(labeledModel);
    if (parsed.brand && !fields.brand) fields.brand = parsed.brand;
  }

  // 2. Pattern-based extraction across all lines (for unlabeled WhatsApp messages & fallback)
  const consumedLines = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    const line = tokens[i];
    const trimmed = line.trim();

    // Check standalone or inline Chassis (17-char VIN, optional trailing *)
    if (!fields.chassis) {
      const vinMatch = trimmed.match(/(?:^|[\s:])([A-HJ-NPR-Z0-9]{17})\*?(?=$|[\s.,;])/i);
      if (vinMatch) {
        const norm = normalizeChassis(vinMatch[1]);
        if (norm) {
          fields.chassis = norm;
          if (trimmed.replace(/[*.\s]/g, "").toUpperCase() === norm) {
            consumedLines.add(i);
            continue;
          }
        }
      }
    }

    // Check standalone or inline RENAVAM (9-11 digits)
    if (!fields.renavam) {
      const digitsOnly = trimmed.replace(/[\s.-]/g, "");
      if (/^\d{9,11}$/.test(digitsOnly)) {
        fields.renavam = digitsOnly;
        renavamValid = isValidRenavam(digitsOnly);
        consumedLines.add(i);
        continue;
      }
    }

    // Check License Plate (Mercosul or Tradicional)
    if (!fields.license_plate) {
      const plateMatch = trimmed.match(/(?:^|[\s:])([A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2})(?=$|[\s.,;])/i);
      if (plateMatch) {
        const norm = normalizePlate(plateMatch[1]);
        if (norm) {
          fields.license_plate = norm.plate;
          plateFormat = norm.format;
          if (trimmed.replace(/[^A-Z0-9]/gi, "").toUpperCase() === norm.plate) {
            consumedLines.add(i);
            continue;
          }
        }
      }
    }

    // Check standalone Color line
    if (!fields.color) {
      const normColor = normalizeColor(trimmed);
      if (normColor && trimmed.split(/\s+/).length <= 2) {
        fields.color = normColor;
        consumedLines.add(i);
        continue;
      }
    }

    // Check standalone Year line
    if (!fields.year && /^\d{4}$/.test(trimmed)) {
      const y = Number(trimmed);
      if (y >= 1960 && y <= new Date().getFullYear() + 2) {
        fields.year = y;
        consumedLines.add(i);
        continue;
      }
    }
  }

  // 3. Freeform phrase scan for Brand / Model / Fuel / Year / Color on remaining lines
  for (let i = 0; i < tokens.length; i++) {
    if (consumedLines.has(i)) continue;
    let line = tokens[i];

    // Strip already-extracted plate/chassis/renavam/label words from freeform line
    if (fields.license_plate) {
      line = line.replace(/\b(?:placa)\b\s*[:\-–]?\s*[A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2}\b/gi, " ");
      line = line.replace(/\b[A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2}\b/gi, " ");
    }
    if (fields.chassis) {
      line = line.replace(new RegExp(`\\b(?:chassi)?\\s*[:\\-–]?\\s*${fields.chassis}\\*?`, "gi"), " ");
    }
    if (fields.renavam) {
      line = line.replace(new RegExp(`\\b(?:renavam)?\\s*[:\\-–]?\\s*${fields.renavam}`, "gi"), " ");
    }
    line = line.replace(/\s+/g, " ").trim();
    if (!line) continue;

    // Skip lines that are clearly CRLV headers/noise
    if (/^(?:marca\s*\/?\s*modelo|codigo\s+renavam|placa|chassi|cor\s+predominante|combustivel|ano\s+fab|exercicio|via\s+digital)/i.test(stripDiacritics(line))) {
      continue;
    }

    const parsed = extractBrandAndModelFromPhrase(line);
    if (parsed.brand && !fields.brand) {
      fields.brand = parsed.brand;
      if (parsed.model && !fields.model) fields.model = parsed.model;
      if (parsed.fuel_type && !fields.fuel_type) fields.fuel_type = parsed.fuel_type;
      if (parsed.year && !fields.year) fields.year = parsed.year;
      if (parsed.color && !fields.color) fields.color = parsed.color;
    } else {
      if (parsed.fuel_type && !fields.fuel_type) fields.fuel_type = parsed.fuel_type;
      if (parsed.year && !fields.year) fields.year = parsed.year;
      if (parsed.color && !fields.color) fields.color = parsed.color;
    }
  }

  // Fallback: if still no inline RENAVAM found in multi-word line
  if (!fields.renavam) {
    const joined = tokens.join(" ");
    const m = joined.match(/\b(\d{11})\b/);
    if (m) {
      fields.renavam = m[1];
      renavamValid = isValidRenavam(m[1]);
    }
  }

  const detectedCount = Object.values(fields).filter((v) => v !== undefined && v !== "").length;

  return {
    fields,
    sourceType,
    detectedCount,
    renavamValid,
    plateFormat,
    cleanedLines: lines,
  };
}
