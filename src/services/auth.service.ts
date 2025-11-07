import { api } from "../lib/api";


export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; role: string; phone?: string; email?: string };
};

// Login using phone + password
export async function adminLogin(phone: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login", { phone, password });
  return data;
}

// Refresh token
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
  const { data } = await api.post("/api/v1/auth/refresh", { refreshToken });
  return data;
}

export function logout() {
  localStorage.removeItem("fasket_admin_token");
  localStorage.removeItem("fasket_admin_user");
}
