import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import i18n from "../i18n";
import { refreshAccessToken } from "../services/auth.service";
import { emitAuthEvent } from "./auth-events";
import { navigateTo } from "./navigation";
import { clearAuthState } from "./logout";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./token-storage";

const baseURL = import.meta.env.VITE_API_BASE;
if (!baseURL) {
  throw new Error("VITE_API_BASE is required for Admin Web");
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

// attach bearer
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// handle 401 with refresh
let refreshing = false;
type RefreshQueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let queue: RefreshQueueItem[] = [];
const onRefreshed = (t: string) => { queue.forEach(({ resolve }) => resolve(t)); queue = []; };
const onRefreshFailed = (err: unknown) => { queue.forEach(({ reject }) => reject(err)); queue = []; };

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

type ErrorPayload = {
  success?: boolean;
  code?: unknown;
  message?: unknown;
  correlationId?: unknown;
  error?: unknown;
  details?: unknown;
  errors?: unknown;
};

type NormalizedApiError = {
  success: false;
  code?: string;
  message?: string;
  correlationId?: string;
  errors?: unknown;
  details?: Record<string, unknown> | unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toString = (value: unknown) => (typeof value === "string" ? value : undefined);

function normalizeErrorResponse(data: unknown): NormalizedApiError | null {
  if (!isRecord(data)) return null;

  const nested = isRecord(data.error) ? data.error : undefined;
  const message = toString(data.message) ?? toString(nested?.message) ?? toString(data.error);
  const code = toString(data.code) ?? toString(nested?.code);
  const correlationId = toString(data.correlationId) ?? toString(nested?.correlationId);

  const details = (data as ErrorPayload).details ?? nested?.details ?? (data as ErrorPayload).errors;
  const errors =
    isRecord(details) && "errors" in details
      ? (details as Record<string, unknown>).errors
      : details;

  return {
    success: false,
    code,
    message,
    correlationId,
    errors,
    details: isRecord(details) ? details : undefined,
  };
}

function hardSignOut() {
  clearAuthState();
  emitAuthEvent("logout");
}

api.interceptors.response.use(
  (response) => {
    const responseType = response.config?.responseType;
    if (responseType && responseType !== "json" && responseType !== undefined) {
      return response;
    }
    const payload = response.data;
    if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "success")) {
      if (payload.success !== false) {
        return { ...response, data: payload.data ?? null };
      }
      const normalizedError: NormalizedApiError =
        normalizeErrorResponse(payload) ?? {
          success: false,
          code: toString(payload?.error?.code),
          message: toString(payload?.error?.message) ?? "Request failed",
          correlationId: toString(payload?.correlationId),
          errors: (payload?.error as ErrorPayload | undefined)?.details ?? payload?.errors,
        };
      const error = new Error(normalizedError.message || "Request failed") as AxiosError<NormalizedApiError>;
      error.isAxiosError = true;
      error.response = {
        ...response,
        data: normalizedError,
      };
      error.config = response.config;
      return Promise.reject(error);
    }
    return response;
  },
  async (err: AxiosError) => {
    const status = err.response?.status;
    const original = (err.config || {}) as RetryableConfig;
    const originalUrl = typeof original.url === "string" ? original.url : "";
    const isAuthEndpoint = /\/auth\/(login|register|signup)/.test(originalUrl);

    if (err.response?.data) {
      const normalized = normalizeErrorResponse(err.response.data);
      if (normalized) {
        const normalizedError = new Error(normalized.message || "Request failed") as AxiosError<NormalizedApiError>;
        normalizedError.isAxiosError = true;
        normalizedError.config = err.config;
        normalizedError.response = {
          ...(err.response || {}),
          data: normalized,
        };
        err = normalizedError;
      }
    }

    // Handle unauthorized: attempt refresh once
    if (status === 401 && !original._retry) {
      if (isAuthEndpoint) {
        // For auth flows, surface the error to the UI without redirect/refresh handling
        throw err;
      }

      original._retry = true;
      const rt = getRefreshToken();
      if (!rt) {
        hardSignOut();
        throw err;
      }

      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (t) => {
              const headers = { ...(original.headers || {}) } as Record<string, string>;
              headers.Authorization = `Bearer ${t}`;
              original.headers = headers;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      refreshing = true;
      try {
        const { accessToken, refreshToken } = await refreshAccessToken(rt);
        setAccessToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        onRefreshed(accessToken);
        const headers = { ...(original.headers || {}) } as Record<string, string>;
        headers.Authorization = `Bearer ${accessToken}`;
        original.headers = headers;
        return api(original);
      } catch (e) {
        onRefreshFailed(e);
        toast.error(i18n.t("auth.sessionExpired", "Session expired, please login again"));
        hardSignOut();
        throw e;
      } finally {
        refreshing = false;
      }
    }

    // Forbidden: redirect to a friendly page
    if (status === 403) {
      // Do not clear tokens here; user may have other permissions
      navigateTo("/forbidden", { replace: true });
    }

    // Network error or other status
    throw err;
  }
);
