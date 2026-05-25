import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../components/TopNav";
import "../styles/admin_account.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/Api";

const roleToId = (roleLabel) =>
  roleLabel === "Админ" || roleLabel === "Администратор" ? 1 : 2;

const idToRoleLabel = (roleId) => (Number(roleId) === 1 ? "Админ" : "Инженер");

const formatDateTime = (value) => {
  if (!value) return "—";
  return String(value).replace("T", " ");
};

const formatApiError = (e) => {
  const detail = e?.data?.detail;

  if (Array.isArray(detail)) {
    const msgs = detail.map((x) => x?.msg).filter(Boolean);
    if (msgs.length) return msgs.join(", ");
  }

  if (typeof detail === "string" && detail.trim()) return detail;

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.detail === "string") return detail.detail;
    return JSON.stringify(detail);
  }

  if (typeof e?.message === "string" && e.message.trim()) return e.message;

  return "Ошибка запроса";
};

const AdminAccount = () => {
  const { user, loadMe, updateMe, loadPermissions } = useAuth();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [permissionsList, setPermissionsList] = useState([]);
  const [rolesAccess, setRolesAccess] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [permissionsError, setPermissionsError] = useState("");

  const [activity, setActivity] = useState(null);

  const [permissionsPage, setPermissionsPage] = useState(1);
  const [permissionsPerPage, setPermissionsPerPage] = useState(5);

  const [notification, setNotification] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchUnlocked, setSearchUnlocked] = useState(false);

  const [userPage, setUserPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalError, setModalError] = useState("");

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteCheck, setDeleteCheck] = useState(null);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const actionLockRef = useRef(false);
  const searchInputRef = useRef(null);
  const searchWasEditedRef = useRef(false);
  const searchInputNameRef = useRef(
    `metal-inspect-users-filter-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`
  );
  
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

  const showToast = useCallback((message, type = "success") => {
    setNotification({ message, type, show: true });

    setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));
      setTimeout(() => setNotification(null), 250);
    }, 2500);
  }, []);

  const runLocked = async (fn) => {
    if (actionLockRef.current) return;

    actionLockRef.current = true;

    try {
      await fn();
    } finally {
      actionLockRef.current = false;
    }
  };

  const refreshUsers = useCallback(async () => {
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
  }, [showToast]);

  const loadRolePermissions = useCallback(async () => {
    setLoadingPermissions(true);
    setPermissionsError("");

    try {
      const data = await api.getRolePermissions();

      setPermissionsList(Array.isArray(data?.permissions) ? data.permissions : []);
      setRolesAccess(Array.isArray(data?.roles) ? data.roles : []);
      setPermissionsPage(1);
    } catch (e) {
      console.error("getRolePermissions error:", e);
      setPermissionsError(formatApiError(e) || "Не удалось загрузить права доступа");
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const data = await api.getMyActivity();
      setActivity(data);
    } catch (e) {
      console.error("getMyActivity error:", e);
      showToast(formatApiError(e) || "Не удалось загрузить активность", "error");
    }
  }, [showToast]);

  useEffect(() => {
    document.body.classList.add("admin-account-page");

    return () => {
      document.body.classList.remove("admin-account-page");
    };
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
  }, [refreshUsers, loadActivity, loadRolePermissions]);

  useEffect(() => {
    const clearAutofilledSearch = () => {
      if (searchWasEditedRef.current) return;
      if (document.activeElement === searchInputRef.current) return;

      setSearchTerm("");

      if (searchInputRef.current) {
        searchInputRef.current.value = "";
      }
    };

    clearAutofilledSearch();

    const timeouts = [100, 300, 700, 1200].map((delay) =>
      setTimeout(clearAutofilledSearch, delay)
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
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

    const initials =
      `${last?.[0] || ""}${first?.[0] || ""}`.trim().toUpperCase() ||
      String(user?.email || "А").charAt(0).toUpperCase();

    return {
      name: fullName,
      shortName,
      initials,
      role:
        user?.role_name ||
        user?.role?.name ||
        (Number(user?.role_id) === 1 ? "Администратор" : "Инженер"),
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

  useEffect(() => {
    setUserPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const totalUserPages = Math.max(
    Math.ceil(filteredUsers.length / usersPerPage),
    1
  );

  const safeUserPage = Math.min(userPage, totalUserPages);
  const userStartIndex = (safeUserPage - 1) * usersPerPage;
  const userEndIndex = userStartIndex + usersPerPage;

  const paginatedUsers = filteredUsers.slice(userStartIndex, userEndIndex);

  const shownUsersStart = filteredUsers.length > 0 ? userStartIndex + 1 : 0;
  const shownUsersEnd = Math.min(userEndIndex, filteredUsers.length);

  const userPageNumbers = Array.from(
    { length: totalUserPages },
    (_, index) => index + 1
  ).filter((page) => {
    return (
      page === 1 ||
      page === totalUserPages ||
      Math.abs(page - safeUserPage) <= 2
    );
  });

  const totalPermissionPages = Math.max(
    Math.ceil(permissionsList.length / permissionsPerPage),
    1
  );

  const safePermissionPage = Math.min(permissionsPage, totalPermissionPages);
  const permissionStartIndex = (safePermissionPage - 1) * permissionsPerPage;
  const permissionEndIndex = permissionStartIndex + permissionsPerPage;

  const paginatedPermissions = permissionsList.slice(
    permissionStartIndex,
    permissionEndIndex
  );

  const shownPermissionsStart =
    permissionsList.length > 0 ? permissionStartIndex + 1 : 0;

  const shownPermissionsEnd = Math.min(
    permissionEndIndex,
    permissionsList.length
  );

  const permissionPageNumbers = Array.from(
    { length: totalPermissionPages },
    (_, index) => index + 1
  ).filter((page) => {
    return (
      page === 1 ||
      page === totalPermissionPages ||
      Math.abs(page - safePermissionPage) <= 2
    );
  });

  const activitySummary = activity?.summary || {};

  const inspectionsTotal = Number(activitySummary.inspections_total || 0);
  const reviewedToday = Number(activitySummary.reviewed_today || 0);
  const confirmedTotal = Number(activitySummary.confirmed_total || 0);
  const rejectedTotal = Number(activitySummary.rejected_total || 0);
  const lastActivityAt = activitySummary.last_activity_at || null;

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

  const saveAllRolePermissions = async () => {
    if (!rolesAccess.length) return;

    setSavingRoleId("all");
    setPermissionsError("");

    try {
      for (const role of rolesAccess) {
        await api.updateRolePermissions(role.role_id, role.permissions || []);
      }

      showToast("Права доступа обновлены", "success");
      await loadRolePermissions();
      await loadPermissions();
    } catch (e) {
      console.error("update all role permissions error:", e);
      setPermissionsError(formatApiError(e) || "Не удалось сохранить права доступа");
    } finally {
      setSavingRoleId(null);
    }
  };

  const goToUserPage = (page) => {
    const normalizedPage = Math.min(Math.max(page, 1), totalUserPages);
    setUserPage(normalizedPage);
  };

  const changeUsersPerPage = (value) => {
    setUsersPerPage(Number(value));
    setUserPage(1);
  };

  const goToPermissionPage = (page) => {
    const normalizedPage = Math.min(Math.max(page, 1), totalPermissionPages);
    setPermissionsPage(normalizedPage);
  };

  const changePermissionsPerPage = (value) => {
    setPermissionsPerPage(Number(value));
    setPermissionsPage(1);
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
    searchWasEditedRef.current = true;

    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");

    if (searchInputRef.current) {
      searchInputRef.current.value = "";
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

  const closeUserModal = (force = false) => {
    if (isSaving && !force) return;

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
        } else {
          await api.updateUser(formData.id, toApiUpdatePayload(formData));
          showToast("Пользователь обновлён", "success");
        }

        closeUserModal(true);
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

  const confirmDeleteUser = async (u) => {
    setDeleteError("");
    setDeleteCheck(null);
    setUserToDelete(u);
    setDeleteConfirmOpen(true);

    if (Number(user?.id) === Number(u.id)) {
      setDeleteCheck({
        can_delete: false,
        can_deactivate: false,
        recommended_action: "none",
        message: "Нельзя удалить собственный аккаунт",
        reasons: ["Нельзя удалить собственный аккаунт администратора"],
        usage: {
          inspections_created: 0,
          defects_confirmed: 0,
          shifts_started: 0,
          total: 0,
        },
      });

      return;
    }

    setDeleteCheckLoading(true);

    try {
      const check = await api.checkUserDeletion(u.id);
      setDeleteCheck(check);
    } catch (e) {
      console.error("delete check error:", e);
      setDeleteError(formatApiError(e) || "Не удалось проверить возможность удаления");
    } finally {
      setDeleteCheckLoading(false);
    }
  };

  const closeDeleteModal = (force = false) => {
    if (isSaving && !force) return;

    setDeleteConfirmOpen(false);
    setUserToDelete(null);
    setDeleteError("");
    setDeleteCheck(null);
  };

  const deactivateUserFromDeleteModal = async () => {
    await runLocked(async () => {
      if (!userToDelete?.id) return;
      if (isSaving) return;

      if (Number(user?.id) === Number(userToDelete.id)) {
        setDeleteError("Нельзя деактивировать собственный аккаунт");
        return;
      }

      setDeleteError("");
      setIsSaving(true);

      try {
        await api.deactivateUser(userToDelete.id);

        showToast("Аккаунт пользователя деактивирован", "success");
        closeDeleteModal(true);
        await refreshUsers();
      } catch (e) {
        console.error("Deactivate error:", e);
        setDeleteError(formatApiError(e) || "Не удалось деактивировать аккаунт");
      } finally {
        setIsSaving(false);
      }
    });
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
        closeDeleteModal(true);
        await refreshUsers();
      } catch (e) {
        console.error("Delete error:", e);

        const detail = e?.data?.detail;

        if (e?.status === 409 && detail && typeof detail === "object") {
          setDeleteCheck(detail);
          setDeleteError(detail.message || "Пользователя нельзя удалить");
        } else {
          setDeleteError(formatApiError(e));
        }
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
    modalMode === "create" ? "Создание пользователя" : "Редактирование пользователя";

  const closeButtonStyle = {
    width: "auto",
    padding: "0 12px",
    fontSize: "0.86rem",
    fontWeight: 700,
  };

  const errorBoxStyle = {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    background: "rgba(244,67,54,0.15)",
    color: "#ffb4b4",
  };

  return (
    <div className="admin-account-container">
      {notification && (
        <div
          className={`admin-notification ${notification.type} ${
            notification.show ? "show" : ""
          }`}
        >
          <div className="admin-notification-message">
            {notification.message}
          </div>
        </div>
      )}

      <div className="admin-topnav-shell">
        <TopNav
          subtitle="Система распознавания трещин в слитках - Аккаунт"
          userName={profile.name}
          userRole="Администратор"
        />
      </div>

      <div className="admin-main-content">
        <div className="admin-profile-sidebar">
          <div className="admin-profile-card">
            <div className="admin-profile-header">
              <div className="admin-avatar-wrapper">
                <div className="admin-profile-avatar">
                  <span>{profile.initials}</span>
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
                  <span>ID администратора:</span>
                </div>
                <div className="admin-detail-value">{profile.employeeId}</div>
              </div>

              <div className="admin-detail-row">
                <div className="admin-detail-label">
                  <span>Email:</span>
                </div>
                <div className="admin-detail-value">{profile.email}</div>
              </div>

              <div className="admin-detail-row">
                <div className="admin-detail-label">
                  <span>Телефон:</span>
                </div>
                <div className="admin-detail-value">{profile.phone}</div>
              </div>

              <div className="admin-detail-row">
                <div className="admin-detail-label">
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
                  Обновить профиль
                </button>
              </div>
            </div>
          </div>

          <div className="admin-system-stats">
            <div className="admin-stats-header">
              <h2>Пользователи</h2>
            </div>

            <div className="admin-stats-grid">
              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">
                    {systemStats.totalUsers}
                  </div>
                  <div className="admin-stat-label">Всего пользователей</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">
                    {systemStats.activeUsers}
                  </div>
                  <div className="admin-stat-label">Активных</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">
                    {systemStats.engineers}
                  </div>
                  <div className="admin-stat-label">Инженеров</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{systemStats.admins}</div>
                  <div className="admin-stat-label">Администраторов</div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-system-stats">
            <div className="admin-stats-header">
              <h2>Моя активность</h2>
            </div>

            <div className="admin-stats-grid">
              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{inspectionsTotal}</div>
                  <div className="admin-stat-label">Слитков в моих сменах</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{confirmedTotal}</div>
                  <div className="admin-stat-label">Подтверждено</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{rejectedTotal}</div>
                  <div className="admin-stat-label">Отклонено</div>
                </div>
              </div>

              <div className="admin-stat-item">
                <div className="admin-stat-info">
                  <div className="admin-stat-number">{reviewedToday}</div>
                  <div className="admin-stat-label">Рассмотрено сегодня</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-management-panel">
          <div className="admin-management-header">
            <div className="admin-header-title">
              <h1>Управление пользователями</h1>
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
                Добавить пользователя
              </button>

              <button
                className="admin-action-button admin-action-secondary"
                onClick={resetFilters}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>

          <div className="admin-filters-panel">
            <div className="admin-search-container">
              <div className="admin-autofill-trap" aria-hidden="true">
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  tabIndex="-1"
                />
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  tabIndex="-1"
                />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                id={searchInputNameRef.current}
                name={searchInputNameRef.current}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                spellCheck="false"
                readOnly={!searchUnlocked}
                placeholder="Поиск по ФИО, email или телефону..."
                value={searchTerm}
                onMouseDown={() => setSearchUnlocked(true)}
                onFocus={() => setSearchUnlocked(true)}
                onChange={(e) => {
                  searchWasEditedRef.current = true;
                  setSearchTerm(e.target.value);
                }}
                className="admin-search-input"
              />

              {searchTerm && (
                <button
                  className="admin-search-clear"
                  onClick={() => {
                    searchWasEditedRef.current = true;
                    setSearchTerm("");

                    if (searchInputRef.current) {
                      searchInputRef.current.value = "";
                      searchInputRef.current.focus();
                    }
                  }}
                >
                  ×
                </button>
              )}
            </div>

            <div className="admin-filters-container">
              <div className="admin-filter-group">
                <label className="admin-filter-label">Роль:</label>

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
                <label className="admin-filter-label">Статус:</label>

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
                      <h3>Загрузка пользователей...</h3>
                    </div>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  paginatedUsers.map((u) => (
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

                            {Number(user?.id) === Number(u.id) && (
                              <span className="admin-current-user-badge">Вы</span>
                            )}
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
                            {u.email}
                          </div>

                          <div className="admin-user-phone">
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
                          {u.role}
                        </div>
                      </div>

                      <div className="admin-table-cell admin-cell-medium">
                        <div
                          className={`admin-user-status ${
                            u.is_active
                              ? "admin-status-active"
                              : "admin-status-inactive"
                          } ${
                            Number(user?.id) === Number(u.id)
                              ? "admin-status-disabled"
                              : ""
                          }`}
                          onClick={() => {
                            if (Number(user?.id) !== Number(u.id)) {
                              toggleUserStatus(u.id);
                            }
                          }}
                          title={
                            Number(user?.id) === Number(u.id)
                              ? "Нельзя деактивировать собственный аккаунт"
                              : "Кликните, чтобы переключить статус"
                          }
                        >
                          {u.is_active ? "Активен" : "Неактивен"}
                        </div>
                      </div>

                      <div className="admin-table-cell admin-cell-large">
                        <div className="admin-user-actions">
                          <button
                            className="admin-row-action admin-row-action-edit"
                            onClick={() => openEditModal(u)}
                            title="Редактировать пользователя"
                          >
                            Редактировать
                          </button>

                          <button
                            className="admin-row-action admin-row-action-delete"
                            onClick={() => confirmDeleteUser(u)}
                            title={
                              Number(user?.id) === Number(u.id)
                                ? "Нельзя удалить собственный аккаунт"
                                : "Удалить пользователя"
                            }
                            disabled={Number(user?.id) === Number(u.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-table-empty">
                    <div className="admin-empty-state">
                      <h3>Пользователи не найдены</h3>
                      <p>Попробуйте изменить параметры поиска</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-users-pagination">
              <div className="admin-pagination-info">
                {filteredUsers.length === 0
                  ? "Нет пользователей для отображения"
                  : `Показано ${shownUsersStart}–${shownUsersEnd} из ${filteredUsers.length}`}
              </div>

              <div className="admin-pagination-controls">
                <select
                  className="admin-page-size-select"
                  value={usersPerPage}
                  onChange={(e) => changeUsersPerPage(e.target.value)}
                >
                  <option value="5">5 на странице</option>
                  <option value="10">10 на странице</option>
                  <option value="20">20 на странице</option>
                  <option value="50">50 на странице</option>
                </select>

                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={safeUserPage === 1}
                  onClick={() => goToUserPage(1)}
                  title="Первая страница"
                >
                  «
                </button>

                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={safeUserPage === 1}
                  onClick={() => goToUserPage(safeUserPage - 1)}
                  title="Предыдущая страница"
                >
                  ‹
                </button>

                <div className="admin-page-numbers">
                  {userPageNumbers.map((page, index) => {
                    const prevPage = userPageNumbers[index - 1];
                    const showDots = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {showDots && <span className="admin-page-dots">...</span>}

                        <button
                          type="button"
                          className={`admin-page-number ${
                            page === safeUserPage ? "active" : ""
                          }`}
                          onClick={() => goToUserPage(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={safeUserPage === totalUserPages}
                  onClick={() => goToUserPage(safeUserPage + 1)}
                  title="Следующая страница"
                >
                  ›
                </button>

                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={safeUserPage === totalUserPages}
                  onClick={() => goToUserPage(totalUserPages)}
                  title="Последняя страница"
                >
                  »
                </button>
              </div>
            </div>
          </div>

          <div className="admin-filters-panel" style={{ marginTop: 20 }}>
            <div className="admin-management-header" style={{ marginBottom: 12 }}>
              <div className="admin-header-title">
                <h1 style={{ fontSize: "1.3rem" }}>
                  Настройки ролей и прав доступа
                </h1>
              </div>

              <div className="admin-header-actions">
                <button
                  className="admin-action-button admin-action-secondary"
                  onClick={loadRolePermissions}
                  disabled={loadingPermissions}
                >
                  {loadingPermissions ? "Обновление..." : "Обновить права"}
                </button>
              </div>
            </div>

            {permissionsError && (
              <div style={errorBoxStyle}>{permissionsError}</div>
            )}

            {loadingPermissions ? (
              <div className="admin-table-empty">
                <div className="admin-empty-state">
                  <h3>Загрузка прав доступа...</h3>
                </div>
              </div>
            ) : (
              <div className="admin-users-table admin-permissions-table">
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
                        <h3>Права доступа не найдены</h3>
                        <p>Проверь таблицу permissions в базе данных</p>
                      </div>
                    </div>
                  ) : (
                    paginatedPermissions.map((permission) => (
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

                {permissionsList.length > 0 && (
                  <div className="admin-users-pagination">
                    <div className="admin-pagination-info">
                      Показано {shownPermissionsStart}–{shownPermissionsEnd} из{" "}
                      {permissionsList.length} прав
                    </div>

                    <div className="admin-pagination-controls">
                      <select
                        className="admin-page-size-select"
                        value={permissionsPerPage}
                        onChange={(e) => changePermissionsPerPage(e.target.value)}
                      >
                        <option value="5">5 на странице</option>
                        <option value="10">10 на странице</option>
                        <option value="20">20 на странице</option>
                        <option value="50">50 на странице</option>
                      </select>

                      <button
                        type="button"
                        className="admin-page-btn"
                        disabled={safePermissionPage === 1}
                        onClick={() => goToPermissionPage(1)}
                        title="Первая страница"
                      >
                        «
                      </button>

                      <button
                        type="button"
                        className="admin-page-btn"
                        disabled={safePermissionPage === 1}
                        onClick={() => goToPermissionPage(safePermissionPage - 1)}
                        title="Предыдущая страница"
                      >
                        ‹
                      </button>

                      <div className="admin-page-numbers">
                        {permissionPageNumbers.map((page, index) => {
                          const prevPage = permissionPageNumbers[index - 1];
                          const showDots = prevPage && page - prevPage > 1;

                          return (
                            <React.Fragment key={page}>
                              {showDots && (
                                <span className="admin-page-dots">...</span>
                              )}

                              <button
                                type="button"
                                className={`admin-page-number ${
                                  page === safePermissionPage ? "active" : ""
                                }`}
                                onClick={() => goToPermissionPage(page)}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="admin-page-btn"
                        disabled={safePermissionPage === totalPermissionPages}
                        onClick={() => goToPermissionPage(safePermissionPage + 1)}
                        title="Следующая страница"
                      >
                        ›
                      </button>

                      <button
                        type="button"
                        className="admin-page-btn"
                        disabled={safePermissionPage === totalPermissionPages}
                        onClick={() => goToPermissionPage(totalPermissionPages)}
                        title="Последняя страница"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}

                {rolesAccess.length > 0 && (
                  <div className="admin-permissions-footer">
                    <button
                      className="admin-action-button admin-action-primary"
                      onClick={saveAllRolePermissions}
                      disabled={savingRoleId === "all"}
                    >
                      {savingRoleId === "all"
                        ? "Сохранение..."
                        : "Сохранить права доступа"}
                    </button>
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
            <h3>{modalTitle}</h3>

           
          </div>

          <div className="admin-modal-body">
            {modalError && <div style={errorBoxStyle}>{modalError}</div>}

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
              Отмена
            </button>

            <button
              className="admin-modal-button admin-modal-primary"
              onClick={submitUserForm}
              disabled={isSaving}
            >
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
            <h3>Обновление профиля</h3>

            
          </div>

          <div className="admin-modal-body">
            {profileError && <div style={errorBoxStyle}>{profileError}</div>}

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
              Отмена
            </button>

            <button
              className="admin-modal-button admin-modal-primary"
              onClick={saveProfile}
              disabled={isSaving}
            >
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
            <h3>Подтверждение удаления</h3>

            
          </div>

          <div className="admin-modal-body">
            {deleteError && (
              <div className="admin-delete-error">{deleteError}</div>
            )}

            <div className="admin-delete-preview">
              <div className="admin-delete-icon">
                {deleteCheck?.can_delete ? "!" : "i"}
              </div>

              <h3>
                {deleteCheckLoading
                  ? "Проверяем возможность удаления..."
                  : deleteCheck?.can_delete
                  ? "Удалить пользователя?"
                  : "Пользователя лучше деактивировать"}
              </h3>

              <p>
                Пользователь:
                <br />
                <strong>
                  {`${userToDelete?.lastname || ""} ${userToDelete?.name || ""} ${
                    userToDelete?.middlename || ""
                  }`.trim() || "Без имени"}
                </strong>
                <br />
                <span>{userToDelete?.email}</span>
              </p>

              {deleteCheckLoading && (
                <div className="admin-delete-check-box">
                  Проверка связей с журналом, сменами и дефектами...
                </div>
              )}

              {!deleteCheckLoading && deleteCheck && (
                <div className="admin-delete-check-box">
                  <div className="admin-delete-check-title">
                    {deleteCheck.can_delete
                      ? "Связанные записи не найдены"
                      : "Найдены связанные записи"}
                  </div>

                  <div className="admin-delete-usage-grid">
                    <div>
                      <span>Проверки</span>
                      <strong>{deleteCheck.usage?.inspections_created || 0}</strong>
                    </div>

                    <div>
                      <span>Смены</span>
                      <strong>{deleteCheck.usage?.shifts_started || 0}</strong>
                    </div>

                    <div>
                      <span>Решения по дефектам</span>
                      <strong>{deleteCheck.usage?.defects_confirmed || 0}</strong>
                    </div>
                  </div>

                  <p className="admin-delete-note">{deleteCheck.message}</p>
                </div>
              )}

              {!deleteCheckLoading && !deleteCheck && (
                <div className="admin-delete-check-box">
                  Не удалось выполнить предварительную проверку. Безопаснее не
                  удалять пользователя, а деактивировать аккаунт.
                </div>
              )}
            </div>
          </div>

          <div className="admin-modal-footer">
            <button
              className="admin-modal-button admin-modal-secondary"
              onClick={closeDeleteModal}
              disabled={isSaving}
            >
              Отмена
            </button>

            {deleteCheck?.can_deactivate && !deleteCheck?.can_delete && (
              <button
                className="admin-modal-button admin-modal-warning"
                onClick={deactivateUserFromDeleteModal}
                disabled={isSaving}
              >
                {isSaving ? "Деактивация..." : "Деактивировать аккаунт"}
              </button>
            )}

            {deleteCheck?.can_delete && (
              <button
                className="admin-modal-button admin-modal-danger"
                onClick={deleteUser}
                disabled={isSaving}
              >
                {isSaving ? "Удаление..." : "Удалить пользователя"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccount;