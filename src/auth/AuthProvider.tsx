
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitAuthEvent, onAuthEvent } from "../lib/auth-events";
import { registerNavigator } from "../lib/navigation";
import { logout as logoutRequest } from "../services/auth.service";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "../lib/token-storage";
import { clearAuthState, LOGIN_PATH } from "../lib/logout";

type User = { id: string; name: string; role: string; phone?: string; email?: string } | null;

type AuthContextValue = {
  user: User;
  token: string | null;
  refreshToken: string | null;
  isAuthed: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signIn: (payload: { accessToken: string; refreshToken?: string; user: NonNullable<User> }) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUserRole(u: NonNullable<User>): NonNullable<User> {
  const role = typeof u.role === "string" ? u.role.toUpperCase() : "";
  return { ...u, role };
}

function readStoredUser(): User {
  const raw = sessionStorage.getItem("fasket_admin_user") ?? localStorage.getItem("fasket_admin_user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return normalizeUserRole(parsed);
    }
  } catch {
    // Corrupted user in storage; clear and reset
    localStorage.removeItem("fasket_admin_user");
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() => getRefreshToken());
  const [user, setUser] = useState<User>(() => readStoredUser());

  const signIn: AuthContextValue["signIn"] = ({ accessToken, refreshToken, user }) => {
    const normalizedUser = normalizeUserRole(user);
    setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    sessionStorage.setItem("fasket_admin_user", JSON.stringify(normalizedUser));
    localStorage.removeItem("fasket_admin_user");
    setToken(accessToken);
    setRefreshTokenState(refreshToken ?? null);
    setUser(normalizedUser);
  };

  const applyLocalLogout = useCallback(
    (options: { redirect?: boolean } = {}) => {
      clearAuthState({ redirect: false });
      setToken(null);
      setRefreshTokenState(null);
      setUser(null);
      if (options.redirect !== false) {
        navigate(LOGIN_PATH, { replace: true });
      }
    },
    [navigate]
  );

  const signOut = useCallback(async () => {
    const rt = getRefreshToken() ?? refreshToken;
    try {
      await logoutRequest(rt);
    } catch {
      // Best-effort: still continue with local cleanup
    } finally {
      applyLocalLogout();
      emitAuthEvent("logout");
    }
  }, [applyLocalLogout, refreshToken]);

  useEffect(() => {
    const unsubscribe = onAuthEvent("logout", () => applyLocalLogout());
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("fasket_admin_")) {
        if (!sessionStorage.getItem("fasket_admin_token") && !localStorage.getItem("fasket_admin_token")) {
          applyLocalLogout();
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyLocalLogout]);

  useEffect(() => {
    registerNavigator((path, options) => navigate(path, options));
  }, [navigate]);

  const isAdmin = user?.role === "ADMIN";
  const isStaff = user?.role === "STAFF";
  const value = useMemo(
    () => ({ user, token, refreshToken, isAuthed: !!token, isAdmin, isStaff, signIn, signOut }),
    [user, token, refreshToken, isAdmin, isStaff]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
