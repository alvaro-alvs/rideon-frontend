/**
 * Brazilian Phone Formatting and Validation Utilities
 * 
 * Supports dynamic expansion between:
 * - Fixo / Landline (10 digits): (XX) XXXX-XXXX
 * - Celular / Mobile (11 digits): (XX) 9XXXX-XXXX (with 9th digit)
 */

/**
 * Strips all non-digit characters from the input string.
 */
export function cleanPhone(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/**
 * Automatically formats a phone string into Brazilian standard.
 * Expands dynamically between 10 digits (landline) and 11 digits (mobile).
 * 
 * Progressively formats without locking or jumping on backspace:
 * 1-2 digits:  (XX
 * 3-6 digits:  (XX) XXXX
 * 7-10 digits: (XX) XXXX-XXXX (landline)
 * 11 digits:   (XX) 9XXXX-XXXX (mobile with 9th digit)
 */
export function formatPhone(value: string): string {
  if (!value) return "";
  const digits = cleanPhone(value).slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  // 11 digits: Mobile with 9th digit: (XX) 9XXXX-XXXX
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  // 7 to 10 digits: Landline mask: (XX) XXXX-XXXX
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

export interface PhoneValidationResult {
  isValid: boolean;
  type: "mobile" | "landline" | "incomplete" | "empty" | "invalid";
  message: string;
}

/**
 * Validates a Brazilian phone number (DDD + 8 or 9 digits).
 */
export function validatePhone(phone: string): PhoneValidationResult {
  const digits = cleanPhone(phone);

  if (!digits) {
    return {
      isValid: false,
      type: "empty",
      message: "Telefone é obrigatório.",
    };
  }

  // Check valid DDD (11 to 99)
  if (digits.length >= 2) {
    const ddd = parseInt(digits.slice(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      return {
        isValid: false,
        type: "invalid",
        message: "DDD inválido.",
      };
    }
  }

  // Incomplete numbers
  if (digits.length < 10) {
    return {
      isValid: false,
      type: "incomplete",
      message: `Telefone incompleto (${digits.length}/10 ou 11 dígitos).`,
    };
  }

  // Reject sequence of identical numbers (e.g. 11111111111)
  if (/^(\d)\1+$/.test(digits)) {
    return {
      isValid: false,
      type: "invalid",
      message: "Número de telefone inválido.",
    };
  }

  // 10 digits: Landline
  if (digits.length === 10) {
    return {
      isValid: true,
      type: "landline",
      message: "Telefone fixo válido.",
    };
  }

  // 11 digits: Mobile phone with 9th digit
  if (digits.length === 11) {
    if (digits[2] !== "9") {
      return {
        isValid: false,
        type: "invalid",
        message: "Celular com 11 dígitos deve iniciar com o dígito 9 após o DDD.",
      };
    }
    return {
      isValid: true,
      type: "mobile",
      message: "Celular válido (com 9º dígito).",
    };
  }

  return {
    isValid: false,
    type: "invalid",
    message: "Telefone excede 11 dígitos.",
  };
}
