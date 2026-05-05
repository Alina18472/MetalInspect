// AccountPage.js
import React, { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import "../styles/account.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/Api";

const Account = () => {
  const { user, loadMe, updateMe } = useAuth();

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

  useEffect(() => {
    document.body.classList.add("account-page");
    return () => document.body.classList.remove("account-page");
  }, []);

  useEffect(() => {
    if (!user) {
      loadMe();
    }
  }, [user, loadMe]);

  useEffect(() => {
    loadActivity();
  }, []);

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

  const showNotification = (message, type = "info") => {
    setNotification({ message, type, show: true });

    setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));
      setTimeout(() => setNotification(null), 300);
    }, 3000);
  };

  const loadActivity = async () => {
    setActivityLoading(true);

    try {
      const data = await api.getMyActivity();
      setActivity(data);
    } catch (e) {
      showNotification(
        e?.message || "Не удалось загрузить активность пользователя",
        "error"
      );
    } finally {
      setActivityLoading(false);
    }
  };

  const profile = useMemo(() => {
    const last = user?.last_name || "";
    const first = user?.first_name || "";
    const pat = user?.patronymic || "";

    const fullName =
      `${last} ${first} ${pat}`.trim() || user?.email || "Пользователь";

    const shortName =
      last && first
        ? `${last} ${first[0]}.${pat ? `${pat[0]}.` : ""}`
        : fullName;

    const roleText =
      Number(user?.role_id) === 1
        ? "Администратор"
        : Number(user?.role_id) === 2
        ? "Инженер"
        : "Пользователь";

    return {
      name: fullName,
      shortName,
      role: roleText,
      email: user?.email || "",
      phone: user?.phone || "",
      is_active: user?.is_active ?? true,
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

  const recentEvents = activity?.recent_events || [];

  const formatDateTime = (value) => {
    if (!value) return "—";
    return value.replace("T", " ");
  };

  const getStatusText = (status) => {
    const map = {
      pending: "Ожидает проверки",
      confirmed: "Подтверждено",
      rejected: "Отклонено",
      sent_to_mes: "Передано в MES",
    };

    return map[status] || status || "—";
  };

  const getStatusColor = (status) => {
    if (status === "confirmed") return "#f44336";
    if (status === "rejected") return "#ff9800";
    if (status === "sent_to_mes") return "#4CAF50";
    return "#8fb4d9";
  };

  const saveProfile = async () => {
    if (saving) return;

    setFormError("");

    const email = (edit.email || "").trim();
    const phone = (edit.phone || "").trim();
    const last_name = (edit.last_name || "").trim();
    const first_name = (edit.first_name || "").trim();
    const patronymic = (edit.patronymic || "").trim();

    const pass = edit.password || "";
    const conf = edit.confirmPassword || "";

    if (!email) {
      setFormError("Email обязателен");
      return;
    }

    if (pass || conf) {
      if (pass.length < 6) {
        setFormError("Пароль должен быть не короче 6 символов");
        return;
      }

      if (pass !== conf) {
        setFormError("Пароли не совпадают");
        return;
      }
    }

    const payload = {
      email,
      phone: phone || null,
      last_name: last_name || null,
      first_name: first_name || null,
      patronymic: patronymic || null,
    };

    if (pass) {
      payload.password = pass;
    }

    setSaving(true);

    try {
      const res = await updateMe(payload);

      if (!res?.ok) {
        setFormError(res?.error || "Не удалось сохранить профиль");
        return;
      }

      showNotification("Профиль обновлён", "success");
      setProfileModalOpen(false);
    } catch (e) {
      setFormError(e?.message || "Ошибка сохранения профиля");
    } finally {
      setSaving(false);
    }
  };

  const closeProfileModal = () => {
    if (saving) return;
    setProfileModalOpen(false);
    setFormError("");
  };

  if (!user) {
    return (
      <div
        className="account-container"
        style={{ padding: 24, color: "#b0c4de" }}
      >
        Загрузка профиля...
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
          <i
            className={`fas ${
              notification.type === "success"
                ? "fa-check-circle"
                : notification.type === "error"
                ? "fa-exclamation-circle"
                : "fa-info-circle"
            }`}
          ></i>
          <div className="account-notification-message">
            {notification.message}
          </div>
        </div>
      )}

      <TopNav
        subtitle="Система распознавания трещин в слитках • Личный кабинет"
        userName={profile.name}
        userRole={profile.role}
      />

      <div className="account-main-content">
        <div className="account-profile-sidebar">
          <div className="account-profile-card">
            <div className="account-profile-header">
              <div className="account-avatar-wrapper">
                <div className="account-profile-avatar">
                  <i className="fas fa-user-tie"></i>
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
                  <i className="fas fa-id-badge"></i>
                  <span>ID:</span>
                </div>
                <div className="account-detail-value">
                  {profile.employeeId}
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-envelope"></i>
                  <span>Email:</span>
                </div>
                <div className="account-detail-value">
                  {profile.email || "—"}
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-phone"></i>
                  <span>Телефон:</span>
                </div>
                <div className="account-detail-value">
                  {profile.phone || "—"}
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-user-shield"></i>
                  <span>Роль:</span>
                </div>
                <div className="account-detail-value">{profile.role}</div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-clock"></i>
                  <span>Последняя активность:</span>
                </div>
                <div className="account-detail-value">
                  {formatDateTime(lastActivityAt)}
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex" }}>
                <button
                  className="account-modal-button account-modal-primary"
                  style={{ width: "100%" }}
                  onClick={() => setProfileModalOpen(true)}
                >
                  <i className="fas fa-user-edit"></i>
                  Обновить профиль
                </button>
              </div>

              <div style={{ marginTop: 10, display: "flex" }}>
                <button
                  className="account-modal-button account-modal-secondary"
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
        </div>

        <div className="account-dashboard-main">
          <div className="account-welcome-panel">
            <div className="account-welcome-header">
              <div className="account-welcome-title">
                <i className="fas fa-hand-sparkles"></i>
                Добро пожаловать, {user?.first_name || "сотрудник"}!
              </div>

              <div className="account-welcome-message">
                Сегодня в ваших сменах обработано {inspectionsToday} слитков.
                Вы рассмотрели {reviewedToday} дефектных событий.
              </div>
            </div>

            <div className="account-welcome-stats">
              <div className="account-welcome-stat">
                <div className="account-stat-number">{inspectionsToday}</div>
                <div className="account-stat-text">Слитков сегодня</div>
              </div>

              <div className="account-welcome-stat">
                <div className="account-stat-number">{reviewedToday}</div>
                <div className="account-stat-text">
                  Событий рассмотрено сегодня
                </div>
              </div>

              <div className="account-welcome-stat">
                <div className="account-stat-number">{confirmedTotal}</div>
                <div className="account-stat-text">Дефектов подтверждено</div>
              </div>
            </div>
          </div>

          <div className="account-dashboard-sections">
            <div className="account-dashboard-section">
              <div className="account-section-header">
                <h2>
                  <i className="fas fa-chart-line"></i> Моя активность
                </h2>
                <a
                  href="#"
                  className="account-section-link"
                  onClick={(e) => {
                    e.preventDefault();
                    loadActivity();
                  }}
                >
                  Обновить →
                </a>
              </div>

              <div className="account-section-content">
                <div className="account-personal-stats">
                  <div className="account-personal-stat">
                    <div className="account-personal-value">
                      {inspectionsTotal.toLocaleString()}
                    </div>
                    <div className="account-personal-label">
                      Слитков обработано в моих сменах
                    </div>
                    <div className="account-personal-trend account-trend-up">
                      <i className="fas fa-industry"></i>
                      {inspectionsToday} сегодня
                    </div>
                  </div>

                  <div className="account-personal-stat">
                    <div className="account-personal-value">
                      {reviewedTotal}
                    </div>
                    <div className="account-personal-label">
                      Дефектных событий рассмотрено
                    </div>
                    <div className="account-personal-trend account-trend-up">
                      <i className="fas fa-clipboard-check"></i>
                      {reviewedToday} сегодня
                    </div>
                  </div>

                  <div className="account-personal-stat">
                    <div className="account-personal-value">
                      {confirmedTotal}
                    </div>
                    <div className="account-personal-label">
                      Подтверждено дефектов
                    </div>
                    <div className="account-personal-trend account-trend-up">
                      <i className="fas fa-check-circle"></i>
                      Решение инженера
                    </div>
                  </div>

                  <div className="account-personal-stat">
                    <div className="account-personal-value">
                      {rejectedTotal}
                    </div>
                    <div className="account-personal-label">
                      Отклонено срабатываний
                    </div>
                    <div className="account-personal-trend account-trend-down">
                      <i className="fas fa-times-circle"></i>
                      {falseAlarmRate.toFixed(1)}% от рассмотренных
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="account-dashboard-section">
              <div className="account-section-header">
                <h2>
                  <i className="fas fa-history"></i> Последние обработанные
                  дефекты
                </h2>
                <a
                  href="/journal"
                  className="account-section-link"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/journal";
                  }}
                >
                  Журнал →
                </a>
              </div>

              <div className="account-section-content">
                {activityLoading ? (
                  <div className="account-empty-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    Загрузка активности...
                  </div>
                ) : recentEvents.length === 0 ? (
                  <div className="account-empty-state">
                    <i className="fas fa-inbox"></i>
                    Вы пока не подтверждали и не отклоняли дефектные события.
                  </div>
                ) : (
                  <div className="account-tasks-list">
                    {recentEvents.map((event) => (
                      <div
                        key={event.defect_id}
                        className={`account-task-item ${
                          event.status === "confirmed"
                            ? "account-task-high"
                            : "account-task-medium"
                        }`}
                      >
                        <div className="account-task-header">
                          <div className="account-task-title">
                            {event.ingot_id || "Слиток не указан"}
                          </div>

                          <div
                            className="account-task-priority"
                            style={{ color: getStatusColor(event.status) }}
                          >
                            {getStatusText(event.status)}
                          </div>
                        </div>

                        <div className="account-task-description">
                          {event.comment || "Комментарий не указан"}
                        </div>

                        <div className="account-task-footer">
                          <div className="account-task-date">
                            <i className="fas fa-clock"></i>
                            {formatDateTime(event.time)}
                          </div>

                          <div
                            style={{
                              color: "#8fb4d9",
                              fontSize: "0.9rem",
                              lineHeight: "1.5",
                            }}
                          >
                            max_p_crack=
                            {Number(event.max_p_crack || 0).toFixed(3)} •{" "}
                            threshold=
                            {Number(event.threshold || 0).toFixed(3)}
                            <br />
                            Модель:{" "}
                            {event.ai_model_name ||
                              event.ai_model_key ||
                              "не указана"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="account-dashboard-section">
              <div className="account-section-header">
                <h2>
                  <i className="fas fa-user-shield"></i> Роль в системе
                </h2>
              </div>

              <div className="account-section-content">
                <div
                  style={{
                    color: "#b0c4de",
                    lineHeight: "1.7",
                    fontSize: "0.95rem",
                  }}
                >
                  <p>
                    Пользователь с ролью <strong>{profile.role}</strong> может
                    работать с главным экраном оператора, запускать имитацию
                    камеры и смены, просматривать журнал проверок и принимать
                    решение по дефектным событиям.
                  </p>

                  <p style={{ marginTop: 10 }}>
                    Подтверждение или отклонение дефекта фиксируется в журнале,
                    сохраняется в базе данных и связывается с пользователем,
                    который выполнил проверку.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`account-modal-overlay ${
          profileModalOpen ? "show" : ""
        }`}
        onClick={closeProfileModal}
      >
        <div
          className="account-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="account-modal-header">
            <h3>
              <i className="fas fa-user-edit"></i> Обновление профиля
            </h3>

            <button
              className="account-modal-close"
              onClick={closeProfileModal}
              disabled={saving}
            >
              &times;
            </button>
          </div>

          <div className="account-modal-body">
            {formError && (
              <div className="account-form-error" style={{ marginBottom: 14 }}>
                <i
                  className="fas fa-exclamation-circle"
                  style={{ marginRight: 8 }}
                ></i>
                {formError}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr 1fr",
              }}
            >
              <input
                className="account-input"
                placeholder="Фамилия"
                value={edit.last_name}
                onChange={(e) =>
                  setEdit((p) => ({ ...p, last_name: e.target.value }))
                }
                autoComplete="family-name"
              />

              <input
                className="account-input"
                placeholder="Имя"
                value={edit.first_name}
                onChange={(e) =>
                  setEdit((p) => ({ ...p, first_name: e.target.value }))
                }
                autoComplete="given-name"
              />

              <input
                className="account-input"
                placeholder="Отчество"
                value={edit.patronymic}
                onChange={(e) =>
                  setEdit((p) => ({ ...p, patronymic: e.target.value }))
                }
                autoComplete="additional-name"
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "2fr 1fr",
                marginTop: 12,
              }}
            >
              <input
                className="account-input"
                placeholder="Email *"
                value={edit.email}
                onChange={(e) =>
                  setEdit((p) => ({ ...p, email: e.target.value }))
                }
                autoComplete="email"
                inputMode="email"
              />

              <input
                className="account-input"
                placeholder="Телефон"
                value={edit.phone}
                onChange={(e) =>
                  setEdit((p) => ({ ...p, phone: e.target.value }))
                }
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr",
                marginTop: 12,
              }}
            >
              <input
                className="account-input"
                type="password"
                placeholder="Новый пароль (необязательно)"
                value={edit.password}
                onChange={(e) =>
                  setEdit((p) => ({ ...p, password: e.target.value }))
                }
                autoComplete="new-password"
              />

              <input
                className="account-input"
                type="password"
                placeholder="Подтвердите пароль"
                value={edit.confirmPassword}
                onChange={(e) =>
                  setEdit((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
                autoComplete="new-password"
              />
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#8fb4d9",
                fontSize: "0.9rem",
              }}
            >
              Пароль менять необязательно — оставь поля пустыми.
            </div>
          </div>

          <div className="account-modal-footer">
            <button
              className="account-modal-button account-modal-secondary"
              onClick={closeProfileModal}
              disabled={saving}
            >
              <i className="fas fa-times"></i> Отмена
            </button>

            <button
              className="account-modal-button account-modal-primary"
              onClick={saveProfile}
              disabled={saving}
            >
              <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`}></i>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;