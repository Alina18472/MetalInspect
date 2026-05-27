
import React, { useCallback, useEffect, useRef, useState } from "react";
import "../styles/dashboard.css";
import TopNav from "../components/TopNav";
import { api, API_BASE_URL } from "../services/Api";
import { useAuth } from "../context/AuthContext";
const DEFAULT_CAMERA_FPS = 15;
const CAMERA_FPS_STORAGE_KEY = "metal_inspect_camera_fps";
const SHIFT_ANALYSIS_DELAY_SEC = 0;

const normalizeCameraFps = (value) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return DEFAULT_CAMERA_FPS;
  if (numberValue < 1) return 1;
  if (numberValue > 60) return 60;

  return numberValue;
};

const getSavedCameraFps = () => {
  const savedValue = localStorage.getItem(CAMERA_FPS_STORAGE_KEY);
  return normalizeCameraFps(savedValue || DEFAULT_CAMERA_FPS);
};

const fpsToDelaySec = (fps) => {
  const normalizedFps = normalizeCameraFps(fps);
  return Number((1 / normalizedFps).toFixed(4));
};

const resolveImageUrl = (url) => {
  if (!url) return null;

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;

  return `${cleanBase}${cleanPath}`;
};

const getRenderedImageBox = (img) => {
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const imgRect = img.getBoundingClientRect();
  const parentRect = img.parentElement?.getBoundingClientRect();

  const elementOffsetX = parentRect ? imgRect.left - parentRect.left : 0;
  const elementOffsetY = parentRect ? imgRect.top - parentRect.top : 0;

  const elementWidth = imgRect.width;
  const elementHeight = imgRect.height;

  const imageRatio = img.naturalWidth / img.naturalHeight;
  const elementRatio = elementWidth / elementHeight;

  let renderedWidth;
  let renderedHeight;
  let innerOffsetX = 0;
  let innerOffsetY = 0;

  if (elementRatio > imageRatio) {
    renderedHeight = elementHeight;
    renderedWidth = elementHeight * imageRatio;
    innerOffsetX = (elementWidth - renderedWidth) / 2;
  } else {
    renderedWidth = elementWidth;
    renderedHeight = elementWidth / imageRatio;
    innerOffsetY = (elementHeight - renderedHeight) / 2;
  }

  return {
    width: renderedWidth,
    height: renderedHeight,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    offsetX: elementOffsetX + innerOffsetX,
    offsetY: elementOffsetY + innerOffsetY,
  };
};

