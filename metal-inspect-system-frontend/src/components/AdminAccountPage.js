
import React, { useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../components/TopNav";
import "../styles/admin_account.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/Api";

const AdminAccount = () => {
  const { user, loadMe } = useAuth();

  const [users, setUsers] = useState([]);
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
  const [modalMode, setModalMode] = useState("create"); // create | edit | reset

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // toast (короткие уведомления успеха/ошибок не-валидации)
  const [notification, setNotification] = useState(null);

  // ✅ ошибки/валидация — внутри модалок
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // ✅ ЖЁСТКИЙ замок от двойных кликов / двойных вызовов
  const actionLockRef = useRef(false);

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

  const roleToId = (roleLabel) => (roleLabel === "Админ" || roleLabel === "Администратор" ? 1 : 2);
  const idToRoleLabel = (roleId) => (Number(roleId) === 1 ? "Админ" : "Инженер");

  const showToast = (message, type = "success") => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));
      setTimeout(() => setNotification(null), 250);
    }, 2500);
  };

  const formatApiError = (e) => {
    const detail = e?.data?.detail;

    if (Array.isArray(detail)) {
      const msgs = detail.map((x) => x?.msg).filter(Boolean);
      if (msgs.length) return msgs.join(", ");
    }
    if (typeof detail === "string" && detail.trim()) return detail;
    if (typeof e?.message === "string" && e.message.trim()) return e.message;

    return "Ошибка запроса";
  };

  const refreshUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("getUsers error:", e);
      showToast(formatApiError(e) || "Не удалось загрузить список пользователей", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const toApiCreatePayload = (fd) => ({
    email: (fd.email || "").trim(),
    password: fd.password,
    last_name: fd.lastname || null,
    first_name: fd.name || null,
    patronymic: fd.middlename || null,
    phone: fd.phone || null,
    role_id: roleToId(fd.role),
    is_active: !!fd.is_active,
  });

  const toApiUpdatePayload = (fd) => {
    const payload = {
      email: (fd.email || "").trim(),
      last_name: fd.lastname || null,
      first_name: fd.name || null,
      patronymic: fd.middlename || null,
      phone: fd.phone || null,
      role_id: roleToId(fd.role),
      is_active: !!fd.is_active,
    };
    if (fd.password && fd.password.length >= 6) payload.password = fd.password;
    return payload;
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
    setModalMode("create");
    setModalError("");
    setFormData((p) => ({ ...p, password: "", confirmPassword: "" }));
  };

  const closeDeleteModal = () => {
    if (isSaving) return;
    setDeleteConfirmOpen(false);
    setUserToDelete(null);
    setDeleteError("");
  };

  // profile load
  useEffect(() => {
    if (!user) loadMe();
  }, [user, loadMe]);

  // users load
  useEffect(() => {
    refreshUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.classList.add("admin-account-page");
    return () => document.body.classList.remove("admin-account-page");
  }, []);

  // stats
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

  const profile = useMemo(() => {
    const last = user?.last_name || "";
    const first = user?.first_name || "";
    const pat = user?.patronymic || "";
    const fullName = `${last} ${first} ${pat}`.trim() || user?.email || "Администратор";

    const shortName = (last && first && `${last} ${first[0]}.` + (pat ? `${pat[0]}.` : "")) || fullName;

    return {
      name: fullName,
      shortName,
      role: Number(user?.role_id) === 1 ? "Администратор" : "Инженер",
      employeeId: `#${user?.id ?? "—"}`,
      department: "—",
      email: user?.email || "—",
      phone: user?.phone || "—",
      avatarStatus: "online",
    };
  }, [user]);

  const normalizedUsers = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      lastname: u.last_name || "",
      name: u.first_name || "",
      middlename: u.patronymic || "",
      email: u.email || "",
      phone: u.phone || "",
      role_id: Number(u.role_id) || 0,
      role: idToRoleLabel(u.role_id),
      is_active: !!u.is_active,
      created_at: u.created_at || "",
    }));
  }, [users]);

  const filteredUsers = normalizedUsers.filter((u) => {
    const s = (searchTerm || "").toLowerCase();
    const matchesSearch =
      !s ||
      u.lastname.toLowerCase().includes(s) ||
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.phone || "").includes(searchTerm);

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
    showToast("Email скопирован", "info");
  };

  // ---- open modals
  const openCreateModal = () => {
    setModalError("");
    setModalMode("create");
    setFormData({
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
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setModalError("");
    setModalMode("edit");
    setFormData({
      id: u.id,
      lastname: u.lastname || "",
      name: u.name || "",
      middlename: u.middlename || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      confirmPassword: "",
      role: idToRoleLabel(u.role_id),
      is_active: !!u.is_active,
    });
    setModalOpen(true);
  };

  const openResetPasswordModal = (u) => {
    setModalError("");
    setModalMode("reset");
    setFormData({
      id: u.id,
      lastname: u.lastname || "",
      name: u.name || "",
      middlename: u.middlename || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      confirmPassword: "",
      role: idToRoleLabel(u.role_id),
      is_active: !!u.is_active,
    });
    setModalOpen(true);
  };

  // ---- validation (modal)
  const validateModal = () => {
    const email = (formData.email || "").trim();
    const pass = formData.password || "";
    const conf = formData.confirmPassword || "";

    if (!email) return "Email обязателен";

    if (modalMode === "create") {
      if (!pass) return "Пароль обязателен при создании пользователя";
      if (pass.length < 6) return "Пароль должен быть не короче 6 символов";
      if (!conf) return "Подтвердите пароль";
      if (pass !== conf) return "Пароли не совпадают";
    }

    if (modalMode === "edit") {
      if (pass || conf) {
        if (pass.length < 6) return "Пароль должен быть не короче 6 символов";
        if (!conf) return "Подтвердите пароль";
        if (pass !== conf) return "Пароли не совпадают";
      }
    }

    if (modalMode === "reset") {
      if (!pass) return "Введите новый пароль";
      if (pass.length < 6) return "Пароль должен быть не короче 6 символов";
      if (!conf) return "Подтвердите пароль";
      if (pass !== conf) return "Пароли не совпадают";
    }

    return "";
  };

  // ✅ single-flight helper
  const runLocked = async (fn) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      await fn();
    } finally {
      actionLockRef.current = false;
    }
  };

  // ---- submit modal
  const submitUserForm = async () => {
    await runLocked(async () => {
      if (isSaving) return;

      const errText = validateModal();
      if (errText) {
        setModalError(errText);
        return;
      }

      setModalError("");
      setIsSaving(true);

      try {
        if (modalMode === "create") {
          await api.createUser(toApiCreatePayload(formData));
          showToast("Пользователь создан", "success");
        } else if (modalMode === "edit") {
          await api.updateUser(formData.id, toApiUpdatePayload(formData));
          showToast("Пользователь обновлён", "success");
        } else if (modalMode === "reset") {
          await api.updateUser(formData.id, { password: formData.password });
          showToast("Пароль обновлён", "success");
        }

        closeModal();
        await refreshUsers();
      } catch (e) {
        console.error("User save error:", e);
        setModalError(formatApiError(e));
      } finally {
        setIsSaving(false);
      }
    });
  };

  // ---- delete
  const confirmDeleteUser = (u) => {
    setDeleteError("");
    setUserToDelete(u);
    setDeleteConfirmOpen(true);
  };

  const deleteUser = async () => {
    await runLocked(async () => {
      if (!userToDelete?.id) return;
      if (isSaving) return;

      setDeleteError("");
      setIsSaving(true);

      try {
        await api.deleteUser(userToDelete.id);

        // ✅ сразу убираем из UI, чтобы было видно мгновенно
        setUsers((prev) => prev.filter((x) => Number(x.id) !== Number(userToDelete.id)));

        showToast("Пользователь удалён", "success");
        closeDeleteModal();

        // ✅ синхронизация с бэком
        await refreshUsers();
      } catch (e) {
        console.error("Delete error:", e);
        setDeleteError(formatApiError(e));
      } finally {
        setIsSaving(false);
      }
    });
  };

  // ---- status toggle
  const toggleUserStatus = async (userId) => {
    const target = normalizedUsers.find((x) => x.id === userId);
    if (!target) return;

    if (Number(user?.id) === Number(userId) && target.is_active) {
      showToast("Нельзя деактивировать самого себя", "error");
      return;
    }

    // optimistic
    setUsers((prev) =>
      prev.map((x) => (Number(x.id) === Number(userId) ? { ...x, is_active: !target.is_active } : x))
    );

    try {
      await api.updateUser(userId, { is_active: !target.is_active });
      showToast("Статус обновлён", "success");
      await refreshUsers();
    } catch (e) {
      console.error("toggle status error:", e);
      showToast(formatApiError(e) || "Не удалось обновить статус", "error");
      await refreshUsers();
    }
  };

  if (!user) {
    return (
      <div className="admin-account-container" style={{ padding: 24, color: "#b0c4de" }}>
        Загрузка профиля...
      </div>
    );
  }

  const modalTitle =
    modalMode === "create"
      ? "Создание пользователя"
      : modalMode === "reset"
      ? "Сброс пароля"
      : "Редактирование пользователя";

  const isResetMode = modalMode === "reset";

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
        {/* LEFT */}
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

        {/* RIGHT */}
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
                name="fake-username"
                autoComplete="username"
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                />
              <input
                type="text"
                autoComplete="off"
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
                          title="Кликните, чтобы переключить"
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
                          <button className="admin-action-icon admin-action-reset" onClick={() => openResetPasswordModal(u)} title="Сбросить пароль">
                            <i className="fas fa-key"></i>
                          </button>
                          <button className="admin-action-icon admin-action-view" onClick={() => openEditModal(u)} title="Просмотр">
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

      {/* MODAL create/edit/reset */}
      <div className={`admin-modal-overlay ${modalOpen ? "show" : ""}`}>
        <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-header">
            <h3>
              <i className="fas fa-user-edit"></i> {modalTitle}
            </h3>
            <button className="admin-modal-close" onClick={closeModal} disabled={isSaving}>
              &times;
            </button>
          </div>

          <div className="admin-modal-body">
            {modalError && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: "rgba(244,67,54,0.15)", color: "#ffb4b4" }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
                {modalError}
              </div>
            )}

            {!isResetMode && (
              <>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <input className="admin-search-input" placeholder="Фамилия" value={formData.lastname}
                    onChange={(e) => setFormData((p) => ({ ...p, lastname: e.target.value }))} />
                  <input className="admin-search-input" placeholder="Имя" value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                  <input className="admin-search-input" placeholder="Отчество" value={formData.middlename}
                    onChange={(e) => setFormData((p) => ({ ...p, middlename: e.target.value }))} />
                </div>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "2fr 1fr", marginTop: 10 }}>
                  <input className="admin-search-input" placeholder="Email *" value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                  <input className="admin-search-input" placeholder="Телефон" value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
                  <select className="admin-filter-select" value={formData.role}
                    onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}>
                    <option value="Инженер">Инженер</option>
                    <option value="Админ">Администратор</option>
                  </select>

                  <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#b0c4de" }}>
                    <input type="checkbox" checked={!!formData.is_active}
                      onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))} />
                    Активен
                  </label>
                </div>
              </>
            )}

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <input
                className="admin-search-input"
                type="password"
                placeholder={modalMode === "create" ? "Пароль *" : "Новый пароль (необязательно)"}
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              />
              <input
                className="admin-search-input"
                type="password"
                placeholder="Подтвердите пароль"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button className="admin-modal-button admin-modal-secondary" onClick={closeModal} disabled={isSaving}>
              <i className="fas fa-times"></i> Отмена
            </button>
            <button className="admin-modal-button admin-modal-primary" onClick={submitUserForm} disabled={isSaving}>
              <i className={`fas ${isSaving ? "fa-spinner fa-spin" : "fa-save"}`}></i>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      <div className={`admin-modal-overlay ${deleteConfirmOpen ? "show" : ""}`}>
        <div className="admin-modal-content admin-modal-small" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-header">
            <h3>
              <i className="fas fa-exclamation-triangle"></i> Подтверждение удаления
            </h3>
            <button className="admin-modal-close" onClick={closeDeleteModal} disabled={isSaving}>
              &times;
            </button>
          </div>

          <div className="admin-modal-body">
            {deleteError && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: "rgba(244,67,54,0.15)", color: "#ffb4b4" }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
                {deleteError}
              </div>
            )}

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
            <button className="admin-modal-button admin-modal-secondary" onClick={closeDeleteModal} disabled={isSaving}>
              <i className="fas fa-times"></i> Отмена
            </button>
            <button className="admin-modal-button admin-modal-danger" onClick={deleteUser} disabled={isSaving}>
              <i className={`fas ${isSaving ? "fa-spinner fa-spin" : "fa-trash-alt"}`}></i>
              {isSaving ? "Удаление..." : "Удалить пользователя"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccount;
