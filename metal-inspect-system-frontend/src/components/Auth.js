import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const Auth = () => {
  const [email, setEmail] = useState("");       // логин = почта
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // FastAPI часто возвращает detail
        throw new Error(data?.detail || "Неверная почта или пароль");
      }

      // Ожидаем: { access_token: "...", token_type: "bearer" }
      if (!data?.access_token) {
        throw new Error("Сервер не вернул access_token");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Ошибка авторизации");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="header">
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
