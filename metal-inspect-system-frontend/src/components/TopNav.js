import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/topnav.css";
import { useAuth } from "../context/AuthContext";

export default function TopNav({ subtitle, userName, userRole }) {
  const navigate = useNavigate();
  const { roleId } = useAuth();

  const linkClass = ({ isActive }) => `nav-btn ${isActive ? "active" : ""}`;

  const goToAccount = () => {
    if (Number(roleId) === 1) navigate("/admin/account");
    else navigate("/account");
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

        <NavLink to="/settings" className={linkClass}>
          <i className="fas fa-sliders-h"></i> Настройки
        </NavLink>
      </div>

      <div
        className="user-info user-info-clickable"
        onClick={goToAccount}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") goToAccount();
        }}
        title="Открыть аккаунт"
      >
        <div className="user-avatar">
          <i className="fas fa-user"></i>
        </div>
        <div>
          <div className="user-name">{userName}</div>
          <div className="user-role">{userRole}</div>
        </div>
      </div>
    </div>
  );
}
