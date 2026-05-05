
import React, { useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../components/TopNav";
import "../styles/admin_account.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/Api";

const AdminAccount = () => {
  const { user, loadMe, updateMe } = useAuth();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [permissionsList, setPermissionsList] = useState([]);
  const [rolesAccess, setRolesAccess] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [permissionsError, setPermissionsError] = useState("");
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const [notification, setNotification] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit | reset
  const [modalError, setModalError] = useState("");

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const actionLockRef = useRef(false);

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

  const [profileEdit, setProfileEdit] = useState({
    last_name: "",
    first_name: "",
    patronymic: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const roleToId = (roleLabel) =>
    roleLabel === "Админ" || roleLabel === "Администратор" ? 1 : 2;

  const idToRoleLabel = (roleId) =>
    Number(roleId) === 1 ? "Админ" : "Инженер";

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

  const showToast = (message, type = "success") => {
    setNotification({ message, type, show: true });

    setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));
      setTimeout(() => setNotification(null), 250);
    }, 2500);
  };

  const runLocked = async (fn) => {
    if (actionLockRef.current) return;

    actionLockRef.current = true;

    try {
      await fn();
    } finally {
      actionLockRef.current = false;
    }
  };

  const refreshUsers = async () => {
    setLoadingUsers(true);

    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("getUsers error:", e);
      showToast(formatApiError(e) || "Не удалось загрузить пользователей", "error");
    } finally {
      setLoadingUsers(false);
    }
  };
  const loadRolePermissions = async () => {
    setLoadingPermissions(true);
    setPermissionsError("");
  
    try {
      const data = await api.getRolePermissions();
  
      setPermissionsList(data?.permissions || []);
      setRolesAccess(data?.roles || []);
    } catch (e) {
      console.error("getRolePermissions error:", e);
      setPermissionsError(formatApiError(e) || "Не удалось загрузить права доступа");
    } finally {
      setLoadingPermissions(false);
    }
  };
  
  const getRoleTitle = (role) => {
    if (Number(role.role_id) === 1) return "Администратор";
    if (Number(role.role_id) === 2) return "Инженер";
    return role.role_name || `Роль #${role.role_id}`;
  };
  
  const isPermissionChecked = (roleId, permissionCode) => {
    const role = rolesAccess.find((r) => Number(r.role_id) === Number(roleId));
    return role?.permissions?.includes(permissionCode) || false;
  };
  
  const togglePermission = (roleId, permissionCode) => {
    setRolesAccess((prev) =>
      prev.map((role) => {
        if (Number(role.role_id) !== Number(roleId)) return role;
  
        const current = role.permissions || [];
        const exists = current.includes(permissionCode);
  
        return {
          ...role,
          permissions: exists
            ? current.filter((code) => code !== permissionCode)
            : [...current, permissionCode],
        };
      })
    );
  };
  
  const saveRolePermissions = async (roleId) => {
    const role = rolesAccess.find((r) => Number(r.role_id) === Number(roleId));
  
    if (!role) return;
  
    setSavingRoleId(roleId);
    setPermissionsError("");
  
    try {
      await api.updateRolePermissions(roleId, role.permissions || []);
      showToast(`Права роли "${getRoleTitle(role)}" обновлены`, "success");
      await loadRolePermissions();
    } catch (e) {
      console.error("updateRolePermissions error:", e);
      setPermissionsError(formatApiError(e) || "Не удалось сохранить права роли");
    } finally {
      setSavingRoleId(null);
    }
  };

  const loadActivity = async () => {
    setActivityLoading(true);

    try {
      const data = await api.getMyActivity();
      setActivity(data);
    } catch (e) {
      console.error("getMyActivity error:", e);
      showToast(formatApiError(e) || "Не удалось загрузить активность", "error");
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    document.body.classList.add("admin-account-page");
    return () => document.body.classList.remove("admin-account-page");
  }, []);

  useEffect(() => {
    if (!user) {
      loadMe();
    }
  }, [user, loadMe]);

  useEffect(() => {
    refreshUsers();
    loadActivity();
    loadRolePermissions();
  }, []);

  useEffect(() => {
    if (!user) return;

    setProfileEdit({
      last_name: user.last_name || "",
      first_name: user.first_name || "",
      patronymic: user.patronymic || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      confirmPassword: "",
    });

    setProfileError("");
  }, [user, profileModalOpen]);

  const profile = useMemo(() => {
    const last = user?.last_name || "";
    const first = user?.first_name || "";
    const pat = user?.patronymic || "";

    const fullName =
      `${last} ${first} ${pat}`.trim() || user?.email || "Администратор";

    const shortName =
      last && first
        ? `${last} ${first[0]}.${pat ? `${pat[0]}.` : ""}`
        : fullName;

    return {
      name: fullName,
      shortName,
      role: Number(user?.role_id) === 1 ? "Администратор" : "Инженер",
      employeeId: `#${user?.id ?? "—"}`,
      email: user?.email || "—",
      phone: user?.phone || "—",
      is_active: user?.is_active ?? true,
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
    }));
  }, [users]);

  const systemStats = useMemo(() => {
    const totalUsers = normalizedUsers.length;
    const activeUsers = normalizedUsers.filter((u) => u.is_active).length;
    const inactiveUsers = totalUsers - activeUsers;
    const engineers = normalizedUsers.filter((u) => u.role_id === 2).length;
    const admins = normalizedUsers.filter((u) => u.role_id === 1).length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      engineers,
      admins,
    };
  }, [normalizedUsers]);

  const filteredUsers = useMemo(() => {
    return normalizedUsers.filter((u) => {
      const s = (searchTerm || "").toLowerCase().trim();

      const fullName = `${u.lastname} ${u.name} ${u.middlename}`.toLowerCase();

      const matchesSearch =
        !s ||
        fullName.includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.phone || "").includes(searchTerm);

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.is_active) ||
        (statusFilter === "inactive" && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [normalizedUsers, searchTerm, roleFilter, statusFilter]);

  const activitySummary = activity?.summary || {};

  const inspectionsTotal = Number(activitySummary.inspections_total || 0);
  const inspectionsToday = Number(activitySummary.inspections_today || 0);
  const reviewedTotal = Number(activitySummary.reviewed_total || 0);
  const reviewedToday = Number(activitySummary.reviewed_today || 0);
  const confirmedTotal = Number(activitySummary.confirmed_total || 0);
  const rejectedTotal = Number(activitySummary.rejected_total || 0);
  const falseAlarmRate = Number(activitySummary.false_alarm_rate || 0);
  const lastActivityAt = activitySummary.last_activity_at || null;

  const formatDateTime = (value) => {
    if (!value) return "—";
    return value.replace("T", " ");
  };

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      showToast("Email скопирован", "info");
    } catch {
      showToast("Не удалось скопировать email", "error");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
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

    if (fd.password && fd.password.length >= 6) {
      payload.password = fd.password;
    }

    return payload;
  };

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
    setUserModalOpen(true);
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
    setUserModalOpen(true);
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
    setUserModalOpen(true);
  };

  const closeUserModal = () => {
    if (isSaving) return;

    setUserModalOpen(false);
    setModalMode("create");
    setModalError("");
    setFormData((p) => ({
      ...p,
      password: "",
      confirmPassword: "",
    }));
  };

  const validateUserModal = () => {
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

  const submitUserForm = async () => {
    await runLocked(async () => {
      if (isSaving) return;

      const errText = validateUserModal();

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
          await api.updateUser(formData.id, {
            password: formData.password,
          });
          showToast("Пароль обновлён", "success");
        }

        closeUserModal();
        await refreshUsers();
      } catch (e) {
        console.error("User save error:", e);
        setModalError(formatApiError(e));
      } finally {
        setIsSaving(false);
      }
    });
  };

  const toggleUserStatus = async (userId) => {
    const target = normalizedUsers.find((x) => Number(x.id) === Number(userId));

    if (!target) return;

    if (Number(user?.id) === Number(userId) && target.is_active) {
      showToast("Нельзя деактивировать самого себя", "error");
      return;
    }

    setUsers((prev) =>
      prev.map((x) =>
        Number(x.id) === Number(userId)
          ? { ...x, is_active: !target.is_active }
          : x
      )
    );

    try {
      await api.updateUser(userId, {
        is_active: !target.is_active,
      });

      showToast("Статус пользователя обновлён", "success");
      await refreshUsers();
    } catch (e) {
      console.error("toggle status error:", e);
      showToast(formatApiError(e) || "Не удалось обновить статус", "error");
      await refreshUsers();
    }
  };

  const confirmDeleteUser = (u) => {
    setDeleteError("");
    setUserToDelete(u);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteModal = () => {
    if (isSaving) return;

    setDeleteConfirmOpen(false);
    setUserToDelete(null);
    setDeleteError("");
  };

  const deleteUser = async () => {
    await runLocked(async () => {
      if (!userToDelete?.id) return;
      if (isSaving) return;

      setDeleteError("");
      setIsSaving(true);

      try {
        await api.deleteUser(userToDelete.id);

        setUsers((prev) =>
          prev.filter((x) => Number(x.id) !== Number(userToDelete.id))
        );

        showToast("Пользователь удалён", "success");
        closeDeleteModal();
        await refreshUsers();
      } catch (e) {
        console.error("Delete error:", e);
        setDeleteError(formatApiError(e));
      } finally {
        setIsSaving(false);
      }
    });
  };

  const validateProfile = () => {
    const email = (profileEdit.email || "").trim();
    const pass = profileEdit.password || "";
    const conf = profileEdit.confirmPassword || "";

    if (!email) return "Email обязателен";

    if (pass || conf) {
      if (pass.length < 6) return "Пароль должен быть не короче 6 символов";
      if (!conf) return "Подтвердите пароль";
      if (pass !== conf) return "Пароли не совпадают";
    }

    return "";
  };

  const saveProfile = async () => {
    await runLocked(async () => {
      if (isSaving) return;

      const errText = validateProfile();

      if (errText) {
        setProfileError(errText);
        return;
      }

      setProfileError("");
      setIsSaving(true);

      const payload = {
        email: (profileEdit.email || "").trim(),
        phone: profileEdit.phone || null,
        last_name: profileEdit.last_name || null,
        first_name: profileEdit.first_name || null,
        patronymic: profileEdit.patronymic || null,
      };

      if (profileEdit.password) {
        payload.password = profileEdit.password;
      }

      try {
        const res = await updateMe(payload);

        if (!res?.ok) {
          setProfileError(res?.error || "Не удалось обновить профиль");
          return;
        }

        showToast("Профиль обновлён", "success");
        setProfileModalOpen(false);
        await refreshUsers();
      } catch (e) {
        console.error("Profile update error:", e);
        setProfileError(formatApiError(e));
      } finally {
        setIsSaving(false);
      }
    });
  };

  const closeProfileModal = () => {
    if (isSaving) return;

    setProfileModalOpen(false);
    setProfileError("");
  };

  if (!user) {
    return (
      <div
        className="admin-account-container"
        style={{ padding: 24, color: "#b0c4de" }}
      >
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
        <div
          className={`admin-notification ${notification.type} ${
            notification.show ? "show" : ""
          }`}
        >
          <i
            className={`fas ${
              notification.type === "success"
                ? "fa-check-circle"
                : notification.type === "error"
                ? "fa-exclamation-circle"
                : "fa-info-circle"
            }`}
          ></i>
          <div className="admin-notification-message">
            {notification.message}
          </div>
        </div>
      )}
  
      <TopNav
        subtitle="Система распознавания трещин в слитках • Аккаунт администратора"
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
                <div className="admin-status-indicator admin-status-online"></div>
              </div>
  
              <div className="admin-profile-name">{profile.shortName}</div>
              <div className="admin-profile-role">{profile.role}</div>
              <div className="admin-profile-status">
                {profile.is_active ? "Аккаунт активен" : "Аккаунт неактивен"}
              </div>
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
  
              <div className="admin-detail-row">
                <div className="admin-detail-label">
                  <i className="fas fa-clock"></i>
                  <span>Последняя активность:</span>
                </div>
                <div className="admin-detail-value">
                  {formatDateTime(lastActivityAt)}
                </div>
              </div>
  
              <div style={{ marginTop: 14 }}>
                <button
                  className="admin-modal-button admin-modal-primary"
                  style={{ width: "100%" }}
                  onClick={() => setProfileModalOpen(true)}
                >
                  <i className="fas fa-user-edit"></i>
                  Обновить профиль
                </button>
              </div>
  
              <div style={{ marginTop: 10 }}>
                <button
                  className="admin-modal-button admin-modal-secondary"
                  style={{ width: "100%" }}
                  onClick={loadActivity}
                  disabled={activityLoading}
                >
                  <i
                    className={`fas ${
                      activityLoading ? "fa-spinner fa-spin" : "fa-sync-alt"
                    }`}
                  ></i>
                  {activityLoading ? "Обновление..." : "Обновить активность"}
                </button>
              </div>
            </div>
          </div>
  
          <div className="admin-system-stats">
            <div className="admin-stats-header">
              <h2>
                <i className="fas fa-chart-pie"></i> Пользователи
              </h2>
            </div>
  
            <div className="admin-stats-grid">
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #4dabf7, #2a6bc0)",
                  }}
                >
                  <i className="fas fa-users"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">
                    {systemStats.totalUsers}
                  </div>
                  <div className="admin-stat-label">Всего пользователей</div>
                </div>
              </div>
  
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                  }}
                >
                  <i className="fas fa-user-check"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">
                    {systemStats.activeUsers}
                  </div>
                  <div className="admin-stat-label">Активных</div>
                </div>
              </div>
  
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #9C27B0, #6A1B9A)",
                  }}
                >
                  <i className="fas fa-user-cog"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">
                    {systemStats.engineers}
                  </div>
                  <div className="admin-stat-label">Инженеров</div>
                </div>
              </div>
  
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #FF9800, #EF6C00)",
                  }}
                >
                  <i className="fas fa-user-shield"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{systemStats.admins}</div>
                  <div className="admin-stat-label">Администраторов</div>
                </div>
              </div>
            </div>
          </div>
  
          <div className="admin-system-stats">
            <div className="admin-stats-header">
              <h2>
                <i className="fas fa-clipboard-check"></i> Моя активность
              </h2>
            </div>
  
            <div className="admin-stats-grid">
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #4dabf7, #2a6bc0)",
                  }}
                >
                  <i className="fas fa-industry"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{inspectionsTotal}</div>
                  <div className="admin-stat-label">Слитков в моих сменах</div>
                </div>
              </div>
  
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                  }}
                >
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{confirmedTotal}</div>
                  <div className="admin-stat-label">Подтверждено</div>
                </div>
              </div>
  
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #FF9800, #EF6C00)",
                  }}
                >
                  <i className="fas fa-times-circle"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{rejectedTotal}</div>
                  <div className="admin-stat-label">Отклонено</div>
                </div>
              </div>
  
              <div className="admin-stat-item">
                <div
                  className="admin-stat-icon"
                  style={{
                    background: "linear-gradient(135deg, #00BCD4, #00838F)",
                  }}
                >
                  <i className="fas fa-calendar-day"></i>
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{reviewedToday}</div>
                  <div className="admin-stat-label">Рассмотрено сегодня</div>
                </div>
              </div>
            </div>
  
            <div style={{ color: "#8fb4d9", fontSize: "0.9rem", marginTop: 12 }}>
              Доля отклонённых срабатываний среди рассмотренных:{" "}
              {falseAlarmRate.toFixed(1)}%
            </div>
          </div>
        </div>
  
        <div className="admin-management-panel">
          <div className="admin-management-header">
            <div className="admin-header-title">
              <h1>
                <i className="fas fa-users-cog"></i> Управление пользователями
              </h1>
              <p className="admin-header-subtitle">
                Создание, редактирование, деактивация и удаление пользователей
                системы
              </p>
            </div>
  
            <div className="admin-header-actions">
              <button
                className="admin-action-button admin-action-primary"
                onClick={openCreateModal}
              >
                <i className="fas fa-user-plus"></i>
                Добавить пользователя
              </button>
  
              <button
                className="admin-action-button admin-action-secondary"
                onClick={resetFilters}
              >
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
                autoComplete="off"
                placeholder="Поиск по ФИО, email или телефону..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-search-input"
              />
  
              {searchTerm && (
                <button
                  className="admin-search-clear"
                  onClick={() => setSearchTerm("")}
                >
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
  
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="admin-filter-select"
                >
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
  
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-filter-select"
                >
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
                    <div
                      key={u.id}
                      className={`admin-table-row ${
                        !u.is_active ? "admin-row-inactive" : ""
                      }`}
                    >
                      <div className="admin-table-cell admin-cell-small">
                        <span className="admin-user-id">#{u.id}</span>
                      </div>
  
                      <div className="admin-table-cell">
                        <div className="admin-user-name">
                          <div className="admin-user-fullname">
                            {`${u.lastname} ${u.name} ${u.middlename}`.trim() ||
                              "Без имени"}
                          </div>
  
                          <div className="admin-user-initials">
                            {u.lastname} {u.name?.charAt(0) || ""}
                            {u.name ? "." : ""}
                            {u.middlename?.charAt(0) || ""}
                            {u.middlename ? "." : ""}
                          </div>
                        </div>
                      </div>
  
                      <div className="admin-table-cell">
                        <div className="admin-user-contact">
                          <div
                            className="admin-user-email"
                            onClick={() => copyEmail(u.email)}
                            title="Кликните для копирования"
                          >
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
                        <div
                          className={`admin-user-role admin-role-${
                            u.role_id === 1 ? "admin" : "engineer"
                          }`}
                        >
                          <i
                            className={
                              u.role_id === 1
                                ? "fas fa-user-shield"
                                : "fas fa-user-cog"
                            }
                          ></i>
                          {u.role}
                        </div>
                      </div>
  
                      <div className="admin-table-cell admin-cell-medium">
                        <div
                          className={`admin-user-status ${
                            u.is_active
                              ? "admin-status-active"
                              : "admin-status-inactive"
                          }`}
                          onClick={() => toggleUserStatus(u.id)}
                          title="Кликните, чтобы переключить"
                        >
                          <div className="admin-status-indicator-small"></div>
                          {u.is_active ? "Активен" : "Неактивен"}
                        </div>
                      </div>
  
                      <div className="admin-table-cell admin-cell-large">
                        <div className="admin-user-actions">
                          <button
                            className="admin-action-icon admin-action-edit"
                            onClick={() => openEditModal(u)}
                            title="Редактировать"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
  
                          <button
                            className="admin-action-icon admin-action-reset"
                            onClick={() => openResetPasswordModal(u)}
                            title="Сбросить пароль"
                          >
                            <i className="fas fa-key"></i>
                          </button>
  
                          <button
                            className="admin-action-icon admin-action-delete"
                            onClick={() => confirmDeleteUser(u)}
                            title="Удалить"
                          >
                            <i className="fas fa-trash-alt"></i>
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
  
          <div className="admin-filters-panel" style={{ marginTop: 20 }}>
            <div className="admin-management-header" style={{ marginBottom: 12 }}>
              <div className="admin-header-title">
                <h1 style={{ fontSize: "1.3rem" }}>
                  <i className="fas fa-lock"></i> Настройки ролей и прав доступа
                </h1>
                <p className="admin-header-subtitle">
                  Права доступа хранятся в базе данных и применяются к ролям
                  пользователей
                </p>
              </div>
  
              <div className="admin-header-actions">
                <button
                  className="admin-action-button admin-action-secondary"
                  onClick={loadRolePermissions}
                  disabled={loadingPermissions}
                >
                  <i
                    className={`fas ${
                      loadingPermissions ? "fa-spinner fa-spin" : "fa-sync-alt"
                    }`}
                  ></i>
                  Обновить права
                </button>
              </div>
            </div>
  
            {permissionsError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(244,67,54,0.15)",
                  color: "#ffb4b4",
                }}
              >
                <i
                  className="fas fa-exclamation-circle"
                  style={{ marginRight: 8 }}
                ></i>
                {permissionsError}
              </div>
            )}
  
            {loadingPermissions ? (
              <div className="admin-table-empty">
                <div className="admin-empty-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <h3>Загрузка прав доступа...</h3>
                </div>
              </div>
            ) : (
              <div className="admin-users-table">
                <div
                  className="admin-table-header"
                  style={{
                    gridTemplateColumns: `2fr repeat(${rolesAccess.length}, 1fr)`,
                  }}
                >
                  <div className="admin-table-cell">Право доступа</div>
  
                  {rolesAccess.map((role) => (
                    <div
                      key={role.role_id}
                      className="admin-table-cell admin-cell-medium"
                      style={{ textAlign: "center" }}
                    >
                      {getRoleTitle(role)}
                    </div>
                  ))}
                </div>
  
                <div className="admin-table-body">
                  {permissionsList.length === 0 ? (
                    <div className="admin-table-empty">
                      <div className="admin-empty-state">
                        <i className="fas fa-lock"></i>
                        <h3>Права доступа не найдены</h3>
                        <p>Проверь таблицу permissions в базе данных</p>
                      </div>
                    </div>
                  ) : (
                    permissionsList.map((permission) => (
                      <div
                        key={permission.code}
                        className="admin-table-row"
                        style={{
                          gridTemplateColumns: `2fr repeat(${rolesAccess.length}, 1fr)`,
                        }}
                      >
                        <div className="admin-table-cell">
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            <strong style={{ color: "#e0e0e0" }}>
                              {permission.name}
                            </strong>
  
                            <span
                              style={{
                                color: "#8fb4d9",
                                fontSize: "0.85rem",
                              }}
                            >
                              {permission.description || permission.code}
                            </span>
  
                            <span
                              style={{
                                color: "#607d9a",
                                fontSize: "0.8rem",
                              }}
                            >
                              {permission.code}
                            </span>
                          </div>
                        </div>
  
                        {rolesAccess.map((role) => {
                          const checked = isPermissionChecked(
                            role.role_id,
                            permission.code
                          );
  
                          const disabled =
                            Number(role.role_id) === 1 &&
                            ["users.manage", "roles.manage"].includes(
                              permission.code
                            );
  
                          return (
                            <div
                              key={`${role.role_id}-${permission.code}`}
                              className="admin-table-cell admin-cell-medium"
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  color: disabled ? "#607d9a" : "#b0c4de",
                                  cursor: disabled ? "not-allowed" : "pointer",
                                }}
                                title={
                                  disabled
                                    ? "Это право нельзя отключить у администратора"
                                    : "Изменить право доступа"
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() =>
                                    togglePermission(role.role_id, permission.code)
                                  }
                                  style={{
                                    width: 18,
                                    height: 18,
                                    cursor: disabled ? "not-allowed" : "pointer",
                                  }}
                                />
  
                                {checked ? "Да" : "Нет"}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
  
                {rolesAccess.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      padding: "16px",
                      borderTop: "1px solid rgba(60, 120, 180, 0.2)",
                    }}
                  >
                    {rolesAccess.map((role) => (
                      <button
                        key={role.role_id}
                        className="admin-action-button admin-action-primary"
                        onClick={() => saveRolePermissions(role.role_id)}
                        disabled={savingRoleId === role.role_id}
                      >
                        <i
                          className={`fas ${
                            savingRoleId === role.role_id
                              ? "fa-spinner fa-spin"
                              : "fa-save"
                          }`}
                        ></i>
                        {savingRoleId === role.role_id
                          ? "Сохранение..."
                          : `Сохранить: ${getRoleTitle(role)}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  
      <div className={`admin-modal-overlay ${userModalOpen ? "show" : ""}`}>
        <div
          className="admin-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="admin-modal-header">
            <h3>
              <i className="fas fa-user-edit"></i> {modalTitle}
            </h3>
  
            <button
              className="admin-modal-close"
              onClick={closeUserModal}
              disabled={isSaving}
            >
              &times;
            </button>
          </div>
  
          <div className="admin-modal-body">
            {modalError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(244,67,54,0.15)",
                  color: "#ffb4b4",
                }}
              >
                <i
                  className="fas fa-exclamation-circle"
                  style={{ marginRight: 8 }}
                ></i>
                {modalError}
              </div>
            )}
  
            {!isResetMode && (
              <>
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "1fr 1fr 1fr",
                  }}
                >
                  <input
                    className="admin-search-input"
                    placeholder="Фамилия"
                    value={formData.lastname}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        lastname: e.target.value,
                      }))
                    }
                  />
  
                  <input
                    className="admin-search-input"
                    placeholder="Имя"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                  />
  
                  <input
                    className="admin-search-input"
                    placeholder="Отчество"
                    value={formData.middlename}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        middlename: e.target.value,
                      }))
                    }
                  />
                </div>
  
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "2fr 1fr",
                    marginTop: 10,
                  }}
                >
                  <input
                    className="admin-search-input"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        email: e.target.value,
                      }))
                    }
                  />
  
                  <input
                    className="admin-search-input"
                    placeholder="Телефон"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
  
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <select
                    className="admin-filter-select"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        role: e.target.value,
                      }))
                    }
                  >
                    <option value="Инженер">Инженер</option>
                    <option value="Админ">Администратор</option>
                  </select>
  
                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      color: "#b0c4de",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!formData.is_active}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    Активен
                  </label>
                </div>
              </>
            )}
  
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 1fr",
                marginTop: 12,
              }}
            >
              <input
                className="admin-search-input"
                type="password"
                placeholder={
                  modalMode === "create"
                    ? "Пароль *"
                    : modalMode === "reset"
                    ? "Новый пароль *"
                    : "Новый пароль (необязательно)"
                }
                value={formData.password}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    password: e.target.value,
                  }))
                }
              />
  
              <input
                className="admin-search-input"
                type="password"
                placeholder="Подтвердите пароль"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
          </div>
  
          <div className="admin-modal-footer">
            <button
              className="admin-modal-button admin-modal-secondary"
              onClick={closeUserModal}
              disabled={isSaving}
            >
              <i className="fas fa-times"></i> Отмена
            </button>
  
            <button
              className="admin-modal-button admin-modal-primary"
              onClick={submitUserForm}
              disabled={isSaving}
            >
              <i
                className={`fas ${
                  isSaving ? "fa-spinner fa-spin" : "fa-save"
                }`}
              ></i>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
  
      <div className={`admin-modal-overlay ${profileModalOpen ? "show" : ""}`}>
        <div
          className="admin-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="admin-modal-header">
            <h3>
              <i className="fas fa-user-edit"></i> Обновление профиля
            </h3>
  
            <button
              className="admin-modal-close"
              onClick={closeProfileModal}
              disabled={isSaving}
            >
              &times;
            </button>
          </div>
  
          <div className="admin-modal-body">
            {profileError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(244,67,54,0.15)",
                  color: "#ffb4b4",
                }}
              >
                <i
                  className="fas fa-exclamation-circle"
                  style={{ marginRight: 8 }}
                ></i>
                {profileError}
              </div>
            )}
  
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 1fr 1fr",
              }}
            >
              <input
                className="admin-search-input"
                placeholder="Фамилия"
                value={profileEdit.last_name}
                onChange={(e) =>
                  setProfileEdit((p) => ({
                    ...p,
                    last_name: e.target.value,
                  }))
                }
              />
  
              <input
                className="admin-search-input"
                placeholder="Имя"
                value={profileEdit.first_name}
                onChange={(e) =>
                  setProfileEdit((p) => ({
                    ...p,
                    first_name: e.target.value,
                  }))
                }
              />
  
              <input
                className="admin-search-input"
                placeholder="Отчество"
                value={profileEdit.patronymic}
                onChange={(e) =>
                  setProfileEdit((p) => ({
                    ...p,
                    patronymic: e.target.value,
                  }))
                }
              />
            </div>
  
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "2fr 1fr",
                marginTop: 10,
              }}
            >
              <input
                className="admin-search-input"
                placeholder="Email *"
                value={profileEdit.email}
                onChange={(e) =>
                  setProfileEdit((p) => ({
                    ...p,
                    email: e.target.value,
                  }))
                }
              />
  
              <input
                className="admin-search-input"
                placeholder="Телефон"
                value={profileEdit.phone}
                onChange={(e) =>
                  setProfileEdit((p) => ({
                    ...p,
                    phone: e.target.value,
                  }))
                }
              />
            </div>
  
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 1fr",
                marginTop: 12,
              }}
            >
              <input
                className="admin-search-input"
                type="password"
                placeholder="Новый пароль (необязательно)"
                value={profileEdit.password}
                onChange={(e) =>
                  setProfileEdit((p) => ({
                    ...p,
                    password: e.target.value,
                  }))
                }
              />
  
              <input
                className="admin-search-input"
                type="password"
                placeholder="Подтвердите пароль"
                value={profileEdit.confirmPassword}
                onChange={(e) =>
                  setProfileEdit((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
          </div>
  
          <div className="admin-modal-footer">
            <button
              className="admin-modal-button admin-modal-secondary"
              onClick={closeProfileModal}
              disabled={isSaving}
            >
              <i className="fas fa-times"></i> Отмена
            </button>
  
            <button
              className="admin-modal-button admin-modal-primary"
              onClick={saveProfile}
              disabled={isSaving}
            >
              <i
                className={`fas ${
                  isSaving ? "fa-spinner fa-spin" : "fa-save"
                }`}
              ></i>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
  
      <div className={`admin-modal-overlay ${deleteConfirmOpen ? "show" : ""}`}>
        <div
          className="admin-modal-content admin-modal-small"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="admin-modal-header">
            <h3>
              <i className="fas fa-exclamation-triangle"></i> Подтверждение
              удаления
            </h3>
  
            <button
              className="admin-modal-close"
              onClick={closeDeleteModal}
              disabled={isSaving}
            >
              &times;
            </button>
          </div>
  
          <div className="admin-modal-body">
            {deleteError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(244,67,54,0.15)",
                  color: "#ffb4b4",
                }}
              >
                <i
                  className="fas fa-exclamation-circle"
                  style={{ marginRight: 8 }}
                ></i>
                {deleteError}
              </div>
            )}
  
            <div style={{ textAlign: "center", padding: "20px" }}>
              <i
                className="fas fa-trash-alt"
                style={{
                  fontSize: "3rem",
                  color: "#f44336",
                  marginBottom: "20px",
                }}
              ></i>
  
              <h3 style={{ color: "#e0e0e0", marginBottom: "15px" }}>
                Вы уверены?
              </h3>
  
              <p
                style={{
                  color: "#b0c4de",
                  marginBottom: "25px",
                  lineHeight: 1.5,
                }}
              >
                Вы собираетесь удалить пользователя:
                <br />
                <strong style={{ color: "#e0e0e0" }}>
                  {`${userToDelete?.lastname || ""} ${
                    userToDelete?.name || ""
                  } ${userToDelete?.middlename || ""}`.trim() || "Без имени"}
                </strong>
                <br />
                <span style={{ color: "#8fb4d9" }}>{userToDelete?.email}</span>
              </p>
  
              <div style={{ color: "#ffb4b4", fontSize: "0.9rem" }}>
                Если пользователь связан с журналом действий, удаление может быть
                запрещено базой данных. В таком случае лучше деактивировать
                аккаунт.
              </div>
            </div>
          </div>
  
          <div className="admin-modal-footer">
            <button
              className="admin-modal-button admin-modal-secondary"
              onClick={closeDeleteModal}
              disabled={isSaving}
            >
              <i className="fas fa-times"></i> Отмена
            </button>
  
            <button
              className="admin-modal-button admin-modal-danger"
              onClick={deleteUser}
              disabled={isSaving}
            >
              <i
                className={`fas ${
                  isSaving ? "fa-spinner fa-spin" : "fa-trash-alt"
                }`}
              ></i>
              {isSaving ? "Удаление..." : "Удалить пользователя"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  };
  
  export default AdminAccount;