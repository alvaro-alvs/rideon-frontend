export type LoginIdentifierMode = "auto" | "email" | "plate" | "imei";
export type DetectedIdentifierKind = "email" | "plate" | "imei" | "unknown";
export type PlateStandard = "mercosul" | "antiga" | "partial";

export interface FormattedLoginIdentifier {
  displayValue: string;
  apiValue: string;
  detectedKind: DetectedIdentifierKind;
  plateStandard?: PlateStandard;
  isComplete: boolean;
}

const MERCOSUL_PLATE_RE = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
const OLD_PLATE_RE = /^[A-Z]{3}[0-9]{4}$/;
const PLATE_TYPING_RE = /^[A-Z]{3}[0-9][A-Z0-9]{0,3}$/;
const EMAIL_BASIC_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Formats a Brazilian license plate in real time:
 * - Old standard (3 letters + 4 digits): `ABC-1234`
 * - Mercosul standard (3 letters + digit + letter + 2 digits): `ABC1D23`
 */
export function formatPlateSmart(raw: string): {
  formatted: string;
  clean: string;
  standard: PlateStandard;
  isComplete: boolean;
} {
  const clean = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);

  if (clean.length <= 3) {
    return {
      formatted: clean,
      clean,
      standard: "partial",
      isComplete: false,
    };
  }

  // Mercosul has a letter at index 4 (5th character), e.g. ABC1D23.
  const fifthChar = clean[4];
  const isMercosul = fifthChar !== undefined && /^[A-Z]$/.test(fifthChar);

  if (isMercosul) {
    return {
      formatted: clean,
      clean,
      standard: "mercosul",
      isComplete: MERCOSUL_PLATE_RE.test(clean),
    };
  }

  // Otherwise use traditional hyphenated format while typing (ABC-1234).
  const formatted = `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return {
    formatted,
    clean,
    standard: clean.length === 7 && OLD_PLATE_RE.test(clean) ? "antiga" : "partial",
    isComplete: OLD_PLATE_RE.test(clean),
  };
}

/**
 * Formats an equipment IMEI as clean digits (typically 15 digits, up to 16 for IMEISV).
 */
export function formatIMEISmart(raw: string): {
  formatted: string;
  clean: string;
  isComplete: boolean;
} {
  const clean = raw.replace(/\D/g, "").slice(0, 16);
  return {
    formatted: clean,
    clean,
    isComplete: clean.length >= 14 && clean.length <= 16,
  };
}

/**
 * Detects (when in "auto" mode) or enforces (when a specific mode is chosen)
 * the login identifier format and returns both display and API values.
 */
export function resolveLoginIdentifier(
  raw: string,
  mode: LoginIdentifierMode = "auto",
): FormattedLoginIdentifier {
  if (mode === "email") {
    const normalized = raw.trimStart().toLowerCase();
    return {
      displayValue: normalized,
      apiValue: normalized.trim(),
      detectedKind: "email",
      isComplete: EMAIL_BASIC_RE.test(normalized.trim()),
    };
  }

  if (mode === "plate") {
    const plate = formatPlateSmart(raw);
    return {
      displayValue: plate.formatted,
      apiValue: plate.clean,
      detectedKind: "plate",
      plateStandard: plate.standard,
      isComplete: plate.isComplete,
    };
  }

  if (mode === "imei") {
    const imei = formatIMEISmart(raw);
    return {
      displayValue: imei.formatted,
      apiValue: imei.clean,
      detectedKind: "imei",
      isComplete: imei.isComplete,
    };
  }

  // Auto mode: detect deterministically without mangling emails.
  const trimmed = raw.trimStart();
  if (trimmed.includes("@") || trimmed.includes(".")) {
    const lower = trimmed.toLowerCase();
    return {
      displayValue: lower,
      apiValue: lower.trim(),
      detectedKind: "email",
      isComplete: EMAIL_BASIC_RE.test(lower.trim()),
    };
  }

  const noSep = trimmed.replace(/[\s-]/g, "");
  if (noSep.length > 0 && /^\d+$/.test(noSep)) {
    const imei = formatIMEISmart(trimmed);
    return {
      displayValue: imei.formatted,
      apiValue: imei.clean,
      detectedKind: "imei",
      isComplete: imei.isComplete,
    };
  }

  const upperNoSep = noSep.toUpperCase();
  if (PLATE_TYPING_RE.test(upperNoSep)) {
    const plate = formatPlateSmart(trimmed);
    return {
      displayValue: plate.formatted,
      apiValue: plate.clean,
      detectedKind: "plate",
      plateStandard: plate.standard,
      isComplete: plate.isComplete,
    };
  }

  return {
    displayValue: raw,
    apiValue: raw.trim(),
    detectedKind: "unknown",
    isComplete: false,
  };
}
