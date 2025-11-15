import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import i18n from "../i18n";
import { refreshAccessToken } from "../services/auth.service";
import { emitAuthEvent } from "./auth-events";

export const api = axios.create({
  // baseURL: import.meta.env.VITE_API_URL || "https://api.fasket.cloud",
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  timeout: 15000,
});

// attach bearer
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fasket_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// handle 401 with refresh
let refreshing = false;
let queue: ((t: string) => void)[] = [];
const onRefreshed = (t: string) => { queue.forEach((cb) => cb(t)); queue = []; };

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

function hardSignOut() {
  localStorage.removeItem("fasket_admin_token");
  localStorage.removeItem("fasket_admin_refresh");
  localStorage.removeItem("fasket_admin_user");
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
        return { ...response, data: payload.data };
      }
      const error = new Error(payload?.error?.message || "Request failed");
      (error as any).isAxiosError = true;
      (error as any).response = {
        ...response,
        data: payload.error ?? payload,
      };
      (error as any).config = response.config;
      return Promise.reject(error);
    }
    return response;
  },
  async (err: AxiosError) => {
    const status = err.response?.status;
    const original = (err.config || {}) as RetryableConfig;

    // Handle unauthorized: attempt refresh once
    if (status === 401 && !original._retry) {
      original._retry = true;
      const rt = localStorage.getItem("fasket_admin_refresh");
      if (!rt) {
        hardSignOut();
        location.href = "/signin";
        throw err;
      }

      if (refreshing) {
        return new Promise((resolve) => {
          queue.push((t) => {
            original.headers = original.headers || {};
            (original.headers as any).Authorization = `Bearer ${t}`;
            resolve(api(original));
          });
        });
      }

      refreshing = true;
      try {
        const { accessToken, refreshToken } = await refreshAccessToken(rt);
        localStorage.setItem("fasket_admin_token", accessToken);
        if (refreshToken) localStorage.setItem("fasket_admin_refresh", refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        onRefreshed(accessToken);
        return api(original);
      } catch (e) {
        toast.error(i18n.t("auth.sessionExpired", "Session expired, please login again"));
        hardSignOut();
        location.href = "/signin";
        throw e;
      } finally {
        refreshing = false;
      }
    }

    // Forbidden: redirect to a friendly page
    if (status === 403) {
      // Do not clear tokens here; user may have other permissions
      if (location.pathname !== "/forbidden") {
        location.href = "/forbidden";
      }
    }

    // Network error or other status
    throw err;
  }
);
