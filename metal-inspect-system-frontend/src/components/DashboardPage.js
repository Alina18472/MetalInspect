
import React, { useEffect, useState } from "react";
import "../styles/dashboard.css";
import TopNav from "../components/TopNav";
import { api, API_BASE_URL } from "../services/Api";

const Dashboard = () => {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [eventsData, setEventsData] = useState([]);

  const [mode, setMode] = useState("balanced");
  const [threshold, setThreshold] = useState("");
  const [delaySec, setDelaySec] = useState("0.7");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [status, journal] = await Promise.all([
        api.getShiftStatus(),
        api.getJournal(),
      ]);

      setShiftStatus(status);

      const mappedEvents = (journal.items || []).map((item) => ({
        defectDbId: item.id,
        inspectionId: item.inspection_id,

        time: item.time ? item.time.replace("T", " ") : "",
        id: item.ingot_id,
        confidence: item.confidence || item.max_p_crack || 0,

        status: item.status || "pending",
        operator: item.operator || "Автоматически",
        comment: item.comment || "Требуется проверка оператором",

        defectType: item.defect_type || "crack",
        maxPCrack: item.max_p_crack,
        threshold: item.threshold,
        mode: item.mode,
        framesCount: item.frames_count,
        verdict: item.verdict,

        bestFrameUrl: item.best_frame_url
          ? `${API_BASE_URL}${item.best_frame_url}`
          : null,
      }));

      setEventsData(mappedEvents.slice(0, 10));
      setError("");
    } catch (e) {
      setError(e?.message || "Не удалось загрузить данные панели");
    }
  };

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      loadDashboardData();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleStartShift = async () => {
    setIsLoading(true);
    setError("");

    try {
      await api.startShift({
        mode,
        threshold: threshold === "" ? null : Number(threshold),
        delaySec: Number(delaySec || 0.7),
      });

      await loadDashboardData();
    } catch (e) {
      setError(e?.message || "Не удалось запустить смену");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopShift = async () => {
    setIsLoading(true);
    setError("");

    try {
      await api.stopShift();
      await loadDashboardData();
    } catch (e) {
      setError(e?.message || "Не удалось остановить смену");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEvent = async (event) => {
    const comment = window.prompt(
      "Комментарий к подтверждению:",
      "Трещина подтверждена"
    );

    if (comment === null) return;

    try {
      await api.confirmDefect(event.defectDbId, comment);
      await loadDashboardData();
      setIsModalOpen(false);
    } catch (e) {
      alert(e?.message || "Не удалось подтвердить дефект");
    }
  };

  const rejectEvent = async (event) => {
    const comment = window.prompt(
      "Комментарий к отклонению:",
      "Ложное срабатывание"
    );

    if (comment === null) return;

    try {
      await api.rejectDefect(event.defectDbId, comment);
      await loadDashboardData();
      setIsModalOpen(false);
    } catch (e) {
      alert(e?.message || "Не удалось отклонить дефект");
    }
  };

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const getConfidenceClass = (confidence) => {
    if (confidence > 0.9) return "high-confidence";
    if (confidence > 0.8) return "medium-confidence";
    return "low-confidence";
  };

  const getCriticalityClass = (confidence) => {
    if (confidence > 0.9) return "detail-critical";
    if (confidence > 0.8) return "detail-warning";
    return "detail-ok";
  };

  const getCriticalityText = (confidence) => {
    if (confidence > 0.9) return "Высокая";
    if (confidence > 0.8) return "Средняя";
    return "Низкая";
  };

  const getStatusText = (status) => {
    const map = {
      pending: "Ожидает проверки",
      confirmed: "Подтверждено",
      rejected: "Отклонено",
      sent_to_mes: "Передано в MES",
    };

    return map[status] || status || "Ожидает проверки";
  };

  const latestEvent = eventsData[0] || null;

  const processedIngots = shiftStatus?.processed_ingots || 0;
  const totalIngots = shiftStatus?.total_ingots || 0;
  const totalCrack = shiftStatus?.total_crack || 0;
  const totalOk = shiftStatus?.total_ok || 0;
  const defectRate = shiftStatus?.defect_rate || 0;

  const modalStyle = isModalOpen ? { display: "flex" } : { display: "none" };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <TopNav
          subtitle="Система распознавания трещин в слитках • Главный экран оператора"
          userName="Оператор системы"
          userRole="Контроль качества • AI-зрение"
        />

        <div className="dashboard-main-content">
          <div className="video-panel">
            <div className="video-header">
              <h2>
                <i className="fas fa-video"></i> Имитация видеопотока контроля
              </h2>

              <div className="camera-info">
                <i className="fas fa-camera"></i>
                <span>
                  Источник: папка stream_images • Модель: ResNet18 crack / ok
                </span>
              </div>
            </div>

            <div className="video-container">
            {shiftStatus?.current_frame_url ? (
                <img
                    src={`${API_BASE_URL}${shiftStatus.current_frame_url}`}
                    alt={shiftStatus.current_frame_name || "Текущий кадр"}
                    style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    }}
                />
                ) : latestEvent?.bestFrameUrl ? (
                <img
                    src={latestEvent.bestFrameUrl}
                    alt={`Лучший кадр ${latestEvent.id}`}
                    style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    }}
                />
                ) : (
                <div className="video-placeholder"></div>
                )}
               
              <div className="video-overlay">
                <div
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "20px",
                    padding: "14px 18px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.65)",
                    color: "#e0e0e0",
                    maxWidth: "520px",
                    lineHeight: "1.6",
                  }}
                >
                  <div>
                    <strong>Статус смены:</strong>{" "}
                    {shiftStatus?.running ? "идёт обработка" : "не запущена / завершена"}
                  </div>

                  <div>
                    <strong>Текущий слиток:</strong>{" "}
                    {shiftStatus?.current_ingot || "—"}
                  </div>
                  <div>
                    <strong>Текущий кадр:</strong>{" "}
                    {shiftStatus?.current_frame_name || "—"}
                    </div>

                    <div>
                    <strong>Кадр в слитке:</strong>{" "}
                    {shiftStatus?.current_frame_index && shiftStatus?.current_frame_total
                        ? `${shiftStatus.current_frame_index}/${shiftStatus.current_frame_total}`
                        : "—"}
                    </div>

                    <div>
                    <strong>p_crack кадра:</strong>{" "}
                    {shiftStatus?.current_p_crack !== null &&
                    shiftStatus?.current_p_crack !== undefined
                        ? Number(shiftStatus.current_p_crack).toFixed(3)
                        : "—"}
                    </div>

                    <div>
                    <strong>Вердикт кадра:</strong>{" "}
                    {shiftStatus?.current_frame_verdict || "—"}
                    </div>

                  <div>
                    <strong>Прогресс:</strong> {processedIngots} / {totalIngots}
                  </div>

                  <div>
                    <strong>Последнее сообщение:</strong>{" "}
                    {shiftStatus?.message || "Нет данных"}
                  </div>

                  {shiftStatus?.last_result && (
                    <div>
                      <strong>Последний результат:</strong>{" "}
                      {shiftStatus.last_result.ingot_id} —{" "}
                      {shiftStatus.last_result.verdict}, max_p_crack=
                      {Number(shiftStatus.last_result.max_p_crack || 0).toFixed(3)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="video-controls">
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  className="control-btn secondary"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  disabled={shiftStatus?.running}
                >
                  <option value="strict">Меньше ложных срабатываний</option>
                  <option value="balanced">Сбалансированный</option>
                  <option value="sensitive">Меньше пропусков дефектов</option>
                </select>

                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  placeholder="threshold"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  disabled={shiftStatus?.running}
                  style={{
                    width: "120px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(60,120,180,0.4)",
                    background: "rgba(20,30,45,0.9)",
                    color: "#e0e0e0",
                  }}
                />

                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="delay"
                  value={delaySec}
                  onChange={(e) => setDelaySec(e.target.value)}
                  disabled={shiftStatus?.running}
                  style={{
                    width: "90px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(60,120,180,0.4)",
                    background: "rgba(20,30,45,0.9)",
                    color: "#e0e0e0",
                  }}
                />

                {!shiftStatus?.running ? (
                  <button
                    className="control-btn"
                    onClick={handleStartShift}
                    disabled={isLoading}
                  >
                    <i className="fas fa-play"></i> Начать смену
                  </button>
                ) : (
                  <button
                    className="control-btn paused"
                    onClick={handleStopShift}
                    disabled={isLoading}
                  >
                    <i className="fas fa-stop"></i> Остановить смену
                  </button>
                )}

                <button
                  className="control-btn secondary"
                  onClick={loadDashboardData}
                  disabled={isLoading}
                >
                  <i className="fas fa-sync-alt"></i> Обновить
                </button>
              </div>

              <div className="fps-indicator">
                <i className="fas fa-tachometer-alt"></i>
                Режим: {shiftStatus?.mode || mode} • threshold:{" "}
                {Number(shiftStatus?.threshold ?? threshold ?? 0.465).toFixed(3)}
                </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: "12px",
                  color: "#f44336",
                  fontWeight: "600",
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div className="stats-panel">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div className="stat-card">
                <div className="stat-value">{processedIngots}</div>
                <div className="stat-label">Обработано слитков</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{totalCrack}</div>
                <div className="stat-label">Дефектных</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{totalOk}</div>
                <div className="stat-label">OK</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{defectRate.toFixed(1)}%</div>
                <div className="stat-label">Доля дефектных</div>
              </div>
            </div>

            <div className="events-container">
              <div className="panel-header">
                <h2>
                  <i className="fas fa-history"></i> Последние события
                </h2>

                <div style={{ color: "#8fb4d9", fontSize: "0.9rem" }}>
                  <i
                    className="fas fa-sync-alt"
                    style={{ cursor: "pointer" }}
                    onClick={loadDashboardData}
                  ></i>
                </div>
              </div>

              <div className="events-content">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>Время</th>
                      <th>ID слитка</th>
                      <th>Уверенность</th>
                    </tr>
                  </thead>

                  <tbody>
                    {eventsData.length === 0 ? (
                      <tr>
                        <td
                          colSpan="3"
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "#8fb4d9",
                          }}
                        >
                          Событий дефектов пока нет
                        </td>
                      </tr>
                    ) : (
                      eventsData.map((event) => (
                        <tr
                          key={event.defectDbId}
                          onClick={() => openEventDetails(event)}
                          className="event-row"
                        >
                          <td className="event-time">{event.time}</td>
                          <td className="event-id">{event.id}</td>
                          <td>
                            <div className="confidence-cell">
                              <div className="confidence-bar">
                                <div
                                  className={`confidence-fill ${getConfidenceClass(
                                    event.confidence
                                  )}`}
                                  style={{
                                    width: `${Math.round(event.confidence * 100)}%`,
                                  }}
                                ></div>
                              </div>
                              <span>{Math.round(event.confidence * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {selectedEvent && (
          <div
            className="modal-overlay"
            style={modalStyle}
            onClick={() => setIsModalOpen(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Детализация дефекта</h3>
                <button
                  className="close-modal"
                  onClick={() => setIsModalOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <div className="detail-image">
                  {selectedEvent.bestFrameUrl ? (
                    <img
                      src={selectedEvent.bestFrameUrl}
                      alt={`Лучший кадр ${selectedEvent.id}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#8fb4d9",
                        padding: "20px",
                      }}
                    >
                      <i
                        className="fas fa-image"
                        style={{ fontSize: "3rem", marginBottom: "15px" }}
                      ></i>
                      <div>Изображение недоступно</div>
                    </div>
                  )}
                </div>

                <div className="detail-info">
                  <h3 style={{ color: "#e0e0e0", marginBottom: "10px" }}>
                    Информация о дефекте
                  </h3>

                  <div className="detail-row">
                    <span className="detail-label">ID слитка:</span>
                    <span className="detail-value">{selectedEvent.id}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Время обнаружения:</span>
                    <span className="detail-value">{selectedEvent.time}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Уверенность ИИ:</span>
                    <span
                      className={`detail-value ${getCriticalityClass(
                        selectedEvent.confidence
                      )}`}
                    >
                      {Math.round(selectedEvent.confidence * 100)}%
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">max_p_crack:</span>
                    <span className="detail-value">
                      {Number(selectedEvent.maxPCrack || 0).toFixed(3)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Threshold:</span>
                    <span className="detail-value">
                      {Number(selectedEvent.threshold || 0).toFixed(3)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Кадров в слитке:</span>
                    <span className="detail-value">
                      {selectedEvent.framesCount}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Критичность:</span>
                    <span
                      className={`detail-value ${getCriticalityClass(
                        selectedEvent.confidence
                      )}`}
                    >
                      {getCriticalityText(selectedEvent.confidence)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Тип дефекта:</span>
                    <span className="detail-value">Трещина</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Статус проверки:</span>
                    <span className="detail-value detail-warning">
                      {getStatusText(selectedEvent.status)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Комментарий:</span>
                    <span className="detail-value">{selectedEvent.comment}</span>
                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "15px",
                      borderTop: "1px solid rgba(60, 120, 180, 0.3)",
                    }}
                  >
                    <button
                      className="control-btn"
                      style={{ width: "100%", marginBottom: "10px" }}
                      onClick={() => confirmEvent(selectedEvent)}
                    >
                      <i className="fas fa-check-circle"></i> Подтвердить дефект
                    </button>

                    <button
                      className="control-btn secondary"
                      style={{ width: "100%" }}
                      onClick={() => rejectEvent(selectedEvent)}
                    >
                      <i className="fas fa-times-circle"></i> Отметить как
                      ложное срабатывание
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;