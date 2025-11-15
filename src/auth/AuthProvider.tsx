
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthEvent } from "../lib/auth-events";

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
  const raw = localStorage.getItem("fasket_admin_user");
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("fasket_admin_token"));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("fasket_admin_refresh"));
  const [user, setUser] = useState<User>(() => readStoredUser());

  const signIn: AuthContextValue["signIn"] = ({ accessToken, refreshToken, user }) => {
    const normalizedUser = normalizeUserRole(user);
    localStorage.setItem("fasket_admin_token", accessToken);
    if (refreshToken) localStorage.setItem("fasket_admin_refresh", refreshToken);
    localStorage.setItem("fasket_admin_user", JSON.stringify(normalizedUser));
    setToken(accessToken);
    setRefreshToken(refreshToken ?? null);
    setUser(normalizedUser);
  };

  const signOut = useCallback(() => {
    localStorage.removeItem("fasket_admin_token");
    localStorage.removeItem("fasket_admin_refresh");
    localStorage.removeItem("fasket_admin_user");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthEvent("logout", () => signOut());
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("fasket_admin_")) {
        if (!localStorage.getItem("fasket_admin_token")) {
          signOut();
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, [signOut]);

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
