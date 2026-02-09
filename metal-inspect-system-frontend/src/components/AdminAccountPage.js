
import React, { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import "../styles/admin_account.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/Api";

const AdminAccount = () => {
  const { user, loadMe } = useAuth();

  const [users, setUsers] = useState([]); // теперь из БД
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    lastname: "",
    name: "",
    middlename: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Инженер",
    is_active: true,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [notification, setNotification] = useState(null);

  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    engineers: 0,
    admins: 0,
    newThisMonth: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // подтянуть профиль, если надо
  useEffect(() => {
    if (!user) loadMe();
  }, [user, loadMe]);

  // подтянуть список пользователей из БД
  useEffect(() => {
    const run = async () => {
      setLoadingUsers(true);
      try {
        const data = await api.getUsers();
        // ожидаем массив пользователей
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        showNotification(e?.message || "Не удалось загрузить список пользователей", "error");
      } finally {
        setLoadingUsers(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.classList.add("admin-account-page");
    return () => document.body.classList.remove("admin-account-page");
  }, []);

  // статистика
  useEffect(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.is_active).length;
    const engineers = users.filter((u) => Number(u.role_id) === 2).length;
    const admins = users.filter((u) => Number(u.role_id) === 1).length;

    const thisMonth = new Date().getMonth();
    const newThisMonth = users.filter((u) => {
      if (!u.created_at) return false;
      const createdMonth = new Date(u.created_at).getMonth();
      return createdMonth === thisMonth;
    }).length;

    setSystemStats({ totalUsers, activeUsers, engineers, admins, newThisMonth });
  }, [users]);

  const showNotification = (message, type) => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));
      setTimeout(() => setNotification(null), 300);
    }, 3000);
  };

  const profile = useMemo(() => {
    const last = user?.last_name || "";
    const first = user?.first_name || "";
    const pat = user?.patronymic || "";
    const fullName = `${last} ${first} ${pat}`.trim() || user?.email || "Администратор";

    const shortName =
      (last && first && `${last} ${first[0]}.` + (pat ? `${pat[0]}.` : "")) || fullName;

    return {
      name: fullName,
      shortName,
      role: user?.role_name || "Администратор",
      employeeId: `#${user?.id ?? "—"}`,
      department: "—",
      email: user?.email || "—",
      phone: user?.phone || "—",
      avatarStatus: "online",
    };
  }, [user]);

  // преобразование user из БД -> формат для таблицы (last_name/first_name/patronymic)
  const normalizedUsers = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      lastname: u.last_name || "",
      name: u.first_name || "",
      middlename: u.patronymic || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role_name || (Number(u.role_id) === 1 ? "Админ" : "Инженер"),
      role_id: Number(u.role_id) || 0,
      is_active: !!u.is_active,
      created_at: u.created_at || "",
    }));
  }, [users]);

  const filteredUsers = normalizedUsers.filter((u) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !s ||
      u.lastname.toLowerCase().includes(s) ||
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.phone.includes(searchTerm);

    const matchesRole = roleFilter === "all" || u.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.is_active) ||
      (statusFilter === "inactive" && !u.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const copyEmail = (email) => {
    navigator.clipboard.writeText(email);
    showNotification("Email скопирован в буфер обмена", "info");
  };

  // Заглушки: действия CRUD пока не подключаем к API, чтобы UI не ломать
  const openCreateModal = () => {
    showNotification("Создание пользователя подключим после API (POST /users)", "info");
  };

  const openEditModal = () => {
    showNotification("Редактирование подключим после API (PUT /users/{id})", "info");
  };

  const confirmDeleteUser = (u) => {
    setUserToDelete(u);
    setDeleteConfirmOpen(true);
  };

  const deleteUser = () => {
    showNotification("Удаление подключим после API (DELETE /users/{id})", "info");
    setDeleteConfirmOpen(false);
    setUserToDelete(null);
  };

  const toggleUserStatus = () => {
    showNotification("Переключение статуса подключим после API (PATCH /users/{id})", "info");
  };

  if (!user) {
    return (
      <div className="admin-account-container" style={{ padding: 24, color: "#b0c4de" }}>
        Загрузка профиля...
      </div>
    );
  }

  return (
    <div className="admin-account-container">
      {notification && (
        <div className={`admin-notification ${notification.type} ${notification.show ? "show" : ""}`}>
          <i
            className={`fas ${
              notification.type === "success"
                ? "fa-check-circle"
                : notification.type === "error"
                ? "fa-exclamation-circle"
                : "fa-info-circle"
            }`}
          ></i>
          <div className="admin-notification-message">{notification.message}</div>
        </div>
      )}

      <TopNav
        subtitle="Система распознавания трещин в слитках • Админ-панель"
        userName={profile.name}
        userRole="Администратор"
      />

      <div className="admin-main-content">
        <div className="admin-profile-sidebar">
          <div className="admin-profile-card">
            <div className="admin-profile-header">
              <div className="admin-avatar-wrapper">
                <div className="admin-profile-avatar">
                  <i className="fas fa-user-shield"></i>
                </div>
                <div className={`admin-status-indicator admin-status-${profile.avatarStatus}`}></div>
              </div>
              <div className="admin-profile-name">{profile.shortName}</div>
              <div className="admin-profile-role">{profile.role}</div>
              <div className="admin-profile-status">Супер-администратор</div>
            </div>
            <div className="admin-profile-details">
              <div className="admin-detail-row">
                <div className="admin-detail-label">
                  <i className="fas fa-id-badge"></i>
                  <span>ID администратора:</span>
                </div>
                <div className="admin-detail-value">{profile.employeeId}</div>
              </div>
              <div className="admin-detail-row">
                <div className="admin-detail-label">
                  <i className="fas fa-building"></i>
                  <span>Подразделение:</span>
                </div>
                <div className="admin-detail-value">{profile.department}</div>
              </div>
              <div className="admin-detail-row">
                <div className="admin-detail-label">
                  <i className="fas fa-envelope"></i>
                  <span>Email:</span>
                </div>
                <div className="admin-detail-value">{profile.email}</div>
              </div>
              <div className="admin-detail-row">
                <div className="admin-detail-label">
                  <i className="fas fa-phone"></i>
                  <span>Телефон:</span>
                </div>
                <div className="admin-detail-value">{profile.phone}</div>
              </div>
            </div>
          </div>

          <div className="admin-system-stats">
            <div className="admin-stats-header">
              <h2>
                <i className="fas fa-chart-pie"></i> Статистика системы
              </h2>
            </div>
            <div className="admin-stats-grid">
              <div className="admin-stat-item">
                <div className="admin-stat-icon" style={{ background: "linear-gradient(135deg, #4dabf7, #2a6bc0)" }}>
                  <i className="fas fa-users"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{systemStats.totalUsers}</div>
                  <div className="admin-stat-label">Всего пользователей</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-icon" style={{ background: "linear-gradient(135deg, #4CAF50, #2E7D32)" }}>
                  <i className="fas fa-user-check"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{systemStats.activeUsers}</div>
                  <div className="admin-stat-label">Активных</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-icon" style={{ background: "linear-gradient(135deg, #9C27B0, #6A1B9A)" }}>
                  <i className="fas fa-user-cog"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{systemStats.engineers}</div>
                  <div className="admin-stat-label">Инженеров</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-icon" style={{ background: "linear-gradient(135deg, #FF9800, #EF6C00)" }}>
                  <i className="fas fa-user-shield"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{systemStats.admins}</div>
                  <div className="admin-stat-label">Администраторов</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-icon" style={{ background: "linear-gradient(135deg, #00BCD4, #00838F)" }}>
                  <i className="fas fa-user-plus"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{systemStats.newThisMonth}</div>
                  <div className="admin-stat-label">Новых за месяц</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-management-panel">
          <div className="admin-management-header">
            <div className="admin-header-title">
              <h1>
                <i className="fas fa-users-cog"></i> Управление пользователями
              </h1>
              <p className="admin-header-subtitle">Просмотр пользователей из базы данных</p>
            </div>
            <div className="admin-header-actions">
              <button className="admin-action-button admin-action-primary" onClick={openCreateModal}>
                <i className="fas fa-user-plus"></i>
                Добавить пользователя
              </button>
              <button className="admin-action-button admin-action-secondary" onClick={resetFilters}>
                <i className="fas fa-filter"></i>
                Сбросить фильтры
              </button>
            </div>
          </div>

          <div className="admin-filters-panel">
            <div className="admin-search-container">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Поиск по ФИО, email или телефону..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-search-input"
              />
              {searchTerm && (
                <button className="admin-search-clear" onClick={() => setSearchTerm("")}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <div className="admin-filters-container">
              <div className="admin-filter-group">
                <label className="admin-filter-label">
                  <i className="fas fa-user-tag"></i>
                  Роль:
                </label>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="admin-filter-select">
                  <option value="all">Все роли</option>
                  <option value="Инженер">Инженер</option>
                  <option value="Админ">Администратор</option>
                </select>
              </div>

              <div className="admin-filter-group">
                <label className="admin-filter-label">
                  <i className="fas fa-user-clock"></i>
                  Статус:
                </label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-filter-select">
                  <option value="all">Все статусы</option>
                  <option value="active">Активные</option>
                  <option value="inactive">Неактивные</option>
                </select>
              </div>

              <div className="admin-filter-stats">
                <span className="admin-filter-stat">
                  <i className="fas fa-file-alt"></i>
                  Найдено: {filteredUsers.length} из {normalizedUsers.length}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-users-table-container">
            <div className="admin-users-table">
              <div className="admin-table-header">
                <div className="admin-table-cell admin-cell-small">ID</div>
                <div className="admin-table-cell">ФИО</div>
                <div className="admin-table-cell">Контакт</div>
                <div className="admin-table-cell admin-cell-medium">Роль</div>
                <div className="admin-table-cell admin-cell-medium">Статус</div>
                <div className="admin-table-cell admin-cell-large">Дата создания</div>
                <div className="admin-table-cell admin-cell-large">Действия</div>
              </div>

              <div className="admin-table-body">
                {loadingUsers ? (
                  <div className="admin-table-empty">
                    <div className="admin-empty-state">
                      <i className="fas fa-spinner fa-spin"></i>
                      <h3>Загрузка пользователей...</h3>
                    </div>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <div key={u.id} className={`admin-table-row ${!u.is_active ? "admin-row-inactive" : ""}`}>
                      <div className="admin-table-cell admin-cell-small">
                        <span className="admin-user-id">#{u.id}</span>
                      </div>

                      <div className="admin-table-cell">
                        <div className="admin-user-name">
                          <div className="admin-user-fullname">
                            {u.lastname} {u.name} {u.middlename}
                          </div>
                          <div className="admin-user-initials">
                            {u.lastname} {u.name?.charAt(0) || ""}.{u.middlename?.charAt(0) || ""}.
                          </div>
                        </div>
                      </div>

                      <div className="admin-table-cell">
                        <div className="admin-user-contact">
                          <div className="admin-user-email" onClick={() => copyEmail(u.email)} title="Кликните для копирования">
                            <i className="fas fa-envelope"></i>
                            {u.email}
                          </div>
                          <div className="admin-user-phone">
                            <i className="fas fa-phone"></i>
                            {u.phone || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="admin-table-cell admin-cell-medium">
                        <div className={`admin-user-role admin-role-${u.role_id === 1 ? "admin" : "engineer"}`}>
                          <i className={u.role_id === 1 ? "fas fa-user-shield" : "fas fa-user-cog"}></i>
                          {u.role}
                        </div>
                      </div>

                      <div className="admin-table-cell admin-cell-medium">
                        <div
                          className={`admin-user-status ${u.is_active ? "admin-status-active" : "admin-status-inactive"}`}
                          onClick={() => toggleUserStatus(u.id)}
                        >
                          <div className="admin-status-indicator-small"></div>
                          {u.is_active ? "Активен" : "Неактивен"}
                        </div>
                      </div>

                      <div className="admin-table-cell admin-cell-large">
                        <div className="admin-user-date">
                          <i className="fas fa-calendar-alt"></i>
                          {u.created_at || "—"}
                        </div>
                      </div>

                      <div className="admin-table-cell admin-cell-large">
                        <div className="admin-user-actions">
                          <button className="admin-action-icon admin-action-edit" onClick={() => openEditModal(u)} title="Редактировать">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="admin-action-icon admin-action-delete" onClick={() => confirmDeleteUser(u)} title="Удалить">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                          <button className="admin-action-icon admin-action-reset" title="Сбросить пароль">
                            <i className="fas fa-key"></i>
                          </button>
                          <button className="admin-action-icon admin-action-view" title="Просмотр">
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-table-empty">
                    <div className="admin-empty-state">
                      <i className="fas fa-users-slash"></i>
                      <h3>Пользователи не найдены</h3>
                      <p>Попробуйте изменить параметры поиска</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`admin-modal-overlay ${deleteConfirmOpen ? "show" : ""}`} onClick={() => setDeleteConfirmOpen(false)}>
        <div className="admin-modal-content admin-modal-small" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-header">
            <h3>
              <i className="fas fa-exclamation-triangle"></i>
              Подтверждение удаления
            </h3>
            <button className="admin-modal-close" onClick={() => setDeleteConfirmOpen(false)}>
              &times;
            </button>
          </div>
          <div className="admin-modal-body">
            <div style={{ textAlign: "center", padding: "20px" }}>
              <i className="fas fa-trash-alt" style={{ fontSize: "3rem", color: "#f44336", marginBottom: "20px" }}></i>
              <h3 style={{ color: "#e0e0e0", marginBottom: "15px" }}>Вы уверены?</h3>
              <p style={{ color: "#b0c4de", marginBottom: "25px", lineHeight: 1.5 }}>
                Вы собираетесь удалить пользователя:<br />
                <strong style={{ color: "#e0e0e0" }}>
                  {userToDelete?.lastname} {userToDelete?.name} {userToDelete?.middlename}
                </strong>
                <br />
                <span style={{ color: "#8fb4d9" }}>{userToDelete?.email}</span>
              </p>
            </div>
          </div>
          <div className="admin-modal-footer">
            <button className="admin-modal-button admin-modal-secondary" onClick={() => setDeleteConfirmOpen(false)}>
              <i className="fas fa-times"></i>
              Отмена
            </button>
            <button className="admin-modal-button admin-modal-danger" onClick={deleteUser}>
              <i className="fas fa-trash-alt"></i>
              Удалить пользователя
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccount;
