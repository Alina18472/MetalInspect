
// AccountPage.js
import React, { useState, useEffect, useMemo } from "react";
import TopNav from "../components/TopNav";
import "../styles/account.css";
import { useAuth } from "../context/AuthContext";

const Account = () => {
  const { user, loadMe, updateMe } = useAuth();

  // UI-состояния, которые пока не в БД (можно потом привязать к API)
  const [statusState, setStatusState] = useState({
    statusText: "На смене",
    avatarStatus: "online",
  });

  // Состояние приветственной панели (пока мок, позже из API)
  const [welcomeStats, setWelcomeStats] = useState({
    checkedToday: 42,
    defectsToday: 1,
    timeLeft: "4ч 12м",
  });

  // Состояние задач (пока мок)
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Проверить критическую партию SL-4850",
      description: "Требуется дополнительная проверка партии слитков с повышенным риском дефектов.",
      priority: "high",
      dueDate: "До 18:00 сегодня",
      completed: false,
    },
    {
      id: 2,
      title: "Обновить калибровку камеры #4",
      description: "Плановое обслуживание и калибровка камеры контроля качества.",
      priority: "medium",
      dueDate: "До конца смены",
      completed: false,
    },
    {
      id: 3,
      title: "Пройти обучение по новой модели ИИ",
      description: "Обучение работе с обновленной нейросетевой моделью YOLOv8.",
      priority: "low",
      dueDate: "До 25 июня",
      completed: false,
    },
  ]);

  // Состояние графика работы (пока мок)
  const [schedule, setSchedule] = useState([
    { day: "Пн", hours: 8, current: false },
    { day: "Вт", hours: 6, current: false },
    { day: "Ср", hours: 8, current: false },
    { day: "Чт", hours: 8, current: false },
    { day: "Пт", hours: 8, current: false },
    { day: "Сб", hours: 4, current: false },
    { day: "Вс", hours: 0, current: true },
  ]);

  // Состояние персональной статистики (пока мок)
  const [personalStats, setPersonalStats] = useState({
    accuracy: 98.7,
    checkedTotal: 1842,
    defectsFound: 24,
    rating: 4.2,
  });

  // Состояние уведомлений (пока мок)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Обновление системы",
      message: "Запланировано обновление программного обеспечения на 20 июня в 02:00.",
      time: "10 минут назад",
      read: false,
      icon: "fas fa-exclamation-circle",
    },
    {
      id: 2,
      title: "Новый курс обучения",
      message: 'Доступен новый курс "Работа с моделью YOLOv8". Пройдите до 25 июня.',
      time: "2 часа назад",
      read: true,
      icon: "fas fa-graduation-cap",
    },
  ]);

  // Состояние сертификатов (пока мок)
  const [certificates, setCertificates] = useState([
    {
      id: 1,
      name: "Оператор ИИ-систем контроля качества",
      icon: "fas fa-robot",
      issued: "15.03.2023",
      validUntil: "15.03.2024",
      status: "completed",
    },
    {
      id: 2,
      name: "Промышленная безопасность",
      icon: "fas fa-shield-alt",
      issued: "10.01.2023",
      validUntil: "10.01.2024",
      status: "in-progress",
    },
  ]);

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // ==========================
  // NEW: модалка редактирования профиля
  // ==========================
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

  // 1) Подтянуть профиль, если перезагрузка страницы и user пустой
  useEffect(() => {
    if (!user) loadMe();
  }, [user, loadMe]);

  // NEW: подставить текущие данные в форму (и при открытии модалки)
  useEffect(() => {
    if (!user) return;
    setEdit((p) => ({
      ...p,
      last_name: user.last_name || "",
      first_name: user.first_name || "",
      patronymic: user.patronymic || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      confirmPassword: "",
    }));
    setFormError("");
  }, [user, profileModalOpen]);

  // 2) Текущий день в графике
  useEffect(() => {
    const today = new Date().getDay();
    const adjustedToday = today === 0 ? 6 : today - 1;

    setSchedule((prev) =>
      prev.map((day, index) => ({
        ...day,
        current: index === adjustedToday,
      }))
    );
  }, []);

  // 3) CSS-класс страницы
  useEffect(() => {
    document.body.classList.add("account-page");
    return () => document.body.classList.remove("account-page");
  }, []);

  const profile = useMemo(() => {
    const last = user?.last_name || "";
    const first = user?.first_name || "";
    const pat = user?.patronymic || "";
    const fullName = `${last} ${first} ${pat}`.trim() || user?.email || "Пользователь";

    const shortName = (last && first && `${last} ${first[0]}.` + (pat ? `${pat[0]}.` : "")) || fullName;

    const roleText = user?.role_id === 1 ? "Администратор" : "Инженер";

    return {
      name: fullName,
      shortName,
      role: roleText,
      email: user?.email || "",
      phone: user?.phone || "",
      is_active: user?.is_active ?? true,
      status: statusState.statusText,
      avatarStatus: statusState.avatarStatus,
      employeeId: `#${user?.id ?? "—"}`,
    };
  }, [user, statusState]);

  const showNotification = (message, type) => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));
      setTimeout(() => setNotification(null), 300);
    }, 3000);
  };

  const confirmShift = () => {
    setStatusState({ statusText: "На смене", avatarStatus: "online" });
    setShiftModalOpen(false);
    showNotification("Смена успешно начата!", "success");
  };

  const toggleStatus = () => {
    const newAvatar = profile.avatarStatus === "online" ? "away" : "online";
    const newText = newAvatar === "online" ? "На смене" : "Отошел";
    setStatusState({ statusText: newText, avatarStatus: newAvatar });
    showNotification(`Статус изменен на "${newText}"`, "info");
  };

  // ==========================
  // NEW: сохранить профиль (PUT /users/me)
  // ==========================
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
    if (pass) payload.password = pass;

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

  const completeTask = (taskId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
    setWelcomeStats((prev) => ({ ...prev, checkedToday: prev.checkedToday + 1 }));
    setPersonalStats((prev) => ({ ...prev, checkedTotal: prev.checkedTotal + 1 }));
    showNotification("Задача отмечена как выполненная", "success");
  };

  const deferTask = () => showNotification("Задача отложена на завтра", "info");

  const showDayDetails = (dayIndex, hours) => {
    const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
    const fullDayName = dayNames[dayIndex];
    const message = hours > 0 ? `${fullDayName}: рабочая смена ${hours} часов (14:00-22:00)` : `${fullDayName}: выходной день`;
    showNotification(message, "info");
  };

  const getTaskPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#4CAF50";
      default:
        return "#8fb4d9";
    }
  };

  const getTaskPriorityText = (priority) => {
    switch (priority) {
      case "high":
        return "Высокий";
      case "medium":
        return "Средний";
      case "low":
        return "Низкий";
      default:
        return "Не указан";
    }
  };

  if (!user) {
    return (
      <div className="account-container" style={{ padding: 24, color: "#b0c4de" }}>
        Загрузка профиля...
      </div>
    );
  }

  return (
    <div className="account-container">
      {notification && (
        <div className={`account-notification ${notification.type} ${notification.show ? "show" : ""}`}>
          <i
            className={`fas ${
              notification.type === "success"
                ? "fa-check-circle"
                : notification.type === "error"
                ? "fa-exclamation-circle"
                : "fa-info-circle"
            }`}
          ></i>
          <div className="account-notification-message">{notification.message}</div>
        </div>
      )}

      <TopNav subtitle="Система распознавания трещин в слитках • Личный кабинет" userName={profile.name} userRole={profile.role} />

      <div className="account-main-content">
        <div className="account-profile-sidebar">
          <div className="account-profile-card">
            <div className="account-profile-header">
              <div className="account-avatar-wrapper" onClick={toggleStatus} title="Клик — сменить статус (UI)">
                <div className="account-profile-avatar">
                  <i className="fas fa-user-tie"></i>
                </div>
                <div className={`account-status-indicator account-status-${profile.avatarStatus}`}></div>
              </div>
              <div className="account-profile-name">{profile.shortName}</div>
              <div className="account-profile-role">{profile.role}</div>
              <div className="account-profile-status">{profile.status}</div>
            </div>

            <div className="account-profile-details">
              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-id-badge"></i>
                  <span>ID:</span>
                </div>
                <div className="account-detail-value">{profile.employeeId}</div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-envelope"></i>
                  <span>Email:</span>
                </div>
                <div className="account-detail-value">{profile.email || "—"}</div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-phone"></i>
                  <span>Телефон:</span>
                </div>
                <div className="account-detail-value">{profile.phone || "—"}</div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  <i className="fas fa-user-check"></i>
                  <span>Статус аккаунта:</span>
                </div>
                <div className="account-detail-value">{profile.is_active ? "Активен" : "Неактивен"}</div>
              </div>

              {/* ✅ КНОПКА НЕ В TOPNAV */}
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
            </div>
          </div>

          {/* Быстрые действия — можешь вернуть, если нужно */}
        </div>

        <div className="account-dashboard-main">
          <div className="account-welcome-panel">
            <div className="account-welcome-header">
              <div className="account-welcome-title">
                <i className="fas fa-hand-sparkles"></i>
                Добро пожаловать, {user?.first_name || "сотрудник"}!
              </div>
              <div className="account-welcome-message">
                За сегодня вы проверили {welcomeStats.checkedToday} слитков и обнаружили {welcomeStats.defectsToday} дефект.
              </div>
            </div>
            <div className="account-welcome-stats">
              <div className="account-welcome-stat">
                <div className="account-stat-number">{welcomeStats.checkedToday}</div>
                <div className="account-stat-text">Проверено сегодня</div>
              </div>
              <div className="account-welcome-stat">
                <div className="account-stat-number">{welcomeStats.defectsToday}</div>
                <div className="account-stat-text">Дефектов обнаружено</div>
              </div>
              <div className="account-welcome-stat">
                <div className="account-stat-number">{welcomeStats.timeLeft}</div>
                <div className="account-stat-text">Осталось до конца смены</div>
              </div>
            </div>
          </div>

          <div className="account-dashboard-sections">
            <div className="account-dashboard-section">
              <div className="account-section-header">
                <h2>
                  <i className="fas fa-tasks"></i> Мои задачи
                </h2>
                <a href="#" className="account-section-link" onClick={(e) => e.preventDefault()}>
                  Все задачи →
                </a>
              </div>
              <div className="account-section-content">
                <div className="account-tasks-list">
                  {tasks
                    .filter((task) => !task.completed)
                    .map((task) => (
                      <div key={task.id} className={`account-task-item account-task-${task.priority}`}>
                        <div className="account-task-header">
                          <div className="account-task-title">{task.title}</div>
                          <div className="account-task-priority" style={{ color: getTaskPriorityColor(task.priority) }}>
                            {getTaskPriorityText(task.priority)}
                          </div>
                        </div>
                        <div className="account-task-description">{task.description}</div>
                        <div className="account-task-footer">
                          <div className="account-task-date">
                            <i className="fas fa-clock"></i>
                            {task.dueDate}
                          </div>
                          <div className="account-task-actions">
                            <button className="account-task-button" onClick={() => completeTask(task.id)}>
                              <i className="fas fa-check"></i>Выполнено
                            </button>
                            <button className="account-task-button" onClick={() => deferTask(task.id)}>
                              <i className="fas fa-clock"></i>Отложить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {tasks.every((task) => task.completed) && (
                    <div className="account-empty-state">
                      <i className="fas fa-check-circle"></i>
                      Все задачи выполнены! Отличная работа!
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="account-dashboard-section">
              <div className="account-section-header">
                <h2>
                  <i className="fas fa-calendar-alt"></i> Мой график
                </h2>
                <a href="#" className="account-section-link" onClick={(e) => e.preventDefault()}>
                  Полный график →
                </a>
              </div>
              <div className="account-section-content">
                <div className="account-schedule-container">
                  <div className="account-schedule-grid">
                    {schedule.map((day, index) => (
                      <div
                        key={index}
                        className={`account-schedule-day ${day.current ? "account-schedule-current" : ""}`}
                        onClick={() => showDayDetails(index, day.hours)}
                      >
                        <div className="account-schedule-bar" style={{ height: `${Math.max(day.hours * 15, 10)}px` }}>
                          {day.hours > 0 && <div className="account-hours-label">{day.hours}ч</div>}
                        </div>
                        <div className="account-schedule-label">{day.day}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="account-dashboard-section">
              <div className="account-section-header">
                <h2>
                  <i className="fas fa-chart-line"></i> Моя статистика
                </h2>
                <a href="#" className="account-section-link" onClick={(e) => e.preventDefault()}>
                  Подробнее →
                </a>
              </div>
              <div className="account-section-content">
                <div className="account-personal-stats">
                  <div className="account-personal-stat">
                    <div className="account-personal-value">{personalStats.accuracy.toFixed(1)}%</div>
                    <div className="account-personal-label">Точность обнаружения</div>
                    <div className="account-personal-trend account-trend-up">
                      <i className="fas fa-arrow-up"></i>+0.5% за месяц
                    </div>
                  </div>

                  <div className="account-personal-stat">
                    <div className="account-personal-value">{personalStats.checkedTotal.toLocaleString()}</div>
                    <div className="account-personal-label">Проверено слитков</div>
                    <div className="account-personal-trend account-trend-up">
                      <i className="fas fa-arrow-up"></i>+127 за неделю
                    </div>
                  </div>

                  <div className="account-personal-stat">
                    <div className="account-personal-value">{personalStats.defectsFound}</div>
                    <div className="account-personal-label">Обнаружено дефектов</div>
                    <div className="account-personal-trend account-trend-down">
                      <i className="fas fa-arrow-down"></i>-3 за месяц
                    </div>
                  </div>

                  <div className="account-personal-stat">
                    <div className="account-personal-value">{personalStats.rating.toFixed(1)}</div>
                    <div className="account-personal-label">Средний рейтинг</div>
                    <div className="account-personal-trend">
                      <i className="fas fa-star"></i>из 5
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="account-dashboard-section">
              <div className="account-section-header">
                <h2>
                  <i className="fas fa-bell"></i> Уведомления и обучение
                </h2>
                <a href="#" className="account-section-link" onClick={(e) => e.preventDefault()}>
                  Все уведомления →
                </a>
              </div>
              <div className="account-section-content">
                <div className="account-notifications-list">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`account-notification-item ${!notif.read ? "account-notification-unread" : ""}`}
                      onClick={() => setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)))}
                    >
                      <div className="account-notification-icon">
                        <i className={notif.icon}></i>
                      </div>
                      <div className="account-notification-info">
                        <div className="account-notification-title">{notif.title}</div>
                        <div className="account-notification-message">{notif.message}</div>
                        <div className="account-notification-time">
                          <i className="fas fa-clock"></i>
                          {notif.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 25 }}>
                  <div className="account-certificates-list">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="account-certificate-item">
                        <div className="account-certificate-icon">
                          <i className={cert.icon}></i>
                        </div>
                        <div className="account-certificate-info">
                          <div className="account-certificate-name">{cert.name}</div>
                          <div className="account-certificate-details">
                            <span>Выдан: {cert.issued}</span>
                            <span>Действует до: {cert.validUntil}</span>
                          </div>
                          <div className={`account-certificate-status account-status-${cert.status}`}>
                            {cert.status === "completed" ? "Активен" : cert.status === "in-progress" ? "Требует продления" : "Истек"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Начало смены */}
      <div className={`account-modal-overlay ${shiftModalOpen ? "show" : ""}`} onClick={() => setShiftModalOpen(false)}>
        <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="account-modal-header">
            <h3>
              <i className="fas fa-play-circle"></i> Начало смены
            </h3>
            <button className="account-modal-close" onClick={() => setShiftModalOpen(false)}>
              &times;
            </button>
          </div>

          <div className="account-modal-body">
            <div style={{ textAlign: "center", padding: 20 }}>
              <i className="fas fa-user-check" style={{ fontSize: "3rem", color: "#4dabf7", marginBottom: 20 }}></i>
              <h3 style={{ color: "#e0e0e0", marginBottom: 15 }}>Подтверждение начала смены</h3>
              <p style={{ color: "#b0c4de", marginBottom: 25 }}>
                Вы собираетесь начать смену.<br />
                Пожалуйста, проверьте готовность оборудования.
              </p>
              <div style={{ color: "#8fb4d9", fontSize: "0.9rem", marginBottom: 25 }}>
                После начала смены система начнет отсчет рабочего времени.
              </div>
            </div>
          </div>

          <div className="account-modal-footer">
            <button className="account-modal-button account-modal-secondary" onClick={() => setShiftModalOpen(false)}>
              <i className="fas fa-times"></i> Отмена
            </button>
            <button className="account-modal-button account-modal-primary" onClick={confirmShift}>
              <i className="fas fa-play"></i> Начать смену
            </button>
          </div>
        </div>
      </div>

      {/* ✅ MODAL: Обновление профиля */}
      <div className={`account-modal-overlay ${profileModalOpen ? "show" : ""}`} onClick={closeProfileModal}>
        <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="account-modal-header">
            <h3>
              <i className="fas fa-user-edit"></i> Обновление профиля
            </h3>
            <button className="account-modal-close" onClick={closeProfileModal} disabled={saving}>
              &times;
            </button>
          </div>

          <div className="account-modal-body">
            {formError && (
              <div className="account-form-error" style={{ marginBottom: 14 }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
                {formError}
              </div>
            )}

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" }}>
              <input
                className="account-input"
                placeholder="Фамилия"
                value={edit.last_name}
                onChange={(e) => setEdit((p) => ({ ...p, last_name: e.target.value }))}
                autoComplete="family-name"
              />
              <input
                className="account-input"
                placeholder="Имя"
                value={edit.first_name}
                onChange={(e) => setEdit((p) => ({ ...p, first_name: e.target.value }))}
                autoComplete="given-name"
              />
              <input
                className="account-input"
                placeholder="Отчество"
                value={edit.patronymic}
                onChange={(e) => setEdit((p) => ({ ...p, patronymic: e.target.value }))}
                autoComplete="additional-name"
              />
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr", marginTop: 12 }}>
              <input
                className="account-input"
                placeholder="Email *"
                value={edit.email}
                onChange={(e) => setEdit((p) => ({ ...p, email: e.target.value }))}
                autoComplete="email"
                inputMode="email"
              />
              <input
                className="account-input"
                placeholder="Телефон"
                value={edit.phone}
                onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))}
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <input
                className="account-input"
                type="password"
                placeholder="Новый пароль (необязательно)"
                value={edit.password}
                onChange={(e) => setEdit((p) => ({ ...p, password: e.target.value }))}
                autoComplete="new-password"
              />
              <input
                className="account-input"
                type="password"
                placeholder="Подтвердите пароль"
                value={edit.confirmPassword}
                onChange={(e) => setEdit((p) => ({ ...p, confirmPassword: e.target.value }))}
                autoComplete="new-password"
              />
            </div>

            <div style={{ marginTop: 10, color: "#8fb4d9", fontSize: "0.9rem" }}>
              Пароль менять необязательно — оставь поля пустыми.
            </div>
          </div>

          <div className="account-modal-footer">
            <button className="account-modal-button account-modal-secondary" onClick={closeProfileModal} disabled={saving}>
              <i className="fas fa-times"></i> Отмена
            </button>
            <button className="account-modal-button account-modal-primary" onClick={saveProfile} disabled={saving}>
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
