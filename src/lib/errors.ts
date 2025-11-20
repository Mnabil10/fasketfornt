import type { AxiosError } from "axios";
import type { TFunction } from "i18next";

type BackendErrorPayload = {
  success?: boolean;
  code?: string;
  message?: string;
  correlationId?: string;
  error?: string | { code?: string; message?: string };
  errors?: Array<{ message?: string }> | Record<string, string | string[]>;
};

type NormalizedErrorPayload = {
  code?: string;
  message?: string;
  correlationId?: string;
  errors?: BackendErrorPayload["errors"];
};

const ERROR_CODE_TRANSLATIONS: Record<string, string> = {
  ORDER_NOT_FOUND: "errors.ORDER_NOT_FOUND",
  ADDRESS_INVALID_ZONE: "errors.ADDRESS_INVALID_ZONE",
  DRIVER_NOT_FOUND: "errors.DRIVER_NOT_FOUND",
  DRIVER_INACTIVE: "errors.DRIVER_INACTIVE",
  DRIVER_ALREADY_ASSIGNED: "errors.DRIVER_ALREADY_ASSIGNED",
  LOYALTY_DISABLED: "errors.LOYALTY_DISABLED",
  LOYALTY_NOT_ENOUGH_POINTS: "errors.LOYALTY_NOT_ENOUGH_POINTS",
  LOYALTY_RULE_VIOLATION: "errors.LOYALTY_RULE_VIOLATION",
  SETTING_NOT_CONFIGURED: "errors.SETTING_NOT_CONFIGURED",
  VALIDATION_FAILED: "errors.VALIDATION_FAILED",
  INTERNAL_ERROR: "errors.INTERNAL_ERROR",
  RATE_LIMITED: "errors.RATE_LIMITED",
  UNAUTHORIZED: "errors.UNAUTHORIZED",
  DEFAULT: "errors.DEFAULT",
};

function isAxiosError(value: unknown): value is AxiosError {
  return typeof value === "object" && value !== null && "isAxiosError" in (value as any);
}

function normalizePayload(input: unknown): NormalizedErrorPayload | null {
  if (!input) return null;
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed ? { message: trimmed } : null;
  }
  if (typeof input !== "object") return null;

  const data = input as BackendErrorPayload;
  const nested = typeof data.error === "object" ? data.error : undefined;
  const rawMessage = data.message ?? nested?.message ?? (typeof data.error === "string" ? data.error : undefined);
  const rawCode = data.code ?? nested?.code;

  return {
    code: rawCode ? String(rawCode).toUpperCase() : undefined,
    message: rawMessage,
    correlationId: data.correlationId,
    errors: data.errors,
  };
}

function extractErrorPayload(error: unknown): NormalizedErrorPayload | null {
  if (!error) return null;

  if (isAxiosError(error)) {
    return normalizePayload(error.response?.data);
  }

  if (typeof error === "object" && error && "response" in (error as any)) {
    return normalizePayload((error as any).response?.data);
  }

  if (typeof error === "object" && "message" in (error as any)) {
    const maybeErrors = (error as any).errors;
    return {
      message: String((error as any).message || ""),
      errors: maybeErrors,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return normalizePayload(error);
}

export function getErrorCode(error: unknown) {
  return extractErrorPayload(error)?.code;
}

// Alias kept for existing imports
export const getAdminErrorCode = getErrorCode;
export function getErrorCorrelationId(error: unknown) {
  return extractErrorPayload(error)?.correlationId;
}

function translateErrorCode(code: string | undefined, t: TFunction) {
  if (!code) return null;
  const normalized = code.toUpperCase();
  const key = ERROR_CODE_TRANSLATIONS[normalized];
  if (!key) return null;
  const translated = t(key, { defaultValue: "" });
  if (translated && translated !== key) return translated;
  return null;
}

export function getAdminErrorMessage(error: unknown, t: TFunction, fallbackMessage?: string) {
  // Always log correlationId/code for support debugging
  logErrorDetails(error);
  const payload = extractErrorPayload(error);

  const codeTranslation = translateErrorCode(payload?.code, t);
  if (codeTranslation) return codeTranslation;

  if (payload?.message) return payload.message;

  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "string" && error.trim()) return error.trim();

  if (fallbackMessage && fallbackMessage.trim()) return fallbackMessage;

  return t("errors.DEFAULT");
}

export function logErrorDetails(error: unknown, context?: string) {
  const code = getErrorCode(error);
  const correlationId = getErrorCorrelationId(error);
  const prefix = context ? `[${context}] ` : "";
  if (code || correlationId) {
    console.error(`${prefix}API error`, { code, correlationId, error });
  }
}

export function buildErrorList(error: unknown) {
  if (!error) return [] as string[];

  if (Array.isArray(error)) {
    return error
      .map((item) => (typeof item === "string" ? item : (item as any)?.message || ""))
      .filter(Boolean);
  }

  const payload = extractErrorPayload(error);
  const container = payload?.errors ?? (typeof error === "object" ? (error as any).errors : undefined);

  if (!container) return [] as string[];

  if (Array.isArray(container)) {
    return container.map((item) => item?.message).filter(Boolean) as string[];
  }

  if (typeof container === "object") {
    return Object.values(container)
      .map((entry) => (Array.isArray(entry) ? entry[0] : entry))
      .map((entry) => (typeof entry === "string" ? entry : ""))
      .filter(Boolean);
  }

  return [] as string[];
}
