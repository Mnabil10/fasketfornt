import { api } from "../lib/api";

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
export async function adminLogin(identifier: string, password: string): Promise<LoginResponse> {
  const userAgent = resolveUserAgent();
  const { data } = await api.post<LoginResponse>(
    "/api/v1/auth/login",
    { identifier, password },
    {
      headers: {
        // Browsers block overriding the actual User-Agent header, so send a custom mirror instead.
        "X-User-Agent": userAgent,
      },
    }
  );
  if (!data?.accessToken) throw new Error("Login failed");
  return data;
}

// Refresh token to obtain a new pair
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  if (!refreshToken) throw new Error("Refresh token missing");
  const { data } = await api.post<{ accessToken: string; refreshToken?: string }>(
    "/api/v1/auth/refresh",
    null,
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }
  );
  if (!data?.accessToken) throw new Error("Refresh token failed");
  return data;
}

export function logout() {
  localStorage.removeItem("fasket_admin_token");
  localStorage.removeItem("fasket_admin_refresh");
  localStorage.removeItem("fasket_admin_user");
}
