
import React, { createContext, useContext, useMemo, useState } from "react";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("fasket_admin_token"));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("fasket_admin_refresh"));
  const [user, setUser] = useState<User>(() => {
    const u = localStorage.getItem("fasket_admin_user");
    if (!u) return null;
    try {
      return JSON.parse(u);
    } catch {
      // Corrupted user in storage; clear and reset
      localStorage.removeItem("fasket_admin_user");
      return null;
    }
  });

  const signIn: AuthContextValue["signIn"] = ({ accessToken, refreshToken, user }) => {
    localStorage.setItem("fasket_admin_token", accessToken);
    if (refreshToken) localStorage.setItem("fasket_admin_refresh", refreshToken);
    localStorage.setItem("fasket_admin_user", JSON.stringify(user));
    setToken(accessToken);
    setRefreshToken(refreshToken ?? null);
    setUser(user);
  };

  const signOut = () => {
    localStorage.removeItem("fasket_admin_token");
    localStorage.removeItem("fasket_admin_refresh");
    localStorage.removeItem("fasket_admin_user");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

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
