import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { LOGIN_PATH } from "../lib/logout";

export default function RequireAdminOrStaff({ children }: { children: React.ReactNode }) {
  const { isAuthed, isAdmin, isStaff, isOps, isFinance, user } = useAuth();
  const location = useLocation();

  if (!isAuthed) return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  const allowed =
    isAdmin ||
    isStaff ||
    isOps ||
    isFinance ||
    (user?.role ? ["ADMIN", "STAFF", "OPS_MANAGER", "FINANCE"].includes(user.role) : false);
  if (!allowed) return <Navigate to="/forbidden" replace />;

  return <>{children}</>;
}
