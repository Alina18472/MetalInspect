import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/topnav.css";
import { useAuth } from "../context/AuthContext";
import { useMemo } from "react";


export default function TopNav({ subtitle, userName, userRole }) {
  const navigate = useNavigate();
  const { roleId, logout, user, hasPermission } = useAuth();

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
        {hasPermission("dashboard.view") && (
          <NavLink to="/dashboard" className={linkClass}>
            Главный экран
          </NavLink>
        )}

        {hasPermission("journal.view") && (
          <NavLink to="/journal" className={linkClass}>
           Журнал событий
          </NavLink>
        )}

        {hasPermission("ai_models.view") && (
          <NavLink to="/ai-panel" className={linkClass}>
             ИИ панель
          </NavLink>
        )}

        {hasPermission("stats.full_view") && (
          <NavLink to="/stats" className={linkClass}>
            Статистика
          </NavLink>
        )}
      </div>

      <div className="topnav-actions">
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
          Выйти
        </button>
      </div>
    </div>
  );
}
