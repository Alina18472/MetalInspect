
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { useEffect } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const Auth = () => {
  const [email, setEmail] = useState(""); // логин = email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();




  useEffect(() => {
    document.body.classList.add("auth-page");
    return () => document.body.classList.remove("auth-page");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // таймаут, чтобы не зависать на "Проверка данных..." бесконечно
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || "Неверная почта или пароль");
      }

      if (!data?.access_token) {
        throw new Error("Сервер не вернул access_token");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);

      navigate("/dashboard");
    } catch (err) {
      if (err.name === "AbortError") setError("Сервер не отвечает (таймаут)");
      else setError(err.message || "Ошибка авторизации");
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  return (
    <div className="login-container">
      <div className="header-auth">
        <div className="logo">
          <h1>Metal Inspect</h1>
          <div className="subtitle">Система распознавания трещин в слитках</div>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} id="loginForm">
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}

          {/* структура 1-в-1 как у тебя, только username -> email */}
          <div className="input-group">
            <label htmlFor="email">
              <i className="fas fa-user"></i> Логин
            </label>
            <div className="input-icon">
              <i className="fas fa-user"></i>
            </div>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Введите вашу почту"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">
              <i className="fas fa-lock"></i> Пароль
            </label>
            <div className="input-icon">
              <i className="fas fa-lock"></i>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Введите ваш пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
            <div
              className="password-toggle"
              id="togglePassword"
              onClick={togglePasswordVisibility}
              style={{ cursor: "pointer" }}
              aria-label="toggle password"
            >
              <i className={`fas fa-eye${showPassword ? "-slash" : ""}`}></i>
            </div>
          </div>

          <button
            type="submit"
            className={`login-btn ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Проверка данных...
              </>
            ) : (
              "Войти в систему"
            )}
          </button>
        </form>
      </div>

      <div className="footer">
        <p style={{ marginTop: "15px" }}>
          Для доступа к системе требуется авторизация.<br />
          Обратитесь к администратору для получения учетных данных.
        </p>
        <p style={{ marginTop: "10px", fontSize: "0.8rem" }}>© 2026 Metal Inspect.</p>
      </div>
    </div>
  );
};

export default Auth;
