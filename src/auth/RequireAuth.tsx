import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAdminOrStaff({ children }: { children: React.ReactNode }) {
  const { isAuthed, isAdmin, isStaff } = useAuth();
  const location = useLocation();

  if (!isAuthed) return <Navigate to="/signin" replace state={{ from: location }} />;
  if (!isAdmin && !isStaff) return <Navigate to="/forbidden" replace />;

  return <>{children}</>;
}
