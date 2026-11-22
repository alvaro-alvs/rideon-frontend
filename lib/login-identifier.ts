import { formatPhone } from "@/lib/phone";

export type LoginIdentifierMode = "auto" | "email" | "phone" | "plate" | "imei";
export type DetectedIdentifierKind = "email" | "phone" | "plate" | "imei" | "unknown";
export type PlateStandard = "mercosul" | "antiga" | "partial";
export type PhoneKind = "mobile" | "landline" | "partial";

export interface FormattedLoginIdentifier {
  displayValue: string;
  apiValue: string;
  detectedKind: DetectedIdentifierKind;
  plateStandard?: PlateStandard;
  phoneType?: PhoneKind;
  isComplete: boolean;
}

const MERCOSUL_PLATE_RE = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
const OLD_PLATE_RE = /^[A-Z]{3}[0-9]{4}$/;
const PLATE_TYPING_RE = /^[A-Z]{3}[0-9][A-Z0-9]{0,3}$/;
const EMAIL_BASIC_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidDDD(twoDigits: string): boolean {
  if (twoDigits.length < 2) return false;
  const ddd = parseInt(twoDigits, 10);
  return ddd >= 11 && ddd <= 99;
}

function isBrazilianPhoneDigits(digits: string): boolean {
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return isValidDDD(digits.slice(2, 4));
  }
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith("0")) {
    return isValidDDD(digits.slice(1, 3));
  }
  if (digits.length === 10 || digits.length === 11) {
    return isValidDDD(digits.slice(0, 2));
  }
  return false;
}

/**
 * Formats a phone/cellphone login identifier in real time while returning
 * normalized digits (or E.164 for international numbers) for the API.
 */
export function formatPhoneLoginSmart(raw: string): {
  formatted: string;
  clean: string;
  phoneType: PhoneKind;
  isComplete: boolean;
} {
  const trimmed = raw.trimStart();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (hasPlus) {
    if (digits.startsWith("55")) {
      const local = digits.slice(2, 13);
      const formatted =
        local.length === 0 ? "+55" : `+55 ${formatPhone(local)}`;
      const isComplete =
        (local.length === 10 || local.length === 11) &&
        isValidDDD(local.slice(0, 2));
      return {
        formatted,
        clean: isComplete ? local : `+55${local}`,
        phoneType:
          local.length === 11
            ? "mobile"
            : local.length === 10
              ? "landline"
              : "partial",
        isComplete,
      };
    }

    const intl = digits.slice(0, 15);
    return {
      formatted: `+${intl}`,
      clean: `+${intl}`,
      phoneType: intl.length >= 10 ? "mobile" : "partial",
      isComplete: intl.length >= 10 && intl.length <= 15,
    };
  }

  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith("55") &&
    isValidDDD(digits.slice(2, 4))
  ) {
    const local = digits.slice(2);
    return {
      formatted: `+55 ${formatPhone(local)}`,
      clean: local,
      phoneType: local.length === 11 ? "mobile" : "landline",
      isComplete: true,
    };
  }

  if (
    (digits.length === 11 || digits.length === 12) &&
    digits.startsWith("0") &&
    isValidDDD(digits.slice(1, 3))
  ) {
    const local = digits.slice(1);
    return {
      formatted: formatPhone(local),
      clean: local,
      phoneType: local.length === 11 ? "mobile" : "landline",
      isComplete: true,
    };
  }

  const local = digits.slice(0, 11);
  const isComplete =
    (local.length === 10 || local.length === 11) &&
    isValidDDD(local.slice(0, 2));
  return {
    formatted: formatPhone(local),
    clean: local,
    phoneType:
      local.length === 11
        ? "mobile"
        : local.length === 10
          ? "landline"
          : "partial",
    isComplete,
  };
}

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

  if (mode === "phone") {
    const phone = formatPhoneLoginSmart(raw);
    return {
      displayValue: phone.formatted,
      apiValue: phone.clean,
      detectedKind: "phone",
      phoneType: phone.phoneType,
      isComplete: phone.isComplete,
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
  if (trimmed.includes("@") || (trimmed.includes(".") && /[a-zA-Z]/.test(trimmed))) {
    const lower = trimmed.toLowerCase();
    return {
      displayValue: lower,
      apiValue: lower.trim(),
      detectedKind: "email",
      isComplete: EMAIL_BASIC_RE.test(lower.trim()),
    };
  }

  if (/^[+(]/.test(trimmed) && !/[a-zA-Z]/.test(trimmed)) {
    const phone = formatPhoneLoginSmart(trimmed);
    return {
      displayValue: phone.formatted,
      apiValue: phone.clean,
      detectedKind: "phone",
      phoneType: phone.phoneType,
      isComplete: phone.isComplete,
    };
  }

  const noSep = trimmed.replace(/[\s().-]/g, "");
  if (noSep.length > 0 && /^\d+$/.test(noSep)) {
    if (noSep.length < 14 && isBrazilianPhoneDigits(noSep)) {
      const phone = formatPhoneLoginSmart(noSep);
      return {
        displayValue: phone.formatted,
        apiValue: phone.clean,
        detectedKind: "phone",
        phoneType: phone.phoneType,
        isComplete: phone.isComplete,
      };
    }

    if (noSep.length >= 12) {
      const imei = formatIMEISmart(noSep);
      return {
        displayValue: imei.formatted,
        apiValue: imei.clean,
        detectedKind: "imei",
        isComplete: imei.isComplete,
      };
    }

    return {
      displayValue: noSep,
      apiValue: noSep,
      detectedKind: "unknown",
      isComplete: false,
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
