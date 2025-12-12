// src/App.tsx
import React from "react";
import "./i18n";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import SignIn from "./components/auth/SignIn";
import Forbidden from "./components/auth/Forbidden";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import RequireAdmin from "./auth/RequireAuth";
import { Toaster } from "./components/ui/sonner";
import { LOGIN_PATH } from "./lib/logout";

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <Routes>
          <Route path={LOGIN_PATH} element={<SignIn />} />
          <Route path="/signin" element={<Navigate to={LOGIN_PATH} replace />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
        </Routes>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