const Dashboard = () => {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [cameraStatus, setCameraStatus] = useState(null);
  const [cameraFpsInput, setCameraFpsInput] = useState(() =>
    String(getSavedCameraFps())
  );

  const [cameraFrame, setCameraFrame] = useState(null);
  const [analysisFrame, setAnalysisFrame] = useState(null);

  const [wsConnected, setWsConnected] = useState(false);

  const [eventsData, setEventsData] = useState([]);
  const [shiftStats, setShiftStats] = useState(null);
  const [activeModel, setActiveModel] = useState(null);

  const [decisionComment, setDecisionComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadingDashboardRef = useRef(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const frameImgRef = useRef(null);
  const [imageBox, setImageBox] = useState(null);

  const modalImgRef = useRef(null);
  const [modalImageBox, setModalImageBox] = useState(null);

  const [mesConfirmModal, setMesConfirmModal] = useState({
    isOpen: false,
    event: null,
    isSubmitting: false,
  });
  const analysisDebugEnabled = Boolean(shiftStatus?.analysis_frame_events_enabled);


  const [accessNotice, setAccessNotice] = useState(null);
  const accessNoticeTimerRef = useRef(null);
  const { user } = useAuth();

  const userName =
    `${user?.last_name || ""} ${user?.first_name || ""} ${user?.patronymic || ""}`.trim() ||
    user?.email ||
    "Пользователь";

  const userRole =
    user?.role_name ||
    user?.role?.name ||
    (Number(user?.role_id) === 1 ? "Администратор" : "Инженер");

  const showAccessNotice = useCallback((message) => {
    setAccessNotice({
      message,
      show: true,
    });

    if (accessNoticeTimerRef.current) {
      clearTimeout(accessNoticeTimerRef.current);
    }

    accessNoticeTimerRef.current = setTimeout(() => {
      setAccessNotice((prev) => (prev ? { ...prev, show: false } : null));

      setTimeout(() => {
        setAccessNotice(null);
      }, 250);
    }, 2800);
  }, []);

  const handleAccessError = useCallback(
    (e, fallbackMessage) => {
      if (e?.status === 403) {
        const detail = e?.data?.detail;

        showAccessNotice(
          typeof detail === "string" && detail.trim()
            ? detail
            : fallbackMessage
        );

        return true;
      }

      return false;
    },
    [showAccessNotice]
  );

  const updateImageBox = useCallback(() => {
    const box = getRenderedImageBox(frameImgRef.current);
    if (box) setImageBox(box);
  }, []);

  const updateModalImageBox = useCallback(() => {
    const box = getRenderedImageBox(modalImgRef.current);
    if (box) setModalImageBox(box);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (loadingDashboardRef.current) return;

    loadingDashboardRef.current = true;

    try {
      const [statusResult, cameraResult, journalResult, currentShiftStatsResult] =
        await Promise.allSettled([
          api.getShiftStatus(),
          api.getCameraStatus(),
          api.getJournal(),
          api.getCurrentShiftStats(),
        ]);

      if (statusResult.status === "fulfilled") {
        setShiftStatus(statusResult.value);
      } else {
        console.warn("getShiftStatus error:", statusResult.reason);
      }

      if (cameraResult.status === "fulfilled") {
        setCameraStatus(cameraResult.value);
      } else {
        console.warn("getCameraStatus error:", cameraResult.reason);
      }

      if (currentShiftStatsResult.status === "fulfilled") {
        setShiftStats(currentShiftStatsResult.value?.shift || null);
      } else {
        console.warn(
          "getCurrentShiftStats error:",
          currentShiftStatsResult.reason
        );
        setShiftStats(null);
      }

      if (journalResult.status === "fulfilled") {
        const journal = journalResult.value || {};

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
          bestFrameUrl: resolveImageUrl(item.best_frame_url),
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
      } else {
        console.warn("getJournal error:", journalResult.reason);
        setEventsData([]);
      }

      if (
        statusResult.status === "rejected" ||
        cameraResult.status === "rejected"
      ) {
        setError("Не удалось загрузить состояние камеры или смены");
      } else {
        setError("");
      }
    } catch (e) {
      setError(e?.message || "Не удалось загрузить данные панели");
    } finally {
      loadingDashboardRef.current = false;
    }
  }, []);

  const loadActiveModel = useCallback(async () => {
    try {
      const data = await api.getActiveAiModelRuntime();
      setActiveModel(data);
    } catch (e) {
      console.warn("Не удалось загрузить активную модель:", e);
    }
  }, []);

  useEffect(() => {
    loadActiveModel();
    loadDashboardData();

    const interval = setInterval(() => {
      loadDashboardData();
    }, 1500);

    return () => clearInterval(interval);
  }, [loadActiveModel, loadDashboardData]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) return;

    const wsBaseUrl = API_BASE_URL.replace(/^http/, "ws");
    const ws = new WebSocket(
      `${wsBaseUrl}/ws/shift?token=${encodeURIComponent(token)}`
    );

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = (event) => {
      setWsConnected(false);
      console.warn("WebSocket error:", event);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "camera_frame") {
          setCameraFrame(data);
        }

        if (data.type === "analysis_frame") {
          setAnalysisFrame(data);
        }

        if (
          data.type === "shift_started" ||
          data.type === "shift_finished" ||
          data.type === "shift_error" ||
          data.type === "shift_stop_requested" ||
          data.type === "ingot_result" ||
          data.type === "defect_event"
        ) {
          loadDashboardData();
        }
      } catch (e) {
        console.warn("Bad WebSocket message:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [loadDashboardData]);

  useEffect(() => {
    const handleResize = () => {
      updateImageBox();
      updateModalImageBox();
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [updateImageBox, updateModalImageBox]);

  useEffect(() => {
    return () => {
      if (accessNoticeTimerRef.current) {
        clearTimeout(accessNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const recalculate = () => {
      updateModalImageBox();
    };

    requestAnimationFrame(recalculate);

    const timer1 = setTimeout(recalculate, 50);
    const timer2 = setTimeout(recalculate, 200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isModalOpen, selectedEvent?.bestFrameUrl, updateModalImageBox]);
  const handleSaveCameraFps = () => {
    const fps = normalizeCameraFps(cameraFpsInput);
  
    localStorage.setItem(CAMERA_FPS_STORAGE_KEY, String(fps));
    setCameraFpsInput(String(fps));
  
    setError("");
  };

  const handleStartCamera = async () => {
    setIsLoading(true);
    setError("");
  
    try {
      const cameraFps = normalizeCameraFps(cameraFpsInput);
      const delaySec = fpsToDelaySec(cameraFps);
  
      localStorage.setItem(CAMERA_FPS_STORAGE_KEY, String(cameraFps));
      setCameraFpsInput(String(cameraFps));
  
      await api.startCamera({
        delaySec,
      });
  
      await loadDashboardData();
    } catch (e) {
      if (
        handleAccessError(
          e,
          "Для запуска камеры требуется право «Управление камерой»."
        )
      ) {
        return;
      }
  
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
      if (
        handleAccessError(
          e,
          "Для остановки камеры требуется право «Управление камерой»."
        )
      ) {
        return;
      }

      setError(e?.message || "Не удалось остановить камеру");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartShift = async () => {
    if (!cameraStatus?.running) {
      setError("Сначала запустите камеру.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await api.startShift({
        delaySec: SHIFT_ANALYSIS_DELAY_SEC,
      });

      await loadDashboardData();
    } catch (e) {
      if (
        handleAccessError(
          e,
          "Для запуска AI-анализа смены требуется право «Управление сменой»."
        )
      ) {
        return;
      }

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
      if (
        handleAccessError(
          e,
          "Для остановки AI-анализа смены требуется право «Управление сменой»."
        )
      ) {
        return;
      }

      setError(e?.message || "Не удалось остановить смену");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEvent = async (event) => {
    const comment = decisionComment.trim() || "Трещина подтверждена визуально";

    try {
      await api.confirmDefect(event.defectDbId, comment);
      await loadDashboardData();
      setIsModalOpen(false);
    } catch (e) {
      if (
        handleAccessError(
          e,
          "Для подтверждения дефекта требуется право «Проверка дефектов»."
        )
      ) {
        return;
      }

      setError(e?.message || "Не удалось подтвердить дефект");
    }
  };

  const rejectEvent = async (event) => {
    const comment = decisionComment.trim() || "Ложное срабатывание";

    try {
      await api.rejectDefect(event.defectDbId, comment);
      await loadDashboardData();
      setIsModalOpen(false);
    } catch (e) {
      if (
        handleAccessError(
          e,
          "Для отклонения дефекта требуется право «Проверка дефектов»."
        )
      ) {
        return;
      }

      setError(e?.message || "Не удалось отклонить дефект");
    }
  };

  const openEventDetails = (event) => {
    setSelectedEvent(event);

    if (event.status === "pending") {
      setDecisionComment("");
    } else {
      setDecisionComment(event.comment || "");
    }

    setIsModalOpen(true);
  };

  const sendToMes = (event) => {
    if (!event?.defectDbId) return;

    setError("");

    setMesConfirmModal({
      isOpen: true,
      event,
      isSubmitting: false,
    });
  };

  const closeMesConfirmModal = () => {
    if (mesConfirmModal.isSubmitting) return;

    setMesConfirmModal({
      isOpen: false,
      event: null,
      isSubmitting: false,
    });
  };

  const confirmSendToMes = async () => {
    const event = mesConfirmModal.event;

    if (!event?.defectDbId) {
      closeMesConfirmModal();
      return;
    }

    setMesConfirmModal((prev) => ({
      ...prev,
      isSubmitting: true,
    }));

    setIsLoading(true);
    setError("");

    try {
      await api.sendDefectToMes(event.defectDbId);
      await loadDashboardData();

      setMesConfirmModal({
        isOpen: false,
        event: null,
        isSubmitting: false,
      });

      setIsModalOpen(false);
    } catch (e) {
      if (
        handleAccessError(
          e,
          "Для передачи дефекта в MES требуется право «Проверка дефектов»."
        )
      ) {
        setMesConfirmModal((prev) => ({
          ...prev,
          isSubmitting: false,
        }));

        return;
      }

      setError(e?.message || "Не удалось передать дефект в MES");

      setMesConfirmModal((prev) => ({
        ...prev,
        isSubmitting: false,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceClass = (confidence) => {
    if (confidence > 0.9) return "high-confidence";
    if (confidence > 0.8) return "medium-confidence";
    return "low-confidence";
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

  const getStatusBadgeClass = (status) => {
    const map = {
      pending: "warning",
      confirmed: "success",
      rejected: "muted",
      sent_to_mes: "primary",
    };

    return map[status] || "muted";
  };

  const getModalVerdictText = (event) => {
    if (!event) return "—";

    const verdict = String(event.verdict || "").toUpperCase();

    if (verdict === "CRACK" || verdict === "DEFECT") return "CRACK";
    if (verdict === "OK") return "OK";

    return event.defectType || "crack";
  };

  const getModalVerdictClass = (event) => {
    const verdict = String(event?.verdict || "").toUpperCase();

    if (verdict === "OK") return "success";
    return "danger";
  };

  const latestEvent = eventsData[0] || null;

  const processedIngots =
    shiftStats?.processed_ingots ?? shiftStatus?.processed_ingots ?? 0;

  const totalCrack = shiftStats?.total_crack ?? shiftStatus?.total_crack ?? 0;

  const totalOk = shiftStats?.total_ok ?? shiftStatus?.total_ok ?? 0;

  const defectRate =
    shiftStats?.defect_rate ?? shiftStatus?.defect_rate ?? 0;

  const currentShiftId = shiftStats?.shift_id ?? shiftStatus?.shift_id ?? null;

  const modalStyle = isModalOpen ? { display: "flex" } : { display: "none" };

  const liveFrameName =
    cameraFrame?.frame_name || cameraStatus?.current_frame_name;

  const cameraSourceIngotId =
    cameraFrame?.ingot_id || cameraStatus?.current_ingot || null;

  const analysisFrameName = analysisFrame?.frame_name || null;
  const analysisSourceIngotId = analysisFrame?.source_ingot_id || null;

  const analysisMatchesCamera = Boolean(
    liveFrameName &&
      analysisFrameName &&
      liveFrameName === analysisFrameName &&
      (!cameraSourceIngotId ||
        !analysisSourceIngotId ||
        cameraSourceIngotId === analysisSourceIngotId)
  );

  
  const visibleAnalysisFrame =
  analysisDebugEnabled && analysisMatchesCamera ? analysisFrame : null;

  const isSourceIngotId = (value) => {
    if (!value) return false;
    return /^ingot_\d+/i.test(String(value));
  };

  const displayIngotId =
    shiftStatus?.current_ingot ||
    shiftStatus?.current_system_ingot_id ||
    shiftStatus?.last_result?.ingot_id ||
    cameraSourceIngotId ||
    null;

  const safeDisplayIngotId =
    displayIngotId && !isSourceIngotId(displayIngotId)
      ? displayIngotId
      : shiftStatus?.running
      ? "Формируется..."
      : cameraSourceIngotId || "—";

  const liveFrameIndex =
    cameraFrame?.frame_index || cameraStatus?.current_frame_index;

  const livePCrack = visibleAnalysisFrame?.p_crack ?? null;

  const liveVerdict = visibleAnalysisFrame?.frame_verdict || null;

  const getLiveDetections = () => {
    if (Array.isArray(visibleAnalysisFrame?.detections)) {
      return visibleAnalysisFrame.detections;
    }

    return [];
  };

  const getSelectedEventDetections = () => {
    if (!selectedEvent) return [];

    if (
      Array.isArray(selectedEvent.detections) &&
      selectedEvent.detections.length > 0
    ) {
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
        raw.x_min !== undefined &&
        raw.y_min !== undefined &&
        raw.x_max !== undefined &&
        raw.y_max !== undefined
      ) {
        x1 = raw.x_min;
        y1 = raw.y_min;
        x2 = raw.x_max;
        y2 = raw.y_max;
      } else if (
        raw.xmin !== undefined &&
        raw.ymin !== undefined &&
        raw.xmax !== undefined &&
        raw.ymax !== undefined
      ) {
        x1 = raw.xmin;
        y1 = raw.ymin;
        x2 = raw.xmax;
        y2 = raw.ymax;
      } else if (
        raw.left !== undefined &&
        raw.top !== undefined &&
        raw.right !== undefined &&
        raw.bottom !== undefined
      ) {
        x1 = raw.left;
        y1 = raw.top;
        x2 = raw.right;
        y2 = raw.bottom;
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
      } else if (
        raw.x !== undefined &&
        raw.y !== undefined &&
        raw.w !== undefined &&
        raw.h !== undefined
      ) {
        x1 = raw.x;
        y1 = raw.y;
        x2 = raw.x + raw.w;
        y2 = raw.y + raw.h;
      }
    }

    x1 = Number(x1);
    y1 = Number(y1);
    x2 = Number(x2);
    y2 = Number(y2);

    if ([x1, y1, x2, y2].some((v) => Number.isNaN(v))) return null;

    if (x2 < x1) [x1, x2] = [x2, x1];
    if (y2 < y1) [y1, y2] = [y2, y1];

    return { x1, y1, x2, y2 };
  };

  const isDetectionModel = (modelType, architecture) => {
    const value = `${modelType || ""} ${architecture || ""}`.toLowerCase();

    return (
      value.includes("detection") ||
      value.includes("detector") ||
      value.includes("yolo")
    );
  };

  const selectedEventDetections = getSelectedEventDetections();

  const selectedEventUsesBbox =
    selectedEvent &&
    (isDetectionModel(
      selectedEvent.aiModelType,
      selectedEvent.aiModelArchitecture
    ) ||
      selectedEventDetections.length > 0);

  const getBboxStyle = (det, targetImageBox = imageBox) => {
    if (!targetImageBox) return null;

    const box = normalizeBbox(det);
    if (!box) return null;

    let { x1, y1, x2, y2 } = box;

    const maxCoord = Math.max(x1, y1, x2, y2);

    if (maxCoord <= 1) {
      x1 *= targetImageBox.naturalWidth;
      x2 *= targetImageBox.naturalWidth;
      y1 *= targetImageBox.naturalHeight;
      y2 *= targetImageBox.naturalHeight;
    }

    const scaleX = targetImageBox.width / targetImageBox.naturalWidth;
    const scaleY = targetImageBox.height / targetImageBox.naturalHeight;

    return {
      left: `${targetImageBox.offsetX + x1 * scaleX}px`,
      top: `${targetImageBox.offsetY + y1 * scaleY}px`,
      width: `${(x2 - x1) * scaleX}px`,
      height: `${(y2 - y1) * scaleY}px`,
    };
  };

  const cameraRunning = Boolean(cameraStatus?.running);
  const shiftRunning = Boolean(shiftStatus?.running);

  const liveImageUrl = cameraFrame?.frame_url
    ? resolveImageUrl(cameraFrame.frame_url)
    : cameraStatus?.current_frame_url
    ? resolveImageUrl(cameraStatus.current_frame_url)
    : latestEvent?.bestFrameUrl || null;

  const modelName = shiftStatus?.active_model_name || activeModel?.name || "—";

  const modelArchitecture =
    shiftStatus?.active_model_architecture ||
    activeModel?.architecture ||
    "—";

  const modelType =
    analysisFrame?.model_type ||
    shiftStatus?.active_model_type ||
    activeModel?.model_type ||
    "—";

  const modelMode = shiftStatus?.mode || activeModel?.default_mode || "—";

  const modelThreshold =
    shiftStatus?.threshold !== null && shiftStatus?.threshold !== undefined
      ? Number(shiftStatus.threshold).toFixed(3)
      : activeModel?.threshold !== null && activeModel?.threshold !== undefined
      ? Number(activeModel.threshold).toFixed(3)
      : activeModel?.confidence_threshold !== null &&
        activeModel?.confidence_threshold !== undefined
      ? Number(activeModel.confidence_threshold).toFixed(3)
      : "—";

  const liveBboxCount =
    visibleAnalysisFrame?.bbox_count ?? getLiveDetections().length ?? 0;

  const normalizedLiveVerdict = String(liveVerdict || "").toUpperCase();

  const liveStatusText = shiftRunning
    ? normalizedLiveVerdict === "CRACK" || normalizedLiveVerdict === "DEFECT"
      ? "DEFECT"
      : normalizedLiveVerdict === "OK"
      ? "OK"
      : "CAMERA"
    : cameraRunning
    ? "CAMERA"
    : "IDLE";

  const liveStatusClass =
    liveStatusText === "DEFECT"
      ? "danger"
      : liveStatusText === "OK"
      ? "success"
      : cameraRunning
      ? "primary"
      : "muted";

  const formatPercent = (value) => {
    if (value === null || value === undefined) return "—";
    return `${Math.round(Number(value) * 100)}%`;
  };

  const formatNumber = (value, digits = 3) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "—";
    }

    return Number(value).toFixed(digits);
  };

  const renderBboxes = (detections, targetImageBox = imageBox) =>
    detections.map((det, index) => {
      const style = getBboxStyle(det, targetImageBox);

      if (!style) return null;

      const conf =
        det.confidence ?? det.conf ?? det.score ?? det.probability ?? null;

      return (
        <div key={index} className="bbox-box" style={style}>
          <div className="bbox-label">
            crack
            {conf !== null && conf !== undefined
              ? ` ${(Number(conf) * 100).toFixed(1)}%`
              : ""}
          </div>
        </div>
      );
    });

  const getConfidenceTextClass = (confidence) => {
    const value = Number(confidence);

    if (Number.isNaN(value)) return "confidence-text-muted";
    if (value >= 0.9) return "confidence-text-high";
    if (value >= 0.8) return "confidence-text-medium";

    return "confidence-text-low";
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {accessNotice && (
          <div
            className={`dashboard-access-notice ${
              accessNotice.show ? "show" : ""
            }`}
          >
            <div>
              <strong>Недостаточно прав</strong>
              <p>{accessNotice.message}</p>
            </div>
          </div>
        )}

        <TopNav
          subtitle="Система распознавания трещин в слитках - Главный экран"
          userName={userName}
          userRole={userRole}
        />

        <div className="operator-layout">
          <section className="operator-camera-card">
            <div className="operator-card-header">
              <div>
                <h2>Live camera monitoring</h2>
                <p>Имитация видеопотока из папки stream_images</p>
              </div>

              <div className="header-badges">
                <span
                  className={`status-badge ${
                    cameraRunning ? "success" : "muted"
                  }`}
                >
                  {cameraRunning ? "CAMERA ONLINE" : "CAMERA OFFLINE"}
                </span>

                <span
                  className={`status-badge ${
                    wsConnected ? "success" : "danger"
                  }`}
                >
                  {wsConnected ? "WS CONNECTED" : "WS OFFLINE"}
                </span>
              </div>
            </div>

            <div className={`camera-frame-shell ${liveStatusClass}`}>
              {liveImageUrl ? (
                <img
                  ref={frameImgRef}
                  src={liveImageUrl}
                  alt={liveFrameName || "Кадр камеры"}
                  onLoad={updateImageBox}
                  className="camera-frame-img"
                />
              ) : (
                <div className="video-placeholder">
                  <div className="empty-camera-state">
                    <span>Кадр камеры пока недоступен</span>
                  </div>
                </div>
              )}

              {renderBboxes(getLiveDetections())}

              <div className="camera-top-overlay">
                <span className={`status-badge ${liveStatusClass}`}>
                  {liveStatusText}
                </span>

                <span className="status-badge dark">BBOX: {liveBboxCount}</span>
              </div>

              <div className="camera-bottom-overlay">
                <div>
                  <span className="overlay-label">Слиток</span>
                  <strong>{safeDisplayIngotId}</strong>
                </div>

                <div>
                  <span className="overlay-label">Кадр</span>
                  <strong>{liveFrameIndex || "—"}</strong>
                </div>

                <div>
                  <span className="overlay-label">Файл</span>
                  <strong>{liveFrameName || "—"}</strong>
                </div>

                <div>
                  <span className="overlay-label">p_crack</span>
                  <strong>{formatNumber(livePCrack)}</strong>
                </div>
              </div>
            </div>

            <div className="operator-controls">
              <div className="control-actions">
                {!cameraRunning ? (
                  <button
                    type="button"
                    className="control-btn secondary"
                    onClick={handleStartCamera}
                    disabled={isLoading}
                  >
                    Запустить камеру
                  </button>
                ) : (
                  <button
                    type="button"
                    className="control-btn secondary"
                    onClick={handleStopCamera}
                    disabled={isLoading || shiftRunning}
                  >
                    Остановить камеру
                  </button>
                )}

                {!shiftRunning ? (
                  <button
                    type="button"
                    className="control-btn"
                    onClick={handleStartShift}
                    disabled={isLoading}
                  >
                    Начать смену
                  </button>
                ) : (
                  <button
                    type="button"
                    className="control-btn danger-btn"
                    onClick={handleStopShift}
                    disabled={isLoading}
                  >
                    Остановить смену
                  </button>
                )}
              </div>
            </div>

            {error && <div className="dashboard-error">{error}</div>}
          </section>

          <aside className="operator-side-panel">
            <details className="dashboard-section status-card" open>
              <summary className="side-card-title">
                <span>Состояние системы</span>
              </summary>

              <div className="status-grid">
                <div className="status-row">
                  <span>Камера</span>
                  <strong>{cameraRunning ? "Работает" : "Остановлена"}</strong>
                </div>

                <div className="status-row">
                  <span>Смена</span>
                  <strong>
                    {shiftRunning ? "Идёт обработка" : "Не запущена"}
                  </strong>
                </div>

                <div className="status-row">
                  <span>ID смены</span>
                  <strong>{currentShiftId || "—"}</strong>
                </div>

                <div className="status-row">
                  <span>ID слитка</span>
                  <strong>{safeDisplayIngotId}</strong>
                </div>

                <div className="status-row">
                  <span>Обработано</span>
                  <strong>{processedIngots}</strong>
                </div>

                <div className="status-row">
                  <span>Очередь анализа</span>
                  <strong>{shiftStatus?.analysis_queue_size ?? "—"}</strong>
                </div>

                <div className="status-row">
                  <span>Буфер кадров</span>
                  <strong>{shiftStatus?.buffered_frames_count ?? "—"}</strong>
                </div>

                <div className="status-row">
                  <span>Сообщение</span>
                  <strong>{shiftStatus?.message || "Нет данных"}</strong>
                </div>
              </div>
            </details>
            <details className="dashboard-section status-card" open>
              <summary className="side-card-title">
                <span>Настройка камеры</span>
              </summary>

              <div className="status-grid">
                <div className="status-row">
                  <span>Заданный FPS</span>
                  <strong>{normalizeCameraFps(cameraFpsInput).toFixed(1)}</strong>
                </div>

                <div className="status-row">
                  <span>Фактический FPS</span>
                  <strong>
                    {cameraStatus?.camera_fps !== null &&
                    cameraStatus?.camera_fps !== undefined
                      ? Number(cameraStatus.camera_fps).toFixed(2)
                      : "—"}
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    color: "#b0c4de",
                    fontSize: "13px",
                  }}
                >
                  FPS камеры
                </label>

                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="60"
                  value={cameraFpsInput}
                  onChange={(e) => setCameraFpsInput(e.target.value)}
                  disabled={cameraRunning || shiftRunning || isLoading}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(60, 120, 180, 0.4)",
                    background: "rgba(20, 30, 45, 0.9)",
                    color: "#e0e0e0",
                  }}
                />

                <div style={{ marginTop: "8px", color: "#8fb4d9", fontSize: "12px" }}>
                  Задержка между кадрами рассчитывается автоматически:{" "}
                  {fpsToDelaySec(cameraFpsInput).toFixed(4)} сек.
                </div>

                <div className="control-actions" style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    className="control-btn secondary"
                    onClick={handleSaveCameraFps}
                    disabled={cameraRunning || shiftRunning || isLoading}
                  >
                    Сохранить FPS
                  </button>
                </div>

                {(cameraRunning || shiftRunning) && (
                  <div style={{ marginTop: "8px", color: "#b0c4de", fontSize: "12px" }}>
                    FPS камеры можно менять только до запуска камеры.
                  </div>
                )}
              </div>
            </details>

            <details className="dashboard-section status-card">
              <summary className="side-card-title">
                <span>Активная AI-модель</span>
              </summary>

              <div className="model-card-body">
                <div className="model-name">{modelName}</div>

                <div className="model-meta">
                  <span>{modelArchitecture}</span>
                  <span>{modelType}</span>
                  <span>{modelMode}</span>
                </div>

                <div className="status-row">
                  <span>Threshold</span>
                  <strong>{modelThreshold}</strong>
                </div>

                {activeModel?.status && (
                  <div className="status-row">
                    <span>Статус модели</span>
                    <strong>{activeModel.status}</strong>
                  </div>
                )}
              </div>
            </details>

            <details className="dashboard-section stats-card" open>
              <summary className="side-card-title">
                <span>Статистика смены</span>
              </summary>

              <div className="metrics-grid">
                <div className="metric-card">
                  <span>Обработано</span>
                  <strong>{processedIngots}</strong>
                </div>

                <div className="metric-card success">
                  <span>OK</span>
                  <strong>{totalOk}</strong>
                </div>

                <div className="metric-card danger">
                  <span>Дефектных</span>
                  <strong>{totalCrack}</strong>
                </div>

                <div className="metric-card warning">
                  <span>Доля дефектов</span>
                  <strong>{formatNumber(defectRate, 1)}%</strong>
                </div>
              </div>
            </details>

            <details className="dashboard-section events-card" open>
              <summary className="side-card-title events-title">
                <span>Последние дефекты</span>
              </summary>

              <div className="defect-feed">
                {eventsData.length === 0 ? (
                  <div className="empty-events">
                    <span>Дефектных событий пока нет</span>
                  </div>
                ) : (
                  eventsData.map((event) => (
                    <button
                      type="button"
                      key={event.defectDbId}
                      className="defect-feed-item"
                      onClick={() => openEventDetails(event)}
                    >
                      <div className="defect-feed-main">
                        <strong>{event.id}</strong>
                        <span>{event.time}</span>
                      </div>

                      <div className="defect-feed-meta">
                        <span>{event.aiModelType || "AI"}</span>
                        <span>{formatPercent(event.confidence)}</span>
                        <span>{getStatusText(event.status)}</span>
                      </div>

                      <div className="confidence-bar wide">
                        <div
                          className={`confidence-fill ${getConfidenceClass(
                            event.confidence
                          )}`}
                          style={{
                            width: `${Math.round(event.confidence * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </details>
          </aside>
        </div>

        {selectedEvent && (
          <div
            className="modal-overlay"
            style={modalStyle}
            onClick={() => setIsModalOpen(false)}
          >
            <div className="defect-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-block">
                  <h3>Детализация дефекта</h3>

                  <p>
                    {selectedEvent.id} • {selectedEvent.time}
                  </p>

                  <div className="modal-header-badges">
                    <span
                      className={`status-badge ${getModalVerdictClass(
                        selectedEvent
                      )}`}
                    >
                      {getModalVerdictText(selectedEvent)}
                    </span>

                    <span className="status-badge dark">
                      {selectedEvent.aiModelName ||
                        selectedEvent.aiModelKey ||
                        "AI-модель"}
                    </span>

                    <span
                      className={`status-badge ${getStatusBadgeClass(
                        selectedEvent.status
                      )}`}
                    >
                      {getStatusText(selectedEvent.status)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="close-modal"
                  onClick={() => setIsModalOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div className="defect-modal-body">
                <div className="defect-image-panel">
                  {selectedEvent.bestFrameUrl ? (
                    <>
                      <img
                        ref={modalImgRef}
                        src={selectedEvent.bestFrameUrl}
                        alt={`Лучший кадр ${selectedEvent.id}`}
                        onLoad={() => {
                          requestAnimationFrame(updateModalImageBox);
                        }}
                        className="defect-image"
                      />

                      {selectedEventUsesBbox &&
                        renderBboxes(selectedEventDetections, modalImageBox)}
                    </>
                  ) : (
                    <div className="empty-camera-state">
                      <span>Изображение недоступно</span>
                    </div>
                  )}
                </div>

                <div className="defect-info-panel">
                  <div className="detail-section decision-section">
                    <h4>Решение инженера</h4>

                    <div className="decision-status-card">
                      <span>Текущий статус</span>
                      <strong>{getStatusText(selectedEvent.status)}</strong>
                    </div>

                    {selectedEvent.status === "pending" && (
                      <>
                        <textarea
                          className="engineer-comment-input"
                          value={decisionComment}
                          onChange={(e) => setDecisionComment(e.target.value)}
                          placeholder="Введите комментарий инженера: например, 'Трещина подтверждена визуально'"
                        />

                        <div className="modal-actions">
                          <button
                            type="button"
                            className="control-btn"
                            onClick={() => confirmEvent(selectedEvent)}
                          >
                            Подтвердить дефект
                          </button>

                          <button
                            type="button"
                            className="control-btn secondary"
                            onClick={() => rejectEvent(selectedEvent)}
                          >
                            Отклонить
                          </button>
                        </div>
                      </>
                    )}

                    {selectedEvent.status === "confirmed" && (
                      <>
                        <p className="decision-note">
                          Дефект подтверждён инженером. Можно передать информацию
                          в MES.
                        </p>

                        <div className="modal-actions">
                          <button
                            type="button"
                            className="control-btn"
                            onClick={() => sendToMes(selectedEvent)}
                          >
                            Передать в MES
                          </button>
                        </div>
                      </>
                    )}

                    {selectedEvent.status === "sent_to_mes" && (
                      <div className="result-message success">
                        Дефект подтверждён и передан в MES
                      </div>
                    )}

                    {selectedEvent.status === "rejected" && (
                      <div className="result-message warning">
                        Срабатывание отклонено инженером
                      </div>
                    )}
                  </div>

                  <div className="detail-section">
                    <h4>AI-результат</h4>

                    <div className="detail-row">
                      <span>ID слитка</span>
                      <strong>{selectedEvent.id}</strong>
                    </div>

                    <div className="detail-row">
                      <span>Вердикт</span>
                      <strong>{getModalVerdictText(selectedEvent)}</strong>
                    </div>

                    <div className="detail-row">
                      <span>Уверенность</span>
                      <strong
                        className={getConfidenceTextClass(
                          selectedEvent.confidence
                        )}
                      >
                        {formatPercent(selectedEvent.confidence)}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>Модель</span>
                      <strong>
                        {selectedEvent.aiModelName ||
                          selectedEvent.aiModelKey ||
                          "—"}
                      </strong>
                    </div>
                  </div>

                  <details className="detail-section collapsible-detail">
                    <summary>MES</summary>

                    <div className="collapsible-detail-body">
                      <div className="detail-row">
                        <span>Статус</span>
                        <strong>
                          {selectedEvent.status === "sent_to_mes"
                            ? "Передано в MES"
                            : selectedEvent.mesStatus || "Не передано"}
                        </strong>
                      </div>

                      <div className="detail-row">
                        <span>Время передачи</span>
                        <strong>
                          {selectedEvent.sentToMesAt
                            ? selectedEvent.sentToMesAt.replace("T", " ")
                            : "—"}
                        </strong>
                      </div>

                      <div className="detail-row">
                        <span>Сообщение</span>
                        <strong>{selectedEvent.mesMessage || "—"}</strong>
                      </div>
                    </div>
                  </details>

                  <details className="detail-section technical-details">
                    <summary>Технические данные проверки</summary>

                    <div className="technical-details-body">
                      <div className="detail-row">
                        <span>max_p_crack</span>
                        <strong>{formatNumber(selectedEvent.maxPCrack)}</strong>
                      </div>

                      <div className="detail-row">
                        <span>Threshold</span>
                        <strong>{formatNumber(selectedEvent.threshold)}</strong>
                      </div>

                      <div className="detail-row">
                        <span>Кадров в слитке</span>
                        <strong>{selectedEvent.framesCount || "—"}</strong>
                      </div>

                      <div className="detail-row">
                        <span>BBOX</span>
                        <strong>{selectedEvent.bboxCount || 0}</strong>
                      </div>

                      <div className="detail-row">
                        <span>Тип модели</span>
                        <strong>{selectedEvent.aiModelType || "—"}</strong>
                      </div>

                      <div className="detail-row">
                        <span>Архитектура</span>
                        <strong>
                          {selectedEvent.aiModelArchitecture || "—"}
                        </strong>
                      </div>
                    </div>
                  </details>

                  <div className="detail-section">
                    <h4>Комментарий</h4>
                    <p className="defect-comment">
                      {selectedEvent.comment || "Комментарий пока отсутствует"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mesConfirmModal.isOpen && (
          <div className="mes-confirm-overlay" onClick={closeMesConfirmModal}>
            <div
              className="mes-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="mes-confirm-header">
                <div>
                  <h3>Передать дефект в MES?</h3>
                  <p>
                    Информация о подтверждённом дефекте будет передана во
                    внешнюю MES-систему. После передачи событие получит статус
                    «Передано в MES».
                  </p>
                </div>
              </div>

              <div className="mes-confirm-info">
                <div className="mes-confirm-row">
                  <span>ID слитка</span>
                  <strong>{mesConfirmModal.event?.id || "—"}</strong>
                </div>

                <div className="mes-confirm-row">
                  <span>Модель</span>
                  <strong>
                    {mesConfirmModal.event?.aiModelName ||
                      mesConfirmModal.event?.aiModelKey ||
                      "—"}
                  </strong>
                </div>

                <div className="mes-confirm-row">
                  <span>Уверенность</span>
                  <strong>
                    {formatPercent(mesConfirmModal.event?.confidence)}
                  </strong>
                </div>

                <div className="mes-confirm-row">
                  <span>Статус</span>
                  <strong>{getStatusText(mesConfirmModal.event?.status)}</strong>
                </div>
              </div>

              <div className="mes-confirm-actions">
                <button
                  type="button"
                  className="mes-confirm-btn secondary"
                  onClick={closeMesConfirmModal}
                  disabled={mesConfirmModal.isSubmitting}
                >
                  Отмена
                </button>

                <button
                  type="button"
                  className="mes-confirm-btn primary"
                  onClick={confirmSendToMes}
                  disabled={mesConfirmModal.isSubmitting}
                >
                  {mesConfirmModal.isSubmitting
                    ? "Передача..."
                    : "Передать в MES"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;