import type { AxiosError } from "axios";
import type { TFunction } from "i18next";

type BackendErrorPayload = {
  success?: boolean;
  code?: string;
  message?: string;
  correlationId?: string;
  error?: string | { code?: string; message?: string; details?: unknown; correlationId?: string };
  errors?: Array<{ message?: string }> | Record<string, string | string[]>;
  details?: unknown;
};

type NormalizedErrorPayload = {
  code?: string;
  message?: string;
  correlationId?: string;
  errors?: BackendErrorPayload["errors"] | unknown;
};

const ERROR_CODE_TRANSLATIONS: Record<string, string> = {
  ORDER_NOT_FOUND: "errors.ORDER_NOT_FOUND",
  ORDER_INVALID_STATUS_TRANSITION: "errors.ORDER_INVALID_STATUS_TRANSITION",
  ORDER_ALREADY_COMPLETED: "errors.ORDER_ALREADY_COMPLETED",
  ORDER_ASSIGNMENT_NOT_ALLOWED: "errors.ORDER_ASSIGNMENT_NOT_ALLOWED",
  ORDER_UNAUTHORIZED: "errors.ORDER_UNAUTHORIZED",
  ADDRESS_INVALID_ZONE: "errors.ADDRESS_INVALID_ZONE",
  DRIVER_NOT_FOUND: "errors.DRIVER_NOT_FOUND",
  DRIVER_INACTIVE: "errors.DRIVER_INACTIVE",
  ORDER_DRIVER_ALREADY_ASSIGNED: "errors.DRIVER_ALREADY_ASSIGNED",
  DRIVER_ALREADY_ASSIGNED: "errors.DRIVER_ALREADY_ASSIGNED",
  LOYALTY_DISABLED: "errors.LOYALTY_DISABLED",
  LOYALTY_NOT_ENOUGH_POINTS: "errors.LOYALTY_NOT_ENOUGH_POINTS",
  LOYALTY_RULE_VIOLATION: "errors.LOYALTY_RULE_VIOLATION",
  SETTING_NOT_CONFIGURED: "errors.SETTING_NOT_CONFIGURED",
  SETTINGS_NOT_FOUND: "errors.SETTINGS_NOT_FOUND",
  VALIDATION_FAILED: "errors.VALIDATION_FAILED",
  INTERNAL_ERROR: "errors.INTERNAL_ERROR",
  RATE_LIMITED: "errors.RATE_LIMITED",
  UNAUTHORIZED: "errors.UNAUTHORIZED",
  DEFAULT: "errors.DEFAULT",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function isAxiosError(value: unknown): value is AxiosError {
  return isRecord(value) && "isAxiosError" in value;
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
  const rawMessage =
    data.message ??
    nested?.message ??
    (typeof data.error === "string" ? data.error : undefined);
  const rawCode = data.code ?? nested?.code;
  const details = data.details ?? nested?.details;
  const errors =
    data.errors ?? (isRecord(details) && "errors" in details ? details.errors : details);

  return {
    code: rawCode ? String(rawCode).toUpperCase() : undefined,
    message: rawMessage,
    correlationId: data.correlationId ?? nested?.correlationId,
    errors,
  };
}

function extractErrorPayload(error: unknown): NormalizedErrorPayload | null {
  if (!error) return null;

  if (isAxiosError(error)) {
    return normalizePayload(error.response?.data);
  }

  if (isRecord(error) && "response" in error) {
    const response = (error as { response?: unknown }).response;
    return normalizePayload((response as AxiosError["response"])?.data);
  }

  if (isRecord(error) && "message" in error) {
    const maybeErrors = error.errors;
    return {
      message: String((error as { message?: unknown }).message || ""),
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
  const detailList = buildErrorList(payload || error);

  const codeTranslation = translateErrorCode(payload?.code, t);
  if (codeTranslation && detailList.length === 0) return codeTranslation;

  if (payload?.message) {
    if (detailList.length) {
      return `${payload.message}: ${detailList.join(", ")}`.trim();
    }
    return payload.message;
  }

  if (detailList.length) {
    return detailList.join(", ");
  }

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
      .map((item) => {
        if (typeof item === "string") return item;
        if (isRecord(item) && "message" in item && typeof item.message === "string") {
          return item.message;
        }
        return "";
      })
      .filter(Boolean);
  }

  const payload = extractErrorPayload(error);
  const container = payload?.errors ?? (isRecord(error) ? error.errors : undefined);

  if (!container) return [] as string[];

  if (Array.isArray(container)) {
    return container.map((item) => item?.message).filter(Boolean) as string[];
  }

  if (isRecord(container)) {
    return Object.values(container)
      .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (isRecord(entry) && "message" in entry && typeof entry.message === "string") {
          return entry.message;
        }
        return "";
      })
      .filter(Boolean);
  }

  return [] as string[];
}
