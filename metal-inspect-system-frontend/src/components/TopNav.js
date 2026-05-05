
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/topnav.css";
import { useAuth } from "../context/AuthContext";
import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function TopNav({ subtitle, userName, userRole }) {
  const navigate = useNavigate();
  const { roleId, logout } = useAuth();
  const { user } = useAuth();

  const computedName = useMemo(() => {
    if (user?.last_name || user?.first_name) {
      const last = user?.last_name || "";
      const first = user?.first_name || "";
      const pat = user?.patronymic || "";
      return `${last} ${first} ${pat}`.trim();
    }
    return userName || user?.email || "Пользователь";
  }, [user, userName]);

  

  const linkClass = ({ isActive }) => `nav-btn ${isActive ? "active" : ""}`;
  const accountPath = user?.role_id === 1 ? "/admin/account" : "/account";


  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="header">
      <div className="logo-section">
        <div className="logo-text">
          <h1>Metal Inspect</h1>
          <div className="subtitle">{subtitle}</div>
        </div>
      </div>

      <div className="nav-buttons">
        <NavLink to="/dashboard" className={linkClass}>
          <i className="fas fa-tachometer-alt"></i> Главный экран
        </NavLink>
        <NavLink to="/journal" className={linkClass}>
          <i className="fas fa-history"></i> Журнал событий
        </NavLink>
        <NavLink to="/ai-panel" className={linkClass}>
          <i className="fas fa-robot"></i> ИИ панель
        </NavLink>
        <NavLink to="/stats" className={linkClass}>
          <i className="fas fa-chart-bar"></i> Статистика
        </NavLink>
        {/* <NavLink to="/settings" className={linkClass}>
          <i className="fas fa-sliders-h"></i> Настройки
        </NavLink> */}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          className="user-info user-info-clickable"
          onClick={() => navigate(accountPath)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate(accountPath);
          }}
          title="Открыть аккаунт"
        >
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div>
            <div className="user-name">{computedName}</div>
            <div className="user-role">{userRole}</div>
          </div>
        </div>

        <button className="nav-btn" onClick={handleLogout} title="Выйти">
          <i className="fas fa-sign-out-alt"></i> Выйти
        </button>
      </div>
    </div>
  );
}
