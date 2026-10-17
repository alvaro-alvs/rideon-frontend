/**
 * CNPJ / Tax ID Formatting and Validation Utilities
 * 
 * Provides official Modulo 11 check digit verification and progressive masking
 * for Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica) as well as fallback
 * support for international corporate tax identifiers.
 */

/**
 * Removes all non-digit characters from the input string.
 */
export function cleanDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/**
 * Formats a raw or partially typed string into the standard Brazilian CNPJ mask:
 * 00.000.000/0000-00
 *
 * Designed for progressive typing: does not eagerly append separators until
 * characters for that section begin, preventing backspace traps.
 */
export function formatCNPJ(value: string): string {
  if (!value) return "";

  // If input contains alphanumeric characters typical of international Tax IDs, preserve them
  const hasLetters = /[a-zA-Z]/.test(value);
  if (hasLetters) {
    return value.trim().slice(0, 25);
  }

  const digits = cleanDigits(value).slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Validates a Brazilian CNPJ number using the official Modulo 11 check-digit algorithm.
 *
 * Rules:
 * 1. Must contain exactly 14 numeric digits.
 * 2. Cannot be a sequence of repeated identical digits (e.g. 00000000000000, 11111111111111).
 * 3. 1st check digit: calculated from first 12 digits with weights [5,4,3,2,9,8,7,6,5,4,3,2].
 * 4. 2nd check digit: calculated from first 13 digits with weights [6,5,4,3,2,9,8,7,6,5,4,3,2].
 */
export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  const digits = cleanDigits(cnpj);

  if (digits.length !== 14) {
    return false;
  }

  // Reject sequences of identical digits
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  // 1st Check Digit
  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sumFirst = 0;
  for (let i = 0; i < 12; i++) {
    sumFirst += parseInt(digits[i], 10) * weightsFirst[i];
  }
  const modFirst = sumFirst % 11;
  const expectedFirst = modFirst < 2 ? 0 : 11 - modFirst;
  if (expectedFirst !== parseInt(digits[12], 10)) {
    return false;
  }

  // 2nd Check Digit
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sumSecond = 0;
  for (let i = 0; i < 13; i++) {
    sumSecond += parseInt(digits[i], 10) * weightsSecond[i];
  }
  const modSecond = sumSecond % 11;
  const expectedSecond = modSecond < 2 ? 0 : 11 - modSecond;
  if (expectedSecond !== parseInt(digits[13], 10)) {
    return false;
  }

  return true;
}

export type TaxIDValidationStatus = "empty" | "incomplete" | "valid" | "invalid";

export interface TaxIDValidationResult {
  isValid: boolean;
  status: TaxIDValidationStatus;
  message: string;
  isCNPJ: boolean;
  isInternational: boolean;
}

/**
 * Validates the tenant Tax ID / CNPJ field and provides user-friendly status and feedback messages.
 */
export function validateTaxID(value: string): TaxIDValidationResult {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    return {
      isValid: false,
      status: "empty",
      message: "CNPJ / Tax ID é obrigatório.",
      isCNPJ: false,
      isInternational: false,
    };
  }

  const digits = cleanDigits(trimmed);
  const hasLetters = /[a-zA-Z]/.test(trimmed);

  // International Tax ID
  if (hasLetters) {
    const isValidInternational = /^[A-Za-z0-9\-\.\s]{5,25}$/.test(trimmed);
    return {
      isValid: isValidInternational,
      status: isValidInternational ? "valid" : "invalid",
      message: isValidInternational
        ? "Tax ID Internacional válido."
        : "Tax ID internacional deve ter entre 5 e 25 caracteres alfanuméricos.",
      isCNPJ: false,
      isInternational: true,
    };
  }

  // Standard CNPJ
  if (digits.length === 0) {
    return {
      isValid: false,
      status: "empty",
      message: "CNPJ é obrigatório.",
      isCNPJ: true,
      isInternational: false,
    };
  }

  if (digits.length < 14) {
    return {
      isValid: false,
      status: "incomplete",
      message: `CNPJ incompleto (${digits.length}/14 dígitos).`,
      isCNPJ: true,
      isInternational: false,
    };
  }

  if (digits.length === 14) {
    const valid = isValidCNPJ(trimmed);
    return {
      isValid: valid,
      status: valid ? "valid" : "invalid",
      message: valid ? "CNPJ válido." : "CNPJ inválido (dígitos verificadores incorretos).",
      isCNPJ: true,
      isInternational: false,
    };
  }

  return {
    isValid: false,
    status: "invalid",
    message: "CNPJ possui mais de 14 dígitos.",
    isCNPJ: true,
    isInternational: false,
  };
}
