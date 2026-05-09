import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { useAuth } from "../context/AuthContext";

const EyeIcon = ({ isVisible }) => {
  return (
    <svg
      className="password-eye-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.4 12C4.2 7.8 7.7 5.5 12 5.5C16.3 5.5 19.8 7.8 21.6 12C19.8 16.2 16.3 18.5 12 18.5C7.7 18.5 4.2 16.2 2.4 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      {isVisible && (
        <path
          d="M4 20L20 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
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

    navigate("/dashboard", { replace: true });
  };

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
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Логин</label>

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
            <label htmlFor="password">Пароль</label>

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

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              title={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              <EyeIcon isVisible={showPassword} />
            </button>
          </div>

          <button
            type="submit"
            className={`login-btn ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? "Проверка данных..." : "Войти в систему"}
          </button>
        </form>
      </div>

      <div className="footer">
        <p>
          Для доступа к системе требуется авторизация.
          <br />
          Обратитесь к администратору для получения учетных данных.
        </p>

        <p className="auth-copyright">© 2026 Metal Inspect.</p>
      </div>
    </div>
  );
};

export default Auth;