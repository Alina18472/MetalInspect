import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import "../styles/account.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/Api";

const PROCESSED_STATUSES = new Set(["confirmed", "rejected", "sent_to_mes"]);

const normalizeStatus = (status) => String(status || "").toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "—";
  return String(value).replace("T", " ");
};

const formatApiError = (e) => {
  const detail = e?.data?.detail;

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item?.msg).filter(Boolean);
    if (messages.length) return messages.join(", ");
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.detail === "string") return detail.detail;
    return JSON.stringify(detail);
  }

  if (typeof e?.message === "string" && e.message.trim()) {
    return e.message;
  }

  return "Ошибка запроса";
};

const getStatusText = (status) => {
  const map = {
    pending: "Ожидает проверки",
    confirmed: "Подтверждено",
    rejected: "Отклонено",
    sent_to_mes: "Передано в MES",
  };

  const key = normalizeStatus(status);
  return map[key] || status || "—";
};

const getStatusClass = (status) => {
  const map = {
    pending: "pending",
    confirmed: "confirmed",
    rejected: "rejected",
    sent_to_mes: "sent",
  };

  const key = normalizeStatus(status);
  return map[key] || "default";
};

const getPermissionCode = (permission) => {
  if (typeof permission === "string") return permission;

  return (
    permission?.code ||
    permission?.key ||
    permission?.permission_code ||
    permission?.slug ||
    permission?.name ||
    ""
  );
};

const normalizePermission = (permission, index) => {
  if (typeof permission === "string") {
    return {
      id: permission || index,
      code: permission,
      title: permission,
      description: "",
    };
  }

  const code = getPermissionCode(permission);

  return {
    id: permission?.id || code || index,
    code,
    title:
      permission?.name ||
      permission?.title ||
      permission?.display_name ||
      permission?.label ||
      code ||
      "Право доступа",
    description: permission?.description || "",
  };
};

