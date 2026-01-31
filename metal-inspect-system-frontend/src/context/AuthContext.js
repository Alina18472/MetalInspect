import React, { createContext, useContext, useMemo, useState } from "react";
import { api } from "../services/Api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("access_token"));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("user_email") || "");
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!accessToken;

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // Выбери ОДИН вариант:
      const data = await api.loginJson(email, password);
    //   const data = await api.loginForm(email, password); // <-- если form-data

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);

      setAccessToken(data.access_token);
      setUserEmail(email);

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    setAccessToken(null);
    setUserEmail("");
  };

  const value = useMemo(
    () => ({ accessToken, userEmail, isAuthenticated, isLoading, login, logout }),
    [accessToken, userEmail, isAuthenticated, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
