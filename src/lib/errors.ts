import type { AxiosError } from "axios";

type MaybeApiError = {
  message?: string;
  error?: string | { code?: string; message?: string };
  errors?: Array<{ message?: string }> | Record<string, string | string[]>;
};

function isAxiosError(value: unknown): value is AxiosError {
  return typeof value === "object" && value !== null && "isAxiosError" in (value as any);
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (!error) return fallback;

  if (typeof error === "string" && error.trim()) return error.trim();

  if (error instanceof Error && error.message) return error.message;

  if (isAxiosError(error)) {
    const data = (error.response?.data || {}) as MaybeApiError | string;
    if (typeof data === "string" && data.trim()) return data;
    if (typeof data === "object") {
      if (data.message) return data.message;
      if (typeof data.error === "string" && data.error) return data.error;
      if (typeof data.error === "object" && data.error?.message) return data.error.message;
      if (Array.isArray(data.errors) && data.errors.length) {
        const first = data.errors.find((x) => x?.message);
        if (first?.message) return first.message;
      }
      if (data.errors && !Array.isArray(data.errors)) {
        const firstKey = Object.keys(data.errors)[0];
        const entry = data.errors[firstKey];
        if (typeof entry === "string") return entry;
        if (Array.isArray(entry) && entry[0]) return entry[0];
      }
    }
  }

  if (typeof error === "object" && error && "message" in (error as any)) {
    const message = String((error as any).message);
    if (message) return message;
  }

  try {
    const json = JSON.stringify(error);
    if (json && json.length < 180) return json;
  } catch {
    // ignore JSON issues
  }

  return fallback;
}

export function buildErrorList(error: unknown) {
  if (!error) return [] as string[];
  if (Array.isArray(error)) return error
    .map((item) => (typeof item === "string" ? item : (item?.message as string) || ""))
    .filter(Boolean);
  if (typeof error === "object" && error && "errors" in (error as any)) {
    const { errors } = error as any;
    if (Array.isArray(errors)) {
      return errors.map((item) => item?.message).filter(Boolean);
    }
    if (errors && typeof errors === "object") {
      return Object.values(errors)
        .map((entry) => (Array.isArray(entry) ? entry[0] : entry))
        .map((entry) => (typeof entry === "string" ? entry : ""))
        .filter(Boolean);
    }
  }
  return [] as string[];
}