const Account = () => {
  const navigate = useNavigate();
  const {
    user,
    permissions,
    permissionDetails,
    hasPermission,
    loadMe,
    updateMe,
  } = useAuth();

  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [edit, setEdit] = useState({
    last_name: "",
    first_name: "",
    patronymic: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [defectsPage, setDefectsPage] = useState(1);
  const [defectsPerPage, setDefectsPerPage] = useState(3);

  const showNotification = useCallback((message, type = "info") => {
    setNotification({
      message,
      type,
      show: true,
    });

    setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));

      setTimeout(() => {
        setNotification(null);
      }, 250);
    }, 2800);
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);

    try {
      const data = await api.getMyActivity();
      setActivity(data);
    } catch (e) {
      showNotification(
        formatApiError(e) || "Не удалось загрузить активность пользователя",
        "error"
      );
    } finally {
      setActivityLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    document.body.classList.add("account-page");

    return () => {
      document.body.classList.remove("account-page");
    };
  }, []);

  useEffect(() => {
    if (!user) {
      loadMe();
    }
  }, [user, loadMe]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!user) return;

    setEdit({
      last_name: user.last_name || "",
      first_name: user.first_name || "",
      patronymic: user.patronymic || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      confirmPassword: "",
    });

    setFormError("");
  }, [user, profileModalOpen]);

  const profile = useMemo(() => {
    const last = user?.last_name || "";
    const first = user?.first_name || "";
    const patronymic = user?.patronymic || "";

    const fullName =
      `${last} ${first} ${patronymic}`.trim() ||
      user?.email ||
      "Пользователь";

    const shortName =
      last && first
        ? `${last} ${first[0]}.${patronymic ? `${patronymic[0]}.` : ""}`
        : fullName;

    const initials =
      `${last?.[0] || ""}${first?.[0] || ""}`.trim().toUpperCase() ||
      String(user?.email || "П").charAt(0).toUpperCase();

    const roleText =
      user?.role_name ||
      user?.role?.name ||
      (Number(user?.role_id) === 1
        ? "Администратор"
        : Number(user?.role_id) === 2
        ? "Инженер"
        : "Пользователь");

    const isActive = user?.is_active ?? true;

    return {
      name: fullName,
      shortName,
      initials,
      role: roleText,
      email: user?.email || "",
      phone: user?.phone || "",
      is_active: isActive,
      employeeId: `#${user?.id ?? "—"}`,
    };
  }, [user]);

  const activitySummary = activity?.summary || {};

  const inspectionsTotal = Number(activitySummary.inspections_total || 0);
  const inspectionsToday = Number(activitySummary.inspections_today || 0);

  const reviewedTotal = Number(activitySummary.reviewed_total || 0);
  const reviewedToday = Number(activitySummary.reviewed_today || 0);

  const confirmedTotal = Number(activitySummary.confirmed_total || 0);
  const rejectedTotal = Number(activitySummary.rejected_total || 0);

  const falseAlarmRate = Number(activitySummary.false_alarm_rate || 0);
  const lastActivityAt = activitySummary.last_activity_at || null;

  const rawPermissions = useMemo(() => {
    if (Array.isArray(permissionDetails) && permissionDetails.length > 0) {
      return permissionDetails;
    }
  
    if (Array.isArray(permissions)) return permissions;
    if (Array.isArray(user?.permissions)) return user.permissions;
    if (Array.isArray(user?.role?.permissions)) return user.role.permissions;
  
    return [];
  }, [permissionDetails, permissions, user]);

  const allowedPermissions = useMemo(() => {
    return rawPermissions.map((permission, index) =>
      normalizePermission(permission, index)
    );
  }, [rawPermissions]);

  const permissionCodes = useMemo(() => {
    return allowedPermissions
      .map((permission) => permission.code)
      .filter(Boolean);
  }, [allowedPermissions]);

  const permissionsTotal = allowedPermissions.length;

  const activityEventsSource = useMemo(() => {
    const source =
      activity?.processed_events ||
      activity?.reviewed_events ||
      activity?.defects ||
      activity?.recent_events ||
      [];

    return Array.isArray(source) ? source : [];
  }, [activity]);

  const processedDefects = useMemo(() => {
    return activityEventsSource
      .filter((event) => PROCESSED_STATUSES.has(normalizeStatus(event.status)))
      .sort((a, b) => {
        const dateA = new Date(a.time || a.created_at || 0).getTime();
        const dateB = new Date(b.time || b.created_at || 0).getTime();

        return dateB - dateA;
      });
  }, [activityEventsSource]);

  const sentToMesTotal = processedDefects.filter(
    (event) => normalizeStatus(event.status) === "sent_to_mes"
  ).length;

  const summaryTiles = [
    {
      title: "Слитков сегодня",
      value: inspectionsToday,
      hint: `Всего обработано: ${inspectionsTotal}`,
      type: "primary",
    },
    {
      title: "Решений сегодня",
      value: reviewedToday,
      hint: `Всего решений: ${reviewedTotal}`,
      type: "success",
    },
    {
      title: "Подтверждено",
      value: confirmedTotal,
      hint: "Реальные дефекты",
      type: "danger",
    },
    {
      title: "Отклонено",
      value: rejectedTotal,
      hint: `${falseAlarmRate.toFixed(1)}% от рассмотренных`,
      type: "warning",
    },
    {
      title: "Передано в MES",
      value: sentToMesTotal,
      hint: "Подтверждённые события",
      type: "success",
    },
  ];

  const totalDefectPages = Math.max(
    Math.ceil(processedDefects.length / defectsPerPage),
    1
  );

  const safeDefectsPage = Math.min(defectsPage, totalDefectPages);

  const defectsStartIndex = (safeDefectsPage - 1) * defectsPerPage;
  const defectsEndIndex = defectsStartIndex + defectsPerPage;

  const paginatedDefects = processedDefects.slice(
    defectsStartIndex,
    defectsEndIndex
  );

  const shownDefectsStart =
    processedDefects.length > 0 ? defectsStartIndex + 1 : 0;

  const shownDefectsEnd = Math.min(defectsEndIndex, processedDefects.length);

  const defectPageNumbers = Array.from(
    { length: totalDefectPages },
    (_, index) => index + 1
  ).filter((page) => {
    return (
      page === 1 ||
      page === totalDefectPages ||
      Math.abs(page - safeDefectsPage) <= 2
    );
  });

  useEffect(() => {
    setDefectsPage(1);
  }, [processedDefects.length]);

  const goToDefectsPage = (page) => {
    const normalizedPage = Math.min(Math.max(page, 1), totalDefectPages);
    setDefectsPage(normalizedPage);
  };

  const changeDefectsPerPage = (value) => {
    setDefectsPerPage(Number(value));
    setDefectsPage(1);
  };

  const validateProfile = () => {
    const email = (edit.email || "").trim();
    const pass = edit.password || "";
    const confirmPassword = edit.confirmPassword || "";

    if (!email) {
      return "Email обязателен";
    }

    if (pass || confirmPassword) {
      if (pass.length < 6) {
        return "Пароль должен быть не короче 6 символов";
      }

      if (!confirmPassword) {
        return "Подтвердите пароль";
      }

      if (pass !== confirmPassword) {
        return "Пароли не совпадают";
      }
    }

    return "";
  };

  const saveProfile = async () => {
    if (saving) return;

    const validationError = validateProfile();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    setSaving(true);

    const payload = {
      email: (edit.email || "").trim(),
      phone: (edit.phone || "").trim() || null,
      last_name: (edit.last_name || "").trim() || null,
      first_name: (edit.first_name || "").trim() || null,
      patronymic: (edit.patronymic || "").trim() || null,
    };

    if (edit.password) {
      payload.password = edit.password;
    }

    try {
      const result = await updateMe(payload);

      if (!result?.ok) {
        setFormError(result?.error || "Не удалось сохранить профиль");
        return;
      }

      showNotification("Профиль обновлён", "success");
      setProfileModalOpen(false);
    } catch (e) {
      setFormError(formatApiError(e) || "Ошибка сохранения профиля");
    } finally {
      setSaving(false);
    }
  };

  const closeProfileModal = () => {
    if (saving) return;

    setProfileModalOpen(false);
    setFormError("");
  };

  const openJournal = () => {
    const canViewJournal =
      typeof hasPermission === "function"
        ? hasPermission("journal.view")
        : permissionCodes.includes("journal.view");

    if (!canViewJournal) {
      showNotification("У вас нет права на просмотр журнала событий", "error");
      return;
    }

    navigate("/journal");
  };

  if (!user) {
    return (
      <div className="account-container">
        <div className="account-loading-state">
          <span>Загрузка профиля...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="account-container">
      {notification && (
        <div
          className={`account-notification ${notification.type} ${
            notification.show ? "show" : ""
          }`}
        >
          <div className="account-notification-message">
            {notification.message}
          </div>
        </div>
      )}

      <div className="account-topnav-shell">
        <TopNav
          subtitle="Система распознавания трещин в слитках - Аккаунт"
          userName={profile.name}
          userRole={profile.role}
        />
      </div>

      <main className="account-main-content">
        <section className="account-profile-panel">
          <div className="account-profile-card">
            <div className="account-profile-header">
              <div className="account-avatar-wrapper">
                <div className="account-profile-avatar">
                  <span>{profile.initials}</span>
                </div>

                <div
                  className={`account-status-indicator ${
                    profile.is_active
                      ? "account-status-online"
                      : "account-status-away"
                  }`}
                ></div>
              </div>

              <div className="account-profile-name">{profile.shortName}</div>
              <div className="account-profile-role">{profile.role}</div>

              <div className="account-profile-status">
                {profile.is_active ? "Аккаунт активен" : "Аккаунт неактивен"}
              </div>
            </div>

            <div className="account-profile-details">
              <div className="account-detail-row">
                <div className="account-detail-label">
                  <span>ID инженера:</span>
                </div>
                <div className="account-detail-value">{profile.employeeId}</div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <span>Email:</span>
                </div>
                <div className="account-detail-value">
                  {profile.email || "—"}
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <span>Телефон:</span>
                </div>
                <div className="account-detail-value">
                  {profile.phone || "—"}
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <span>Последняя активность:</span>
                </div>
                <div className="account-detail-value">
                  {formatDateTime(lastActivityAt)}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  className="account-modal-button account-modal-primary"
                  style={{ width: "100%" }}
                  onClick={() => setProfileModalOpen(true)}
                >
                  Обновить профиль
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="account-content-panel">
          <div className="account-page-heading account-page-heading-compact">
            <div>
              <h1>Личный кабинет инженера</h1>
              <p>
                Сводка по обработанным дефектам, активности и доступным функциям
                системы.
              </p>
            </div>

            <div className="account-heading-actions">
              <button
                type="button"
                className="account-heading-refresh"
                onClick={loadActivity}
                disabled={activityLoading}
              >
                {activityLoading ? "Обновление..." : "Обновить"}
              </button>
            </div>
          </div>

          <div className="account-workspace-grid">
            <section className="account-section account-defects-section">
              <div className="account-section-header">
                <div>
                  <h2>Обработанные дефекты</h2>
                  <p>
                    Подтверждённые, отклонённые и переданные в MES события
                  </p>
                </div>

                <button
                  type="button"
                  className="account-section-link"
                  onClick={openJournal}
                >
                  Открыть журнал
                </button>
              </div>

              <div className="account-section-content">
                <div className="account-defects-toolbar">
                  <div className="account-defects-count">
                    Всего обработанных дефектов:{" "}
                    <strong>{processedDefects.length}</strong>
                  </div>

                  <select
                    className="account-page-size-select"
                    value={defectsPerPage}
                    onChange={(e) => changeDefectsPerPage(e.target.value)}
                    disabled={processedDefects.length === 0}
                  >
                    <option value="3">3 на странице</option>
                    <option value="5">5 на странице</option>
                    <option value="10">10 на странице</option>
                    <option value="20">20 на странице</option>
                  </select>
                </div>

                {activityLoading ? (
                  <div className="account-empty-state">
                    <span>Загрузка обработанных дефектов...</span>
                  </div>
                ) : processedDefects.length === 0 ? (
                  <div className="account-empty-state">
                    <span>
                      Пока нет дефектов, которые были подтверждены, отклонены
                      или переданы в MES.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="account-defects-table">
                      <div className="account-defects-table-head">
                        <div>Дефект</div>
                        <div>Статус</div>
                        <div>Время</div>
                        <div>AI / модель</div>
                        <div>Комментарий</div>
                      </div>

                      <div className="account-defects-table-body">
                        {paginatedDefects.map((event, index) => (
                          <article
                            key={`${event.defect_id || event.id || index}-${
                              event.time || event.created_at || index
                            }`}
                            className="account-defect-row"
                          >
                            <div className="account-defect-main-cell">
                              <strong>
                                {event.ingot_id ||
                                  event.source_ingot_id ||
                                  "—"}
                              </strong>

                              <span>
                                ID дефекта:{" "}
                                {event.defect_id || event.id || "—"}
                              </span>
                            </div>

                            <div>
                              <span
                                className={`account-event-status ${getStatusClass(
                                  event.status
                                )}`}
                              >
                                {getStatusText(event.status)}
                              </span>
                            </div>

                            <div className="account-defect-muted">
                              {formatDateTime(event.time || event.created_at)}
                            </div>

                            <div className="account-defect-ai">
                              <strong>
                                {event.ai_model_name ||
                                  event.ai_model_key ||
                                  "—"}
                              </strong>

                              <span>
                                max_p=
                                {Number(
                                  event.max_p_crack || event.confidence || 0
                                ).toFixed(3)}
                              </span>

                              <span>
                                threshold=
                                {Number(event.threshold || 0).toFixed(3)}
                              </span>
                            </div>

                            <div className="account-defect-comment">
                              {event.comment || "Комментарий отсутствует"}
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className="account-defects-pagination">
                      <div className="account-pagination-info">
                        Показано {shownDefectsStart}–{shownDefectsEnd} из{" "}
                        {processedDefects.length}
                      </div>

                      <div className="account-pagination-controls">
                        <button
                          type="button"
                          className="account-page-btn"
                          disabled={safeDefectsPage === 1}
                          onClick={() => goToDefectsPage(1)}
                        >
                          «
                        </button>

                        <button
                          type="button"
                          className="account-page-btn"
                          disabled={safeDefectsPage === 1}
                          onClick={() => goToDefectsPage(safeDefectsPage - 1)}
                        >
                          ‹
                        </button>

                        <div className="account-page-numbers">
                          {defectPageNumbers.map((page, index) => {
                            const prevPage = defectPageNumbers[index - 1];
                            const showDots =
                              prevPage && page - prevPage > 1;

                            return (
                              <React.Fragment key={page}>
                                {showDots && (
                                  <span className="account-page-dots">
                                    ...
                                  </span>
                                )}

                                <button
                                  type="button"
                                  className={`account-page-number ${
                                    page === safeDefectsPage ? "active" : ""
                                  }`}
                                  onClick={() => goToDefectsPage(page)}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          className="account-page-btn"
                          disabled={safeDefectsPage === totalDefectPages}
                          onClick={() => goToDefectsPage(safeDefectsPage + 1)}
                        >
                          ›
                        </button>

                        <button
                          type="button"
                          className="account-page-btn"
                          disabled={safeDefectsPage === totalDefectPages}
                          onClick={() => goToDefectsPage(totalDefectPages)}
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="account-section account-summary-section">
              <div className="account-section-header">
                <div>
                  <h2>Личная статистика</h2>
                  <p>Ключевые показатели активности инженера</p>
                </div>
              </div>

              <div className="account-section-content">
                <div className="account-summary-grid">
                  {summaryTiles.map((item) => (
                    <SummaryTile
                      key={item.title}
                      title={item.title}
                      value={item.value}
                      hint={item.hint}
                      type={item.type}
                    />
                  ))}
                </div>

                <div className="account-summary-footer">
                  <div className="account-last-activity-line">
                    <span>Последняя активность</span>
                    <strong>{formatDateTime(lastActivityAt)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="account-section account-permissions-section">
              <div className="account-section-header">
                <div>
                  <h2>Права доступа</h2>
                  <p>Права, назначенные текущему пользователю</p>
                </div>
              </div>

              <div className="account-section-content">
                <div className="account-permissions-headline">
                  <div className="account-permissions-score">
                    <strong>{permissionsTotal}</strong>
                    <span>прав доступно</span>
                  </div>
                </div>

                {allowedPermissions.length === 0 ? (
                  <div className="account-empty-state compact">
                    <span>Для пользователя пока не назначены права доступа.</span>
                  </div>
                ) : (
                  <div className="account-permissions-list-compact">
                    {allowedPermissions.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="account-permission-mini no-icon"
                      >
                        <div className="account-permission-mini-text">
                          <strong>{item.title}</strong>
                          {item.description && <span>{item.description}</span>}

                          {item.code && item.code !== item.title && (
                            <code className="account-permission-code-text">{item.code}</code>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>

      <div
        className={`account-modal-overlay ${profileModalOpen ? "show" : ""}`}
        onClick={closeProfileModal}
      >
        <div
          className="account-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="account-modal-header">
            <h3>Обновление профиля</h3>

            
          </div>

          <div className="account-modal-body">
            {formError && <div className="account-form-error">{formError}</div>}

            <div className="account-form-grid three">
              <input
                className="account-input"
                placeholder="Фамилия"
                value={edit.last_name}
                onChange={(e) =>
                  setEdit((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                autoComplete="family-name"
              />

              <input
                className="account-input"
                placeholder="Имя"
                value={edit.first_name}
                onChange={(e) =>
                  setEdit((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
                autoComplete="given-name"
              />

              <input
                className="account-input"
                placeholder="Отчество"
                value={edit.patronymic}
                onChange={(e) =>
                  setEdit((prev) => ({
                    ...prev,
                    patronymic: e.target.value,
                  }))
                }
                autoComplete="additional-name"
              />
            </div>

            <div className="account-form-grid two">
              <input
                className="account-input"
                placeholder="Email *"
                value={edit.email}
                onChange={(e) =>
                  setEdit((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                autoComplete="email"
                inputMode="email"
              />

              <input
                className="account-input"
                placeholder="Телефон"
                value={edit.phone}
                onChange={(e) =>
                  setEdit((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div className="account-form-grid two">
              <input
                className="account-input"
                type="password"
                placeholder="Новый пароль"
                value={edit.password}
                onChange={(e) =>
                  setEdit((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                autoComplete="new-password"
              />

              <input
                className="account-input"
                type="password"
                placeholder="Подтвердите пароль"
                value={edit.confirmPassword}
                onChange={(e) =>
                  setEdit((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                autoComplete="new-password"
              />
            </div>

            <div className="account-form-hint">
              Пароль менять необязательно. Для сохранения текущего пароля
              оставьте оба поля пустыми.
            </div>
          </div>

          <div className="account-modal-footer">
            <button
              type="button"
              className="account-modal-button account-modal-secondary"
              onClick={closeProfileModal}
              disabled={saving}
            >
              Отмена
            </button>

            <button
              type="button"
              className="account-modal-button account-modal-primary"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function SummaryTile({ title, value, hint, type = "primary" }) {
  return (
    <div className={`account-summary-tile ${type}`}>
      <div className="account-summary-tile-text">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </div>
  );
}

export default Account;