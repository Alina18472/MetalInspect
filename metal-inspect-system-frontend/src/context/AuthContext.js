import React, { createContext, useContext, useMemo, useState } from "react";
import { api } from "../services/Api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("access_token"));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("user_email") || "");
  const [roleId, setRoleId] = useState(() => Number(localStorage.getItem("role_id")) || 0);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!accessToken;

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const data = await api.loginJson(email, password);

      if (!data?.access_token) throw new Error("Сервер не вернул access_token");

      const role = Number(data?.user?.role_id) || 0;


      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);
      localStorage.setItem("role_id", String(role));
      localStorage.setItem("user", JSON.stringify(data.user));


      setAccessToken(data.access_token);
      setUserEmail(email);
      setRoleId(role);

      // ✅ вернем роль, чтобы Auth.js мог решить куда редиректить
      return { ok: true, role_id: role };
    } catch (e) {
      return { ok: false, error: e?.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("role_id");
    setAccessToken(null);
    setUserEmail("");
    setRoleId(0);
  };

  const value = useMemo(
    () => ({ accessToken, userEmail, roleId, isAuthenticated, isLoading, login, logout }),
    [accessToken, userEmail, roleId, isAuthenticated, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
