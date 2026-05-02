//AuthContext.js
import React, { createContext, useContext, useMemo, useState } from "react";
import { api } from "../services/Api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("access_token"));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("user_email") || "");
  const [roleId, setRoleId] = useState(() => Number(localStorage.getItem("role_id")) || 0);

  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!accessToken;

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const data = await api.loginJson(email, password);

      if (!data?.access_token) throw new Error("Сервер не вернул access_token");
      if (!data?.user) throw new Error("Сервер не вернул данные пользователя");

      const role = Number(data.user.role_id) || 0;

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);
      localStorage.setItem("role_id", String(role));
      localStorage.setItem("user", JSON.stringify(data.user));

      setAccessToken(data.access_token);
      setUserEmail(email);
      setRoleId(role);
      setUser(data.user);

      return { ok: true, role_id: role };
    } catch (e) {
      return { ok: false, error: e?.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: подтягиваем актуального пользователя по токену
  const loadMe = async () => {
    try {
      const me = await api.getMe();
      const role = Number(me.role_id) || 0;

      localStorage.setItem("role_id", String(role));
      localStorage.setItem("user", JSON.stringify(me));

      setRoleId(role);
      setUser(me);

      return { ok: true, user: me };
    } catch (e) {
      return { ok: false, error: e?.message || "Failed to load profile" };
    }
  };
  const updateMe = async (payload) => {
    try {
      const me = await api.updateMe(payload);
      const role = Number(me.role_id) || 0;
  
      localStorage.setItem("role_id", String(role));
      localStorage.setItem("user", JSON.stringify(me));
  
      setRoleId(role);
      setUser(me);
  
      return { ok: true, user: me };
    } catch (e) {
      return { ok: false, error: e?.data?.detail || e?.message || "Failed to update profile" };
    }
  };
  

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("role_id");
    localStorage.removeItem("user");

    setAccessToken(null);
    setUserEmail("");
    setRoleId(0);
    setUser(null);
  };

  const value = useMemo(
    () => ({ accessToken, userEmail, roleId, user, isAuthenticated, isLoading, login, loadMe, logout, updateMe }),
    [accessToken, userEmail, roleId, user, isAuthenticated, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
