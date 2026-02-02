
// src/components/Auth.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { useAuth } from "../context/AuthContext";

const Auth = () => {
  const [email, setEmail] = useState(""); // логин = email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ✅ берем из контекста
  const { login, isLoading } = useAuth();

  useEffect(() => {
    document.body.classList.add("auth-page");
    return () => document.body.classList.remove("auth-page");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password);

    if (!result?.ok) {
      setError(result?.error || "Ошибка авторизации");
      return;
    }

    // ✅ редирект по роли: admin(1) -> /admin/account, engineer(2) -> /account
    const role = Number(result.role_id) || Number(localStorage.getItem("role_id")) || 0;

   
    navigate("/dashboard", { replace: true });
   
    
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
