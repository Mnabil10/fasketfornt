import { api } from "../lib/api";
import { clearTokens, getRefreshToken, setAccessToken, setRefreshToken } from "../lib/token-storage";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; role: string; phone?: string; email?: string };
};

function resolveUserAgent() {
  if (typeof navigator === "undefined") return "admin-web";
  return navigator.userAgent || "admin-web";
}

// Login using phone/email + password
export async function adminLogin(identifier: string, password: string, otp?: string): Promise<LoginResponse> {
  const userAgent = resolveUserAgent();
  const { data } = await api.post<LoginResponse>(
    "/api/v1/auth/login",
    { identifier, password, ...(otp ? { otp } : {}) },
    {
      headers: {
        // Browsers block overriding the actual User-Agent header, so send a custom mirror instead.
        "X-User-Agent": userAgent,
      },
    }
  );
  if (!data?.accessToken) throw new Error("Login failed");
  setAccessToken(data.accessToken);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
  return data;
}

// Refresh token to obtain a new pair
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  if (!refreshToken) {
    // Allow cookie-based refresh when token is stored as HttpOnly cookie
    const { data } = await api.post<{ accessToken: string; refreshToken?: string }>("/api/v1/auth/refresh", null, {
      withCredentials: true,
    });
    if (!data?.accessToken) throw new Error("Refresh token failed");
    return data;
  }

  const { data } = await api.post<{ accessToken: string; refreshToken?: string }>("/api/v1/auth/refresh", null, {
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
    withCredentials: true,
  });
  if (!data?.accessToken) throw new Error("Refresh token failed");
  return data;
}

export async function logout(refreshToken?: string | null) {
  try {
    const rt = refreshToken ?? getRefreshToken();
    await api.post(
      "/api/v1/auth/logout",
      {},
      {
        headers: rt ? { Authorization: `Bearer ${rt}` } : undefined,
        withCredentials: true,
      }
    );
  } catch {
    // ignore to ensure local cleanup
  } finally {
    clearTokens();
    sessionStorage.removeItem("fasket_admin_user");
    localStorage.removeItem("fasket_admin_user");
  }
}
