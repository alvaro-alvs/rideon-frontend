const DEFAULT_API_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 10_000;

export const SESSION_COOKIE = "rideon_access_token";
export const SESSION_MAX_AGE = 60 * 60 * 8;
export const REFRESH_COOKIE = "rideon_refresh_token";
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;
export const PENDING_RIDER_COOKIE = "rideon_pending_rider";
export const PENDING_RIDER_MAX_AGE = 60 * 30;

// Role cookie — stores the user role ("admin" | "rider") after login.
// httpOnly so client JS can't tamper with it; proxy.ts reads it for route protection.
export const ROLE_COOKIE = "rideon_user_role";
export const ROLE_MAX_AGE = SESSION_MAX_AGE;

export type UserRole = "admin" | "rider";

/**
 * Defensive helper per README_FRONTEND.md §3:
 * Legacy accounts may have role absent or empty — treat them as "rider".
 */
export function getUserRole(meResponse: Record<string, unknown> | null): UserRole {
  const role = meResponse?.role;
  if (!role || role === "") return "rider";
  if (role === "admin") return "admin";
  return "rider";
}

type AuthPayload = {
  email: string;
  password: string;
};

export type RiderPayload = {
  name: string;
  date_of_birth: string;
  phone: string;
};

export type MotorcyclePayload = {
  brand: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
};

export type VehicleRegistrationPayload = {
  rider: RiderPayload;
  motorcycle: MotorcyclePayload;
};

export type ApiResult = {
  response: Response;
  data: Record<string, unknown> | null;
};

export function getApiUrl() {
  return (process.env.API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

export function isValidCredentials(payload: unknown): payload is AuthPayload {
  if (!payload || typeof payload !== "object") return false;

  const { email, password } = payload as Record<string, unknown>;
  return (
    typeof email === "string" &&
    email.length > 0 &&
    email.length <= 254 &&
    typeof password === "string" &&
    password.length >= 6 &&
    password.length <= 256
  );
}

export function isValidVehicleRegistration(
  payload: unknown,
): payload is VehicleRegistrationPayload {
  if (!payload || typeof payload !== "object") return false;

  const { rider, motorcycle } = payload as Record<string, unknown>;
  if (
    !rider ||
    typeof rider !== "object" ||
    !motorcycle ||
    typeof motorcycle !== "object"
  ) {
    return false;
  }

  const riderData = rider as Record<string, unknown>;
  const motorcycleData = motorcycle as Record<string, unknown>;
  return (
    isNonEmptyString(riderData.name) &&
    isNonEmptyString(riderData.date_of_birth) &&
    isNonEmptyString(riderData.phone) &&
    isNonEmptyString(motorcycleData.brand) &&
    isNonEmptyString(motorcycleData.model) &&
    Number.isInteger(motorcycleData.year) &&
    isNonEmptyString(motorcycleData.color) &&
    isNonEmptyString(motorcycleData.license_plate)
  );
}

export async function callAuthApi(
  endpoint: "login" | "register",
  payload: AuthPayload,
): Promise<ApiResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    return { response, data: await readJson(response) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function callApiMe(token: string): Promise<ApiResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    return { response, data: await readJson(response) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function callAuthenticatedApi(
  endpoint: string,
  token: string,
  payload?: Record<string, unknown>,
  method: "GET" | "POST" = "POST",
): Promise<ApiResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      signal: controller.signal,
      cache: "no-store",
    };

    if (payload && method !== "GET") {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      ...options,
    });

    return { response, data: await readJson(response) };
  } finally {
    clearTimeout(timeout);
  }
}

export function getPublicError(status: number) {
  if (status === 400 || status === 422) return "Confira os dados informados.";
  if (status === 401) return "E-mail ou senha invalidos.";
  if (status === 409) return "Este e-mail ja esta cadastrado.";
  return "Nao foi possivel concluir a operacao. Tente novamente.";
}

export function hasAccessToken(data: Record<string, unknown> | null): data is {
  access_token: string;
} {
  return typeof data?.access_token === "string" && data.access_token.length > 0;
}

export function hasRefreshToken(data: Record<string, unknown> | null): data is {
  refresh_token: string;
} {
  return typeof data?.refresh_token === "string" && data.refresh_token.length > 0;
}

export async function refreshAccessToken(refreshToken: string): Promise<ApiResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
      cache: "no-store",
    });

    return { response, data: await readJson(response) };
  } finally {
    clearTimeout(timeout);
  }
}

export function hasUserId(data: Record<string, unknown> | null) {
  return typeof data?.id === "string" || typeof data?.id === "number";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function readJson(
  response: Response,
): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
