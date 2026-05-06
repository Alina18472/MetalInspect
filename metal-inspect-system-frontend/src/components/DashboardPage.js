
import React, { useEffect, useRef, useState } from "react";
import "../styles/dashboard.css";
import TopNav from "../components/TopNav";
import { api, API_BASE_URL } from "../services/Api";

const Dashboard = () => {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [cameraStatus, setCameraStatus] = useState(null);
  const [cameraDelaySec, setCameraDelaySec] = useState("0.25");
  const [liveFrame, setLiveFrame] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const analysisActiveRef = useRef(false);
  const [eventsData, setEventsData] = useState([]);
  const [shiftStats, setShiftStats] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [delaySec, setDelaySec] = useState("0.7");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const loadingDashboardRef = useRef(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const frameImgRef = useRef(null);
  const [imageBox, setImageBox] = useState(null);
  const modalImgRef = useRef(null);
  const [modalImageBox, setModalImageBox] = useState(null);
  const loadDashboardData = async () => {
    if (loadingDashboardRef.current) return;
  
    loadingDashboardRef.current = true;
  
    try {
      const [status, camera, journal, currentShiftStats] = await Promise.all([
        api.getShiftStatus(),
        api.getCameraStatus(),
        api.getJournal(),
        api.getCurrentShiftStats(),
      ]);
  
      setCameraStatus(camera);
      setShiftStatus(status);
      setShiftStats(currentShiftStats?.shift || null);
  
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
        aiModelId: item.ai_model_id,
        aiModelKey: item.ai_model_key,
        aiModelName: item.ai_model_name,
        aiModelType: item.ai_model_type,
        aiModelArchitecture: item.ai_model_architecture,
        sentToMesAt: item.sent_to_mes_at,
        mesStatus: item.mes_status,
        mesMessage: item.mes_message,
        bbox: item.bbox || null,
        detections: Array.isArray(item.detections) ? item.detections : [],
        bboxCount:
          item.bbox_count ??
          (Array.isArray(item.detections) ? item.detections.length : 0),
      }));
  
      setEventsData(mappedEvents.slice(0, 10));
      setError("");
    } catch (e) {
      setError(e?.message || "Не удалось загрузить данные панели");
    } finally {
      loadingDashboardRef.current = false;
    }
  };
  const loadActiveModel = async () => {
    try {
      const data = await api.getActiveAiModelRuntime();
      setActiveModel(data);
    } catch (e) {
      console.warn("Не удалось загрузить активную модель:", e);
    }
  };

  // useEffect(() => {
  //   loadDashboardData();

  //   const interval = setInterval(() => {
  //     loadDashboardData();
  //   }, 300);

  //   return () => clearInterval(interval);
  // }, []);
 

  useEffect(() => {
    loadActiveModel();
    loadDashboardData();
  
    const interval = setInterval(() => {
      loadDashboardData();
    }, 1500);
  
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const token = localStorage.getItem("access_token");
  
    if (!token) return;
  
    const wsBaseUrl = API_BASE_URL.replace(/^http/, "ws");
    const ws = new WebSocket(
      `${wsBaseUrl}/ws/shift?token=${encodeURIComponent(token)}`
    );
  
    ws.onopen = () => {
      setWsConnected(true);
      console.log("WebSocket connected");
    };
  
    ws.onclose = () => {
      setWsConnected(false);
      console.log("WebSocket disconnected");
    };
  
    ws.onerror = (event) => {
      setWsConnected(false);
      console.warn("WebSocket error:", event);
    };
  
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
  
        if (data.type === "shift_started") {
          analysisActiveRef.current = true;
        }
  
        if (
          data.type === "shift_finished" ||
          data.type === "shift_error" ||
          data.type === "shift_stop_requested"
        ) {
          analysisActiveRef.current = false;
        }
  
        if (data.type === "camera_frame" || data.type === "analysis_frame") {
          setLiveFrame(data);
        }
        
        if (data.type === "ingot_result" || data.type === "defect_event") {
          loadDashboardData();
        }
  
      } catch (e) {
        console.warn("Bad WebSocket message:", e);
      }
    };
  
    return () => {
      ws.close();
    };
  }, []);

  const handleStartShift = async () => {
    if (!cameraStatus?.running) {
      setError("Сначала запустите камеру.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      await api.startShift({
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
  const handleStartCamera = async () => {
    setIsLoading(true);
    setError("");
  
    try {
      await api.startCamera({
        delaySec: Number(cameraDelaySec || 0.25),
      });
  
      await loadDashboardData();
    } catch (e) {
      setError(e?.message || "Не удалось запустить камеру");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStopCamera = async () => {
    setIsLoading(true);
    setError("");
  
    try {
      await api.stopCamera();
      await loadDashboardData();
    } catch (e) {
      setError(e?.message || "Не удалось остановить камеру");
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
  const sendToMes = async (event) => {
    if (!event?.defectDbId) return;
  
    const ok = window.confirm(
      `Передать дефект по слитку ${event.id} в MES?`
    );
  
    if (!ok) return;
  
    try {
      await api.sendDefectToMes(event.defectDbId);
      await loadDashboardData();
      setIsModalOpen(false);
    } catch (e) {
      alert(e?.message || "Не удалось передать дефект в MES");
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

  const processedIngots =
    shiftStats?.processed_ingots ?? shiftStatus?.processed_ingots ?? 0;

  const totalIngots =
    shiftStats?.processed_ingots ?? shiftStatus?.total_ingots ?? 0;

  const totalCrack =
    shiftStats?.total_crack ?? shiftStatus?.total_crack ?? 0;

  const totalOk =
    shiftStats?.total_ok ?? shiftStatus?.total_ok ?? 0;

  const defectRate =
    shiftStats?.defect_rate ?? shiftStatus?.defect_rate ?? 0;

  const avgMaxPCrack = shiftStats?.avg_max_p_crack ?? 0;
  const avgFrames = shiftStats?.avg_frames ?? 0;
  const currentShiftId = shiftStats?.shift_id ?? shiftStatus?.shift_id ?? null;

  const modalStyle = isModalOpen ? { display: "flex" } : { display: "none" };
  const liveFrameName =
    liveFrame?.frame_name || cameraStatus?.current_frame_name;

  const liveIngot =
    liveFrame?.ingot_id || cameraStatus?.current_ingot;

  const liveFrameIndex =
    liveFrame?.frame_index || cameraStatus?.current_frame_index;

  const liveFrameTotal =
    liveFrame?.frame_total ||
    (shiftStatus?.running ? shiftStatus?.current_frame_total : null);

  const livePCrack =
    liveFrame?.p_crack ??
    shiftStatus?.current_p_crack ??
    null;

  const liveVerdict =
    liveFrame?.frame_verdict ||
    shiftStatus?.current_frame_verdict ||
    null;
  
  const updateImageBox = () => {
  const img = frameImgRef.current;
  if (!img) return;

  const rect = img.getBoundingClientRect();

  setImageBox({
    width: rect.width,
    height: rect.height,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  });
};
const updateModalImageBox = () => {
  const img = modalImgRef.current;
  if (!img) return;

  const rect = img.getBoundingClientRect();

  setModalImageBox({
    width: rect.width,
    height: rect.height,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  });
};

const getLiveDetections = () => {
  if (Array.isArray(liveFrame?.detections)) return liveFrame.detections;
  if (Array.isArray(shiftStatus?.current_detections)) return shiftStatus.current_detections;
  return [];
};
const getSelectedEventDetections = () => {
  if (!selectedEvent) return [];

  if (Array.isArray(selectedEvent.detections) && selectedEvent.detections.length > 0) {
    return selectedEvent.detections;
  }

  if (selectedEvent.bbox) {
    return [{ bbox: selectedEvent.bbox, confidence: selectedEvent.confidence }];
  }

  return [];
};

const normalizeBbox = (det) => {
  const raw = det?.bbox || det?.box || det?.xyxy || det;

  if (!raw) return null;

  let x1;
  let y1;
  let x2;
  let y2;

  if (Array.isArray(raw) && raw.length >= 4) {
    [x1, y1, x2, y2] = raw;
  } else if (typeof raw === "object") {
    if (
      raw.x1 !== undefined &&
      raw.y1 !== undefined &&
      raw.x2 !== undefined &&
      raw.y2 !== undefined
    ) {
      x1 = raw.x1;
      y1 = raw.y1;
      x2 = raw.x2;
      y2 = raw.y2;
    } else if (
      raw.x !== undefined &&
      raw.y !== undefined &&
      raw.width !== undefined &&
      raw.height !== undefined
    ) {
      x1 = raw.x;
      y1 = raw.y;
      x2 = raw.x + raw.width;
      y2 = raw.y + raw.height;
    }
  }

  x1 = Number(x1);
  y1 = Number(y1);
  x2 = Number(x2);
  y2 = Number(y2);

  if ([x1, y1, x2, y2].some((v) => Number.isNaN(v))) return null;

  return { x1, y1, x2, y2 };
};
const getBboxStyle = (det, targetImageBox = imageBox) => {
  if (!targetImageBox) return null;

  const box = normalizeBbox(det);
  if (!box) return null;

  let { x1, y1, x2, y2 } = box;

  const maxCoord = Math.max(x1, y1, x2, y2);

  // Если координаты нормализованные 0..1
  if (maxCoord <= 1) {
    x1 *= targetImageBox.naturalWidth;
    x2 *= targetImageBox.naturalWidth;
    y1 *= targetImageBox.naturalHeight;
    y2 *= targetImageBox.naturalHeight;
  }

  const scaleX = targetImageBox.width / targetImageBox.naturalWidth;
  const scaleY = targetImageBox.height / targetImageBox.naturalHeight;

  return {
    left: `${x1 * scaleX}px`,
    top: `${y1 * scaleY}px`,
    width: `${(x2 - x1) * scaleX}px`,
    height: `${(y2 - y1) * scaleY}px`,
  };
};
  
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
                Источник: папка stream_images; Активная модель:{" "}
                {shiftStatus?.active_model_name || activeModel?.name || "—"}
              </span>
              </div>
            </div>

            <div className="video-container">
            {liveFrame?.frame_url ? (
            <img
              ref={frameImgRef}
              src={`${API_BASE_URL}${liveFrame.frame_url}`}
              alt={liveFrame.frame_name || "Кадр камеры"}
              onLoad={updateImageBox}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : cameraStatus?.current_frame_url ? (
            <img
              ref={frameImgRef}
              src={`${API_BASE_URL}${cameraStatus.current_frame_url}`}
              alt={cameraStatus.current_frame_name || "Кадр камеры"}
              onLoad={updateImageBox}
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
          {/* BBOX overlay для YOLO */}
          {getLiveDetections().map((det, index) => {
            const style = getBboxStyle(det);

            if (!style) return null;

            const conf =
              det.confidence ??
              det.conf ??
              det.score ??
              det.probability ??
              null;

            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  ...style,
                  border: "2px solid #ff4d4f",
                  borderRadius: "4px",
                  pointerEvents: "none",
                  boxShadow: "0 0 10px rgba(255, 77, 79, 0.8)",
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "-24px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(255, 77, 79, 0.9)",
                    color: "#fff",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  crack
                  {conf !== null && conf !== undefined
                    ? ` ${(Number(conf) * 100).toFixed(1)}%`
                    : ""}
                </div>
              </div>
            );
          })}
         
               
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
                    <strong>WebSocket:</strong>{" "}
                    {wsConnected ? "подключён" : "отключён"}
                  </div>

                  <div>
                    <strong>Камера:</strong>{" "}
                    {cameraStatus?.running ? "работает" : "остановлена"}
                  </div>
                  <div>
                    <strong>ID смены:</strong>{" "}
                    {currentShiftId || "—"}
                  </div>

                  <div>
                    <strong>Статус смены:</strong>{" "}
                    <div>
                      <strong>Активная модель:</strong>{" "}
                      {shiftStatus?.active_model_name || activeModel?.name || "—"}
                    </div>

                    <div>
                      <strong>Архитектура:</strong>{" "}
                      {shiftStatus?.active_model_architecture || activeModel?.architecture || "—"}
                    </div>

                    <div>
                      <strong>Режим модели:</strong>{" "}
                      {shiftStatus?.mode || activeModel?.default_mode || "—"}
                    </div>

                    <div>
                      <strong>Threshold:</strong>{" "}
                      {shiftStatus?.threshold !== null && shiftStatus?.threshold !== undefined
                        ? Number(shiftStatus.threshold).toFixed(3)
                        : activeModel?.threshold !== null && activeModel?.threshold !== undefined
                        ? Number(activeModel.threshold).toFixed(3)
                        : "—"}
                    </div>
                    {shiftStatus?.running ? "идёт обработка" : "не запущена / завершена"}
                  </div>

                  <div>
                    <strong>Текущий слиток:</strong>{" "}
                    {liveIngot || "—"}
                  </div>

                  <div>
                    <strong>Текущий кадр:</strong>{" "}
                    {liveFrameName || "—"}
                  </div>

                  <div>
                    <strong>Кадр в слитке:</strong>{" "}
                    {liveFrameIndex || "—"}
                  </div>

                  {/* <div>
                    <strong>p_crack кадра:</strong>{" "}
                    {livePCrack !== null && livePCrack !== undefined
                      ? Number(livePCrack).toFixed(3)
                      : "—"}
                  </div>

                  <div>
                    <strong>Вердикт кадра:</strong>{" "}
                    {liveVerdict || "—"}
                  </div> */}
                  <div>
                    <strong>Тип модели:</strong>{" "}
                    {liveFrame?.model_type || shiftStatus?.active_model_type || "—"}
                  </div>

                  <div>
                    <strong>Найдено bbox:</strong>{" "}
                    {liveFrame?.bbox_count ??
                      shiftStatus?.current_bbox_count ??
                      (Array.isArray(liveFrame?.detections) ? liveFrame.detections.length : 0)}
                  </div>

                  {shiftStatus?.last_result && (
                    <div>
                      <strong>Последний результат AI:</strong>{" "}
                      {shiftStatus.last_result.ingot_id} —{" "}
                      {shiftStatus.last_result.verdict}, max_p_crack=
                      {Number(shiftStatus.last_result.max_p_crack || 0).toFixed(3)}
                    </div>
                  )}

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
              <span style={{ color: "#8fb4d9", fontSize: "0.85rem" }}>
              задержка анализа, сек
            </span>

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
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  placeholder="camera delay"
                  value={cameraDelaySec}
                  onChange={(e) => setCameraDelaySec(e.target.value)}
                  disabled={cameraStatus?.running}
                  style={{
                    width: "110px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(60,120,180,0.4)",
                    background: "rgba(20,30,45,0.9)",
                    color: "#e0e0e0",
                  }}
                />

                  {!cameraStatus?.running ? (
                    <button
                      className="control-btn secondary"
                      onClick={handleStartCamera}
                      disabled={isLoading}
                    >
                      <i className="fas fa-video"></i> Запустить камеру
                    </button>
                  ) : (
                    <button
                      className="control-btn secondary"
                      onClick={handleStopCamera}
                      disabled={isLoading || shiftStatus?.running}
                    >
                      <i className="fas fa-video-slash"></i> Остановить камеру
                    </button>
                  )}

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
                Модель: {shiftStatus?.active_model_name || activeModel?.name || "—"} • Режим:{" "}
                {shiftStatus?.mode || activeModel?.default_mode || "—"} • threshold:{" "}
                {shiftStatus?.threshold !== null && shiftStatus?.threshold !== undefined
                  ? Number(shiftStatus.threshold).toFixed(3)
                  : activeModel?.threshold !== null && activeModel?.threshold !== undefined
                  ? Number(activeModel.threshold).toFixed(3)
                  : "—"}
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
              <div className="stat-card">
                <div className="stat-value">{avgMaxPCrack.toFixed(3)}</div>
                <div className="stat-label">Средний max_p_crack</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{avgFrames.toFixed(2)}</div>
                <div className="stat-label">Среднее кадров</div>
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
              <div
                  className="detail-image"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {selectedEvent.bestFrameUrl ? (
                    <>
                      <img
                        ref={modalImgRef}
                        src={selectedEvent.bestFrameUrl}
                        alt={`Лучший кадр ${selectedEvent.id}`}
                        onLoad={updateModalImageBox}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />

                      {getSelectedEventDetections().map((det, index) => {
                        const style = getBboxStyle(det, modalImageBox);

                        if (!style) return null;

                        const conf =
                          det.confidence ??
                          det.conf ??
                          det.score ??
                          selectedEvent.confidence ??
                          null;

                        return (
                          <div
                            key={index}
                            style={{
                              position: "absolute",
                              ...style,
                              border: "2px solid #ff4d4f",
                              borderRadius: "4px",
                              pointerEvents: "none",
                              boxShadow: "0 0 10px rgba(255, 77, 79, 0.8)",
                              zIndex: 5,
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                top: "-24px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: "rgba(255, 77, 79, 0.9)",
                                color: "#fff",
                                fontSize: "12px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              crack
                              {conf !== null && conf !== undefined
                                ? ` ${(Number(conf) * 100).toFixed(1)}%`
                                : ""}
                            </div>
                          </div>
                        );
                      })}
                    </>
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
                    <span className="detail-label">MES-статус:</span>
                    <span className="detail-value">
                      {selectedEvent.status === "sent_to_mes"
                        ? "Передано в MES"
                        : selectedEvent.mesStatus || "Не передано"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Время передачи в MES:</span>
                    <span className="detail-value">
                      {selectedEvent.sentToMesAt
                        ? selectedEvent.sentToMesAt.replace("T", " ")
                        : "—"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Сообщение MES:</span>
                    <span className="detail-value">
                      {selectedEvent.mesMessage || "—"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Модель:</span>
                    <span className="detail-value">
                      {selectedEvent.aiModelName || selectedEvent.aiModelKey || "—"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Архитектура:</span>
                    <span className="detail-value">
                      {selectedEvent.aiModelArchitecture || "—"}
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
                    {selectedEvent.status === "pending" && (
                      <>
                        <button
                          className="control-btn"
                          style={{ width: "100%", marginBottom: "10px" }}
                          onClick={() => confirmEvent(selectedEvent)}
                        >
                          <i className="fas fa-check-circle"></i> Подтвердить дефект
                        </button>

                        <button
                          className="control-btn secondary"
                          style={{ width: "100%", marginBottom: "10px" }}
                          onClick={() => rejectEvent(selectedEvent)}
                        >
                          <i className="fas fa-times-circle"></i> Отметить как ложное срабатывание
                        </button>
                      </>
                    )}

                    {selectedEvent.status === "confirmed" && (
                      <button
                        className="control-btn"
                        style={{ width: "100%", marginBottom: "10px" }}
                        onClick={() => sendToMes(selectedEvent)}
                      >
                        <i className="fas fa-paper-plane"></i> Передать в MES
                      </button>
                    )}

                    {selectedEvent.status === "sent_to_mes" && (
                      <div
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          background: "rgba(76, 175, 80, 0.15)",
                          color: "#a5d6a7",
                          textAlign: "center",
                          fontWeight: "600",
                        }}
                      >
                        <i className="fas fa-check-circle"></i> Дефект передан в MES
                      </div>
                    )}

                    {selectedEvent.status === "rejected" && (
                      <div
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          background: "rgba(255, 152, 0, 0.15)",
                          color: "#ffcc80",
                          textAlign: "center",
                          fontWeight: "600",
                        }}
                      >
                        <i className="fas fa-ban"></i> Срабатывание отклонено
                      </div>
                    )}
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