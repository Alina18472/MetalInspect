import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ai_panel.css";
import TopNav from "../components/TopNav";
import { api } from "../services/Api";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_CAMERA_FPS,
  getSavedCameraFps,
  saveCameraFps,
  fpsToDelaySec,
} from "../utils/cameraSettings";
const DEFAULT_MODE_KEYS = ["strict", "balanced", "sensitive"];

const STATUS_TEXT = {
  available: "Доступна",
  experimental: "Экспериментальная",
  planned: "Запланирована",
  disabled: "Отключена",
  error: "Ошибка",
};

const MODEL_TYPE_TEXT = {
  classification: "Классификация",
  detection: "Детекция",
};

const NOTICE_TITLES = {
  success: "Готово",
  info: "Информация",
  error: "Ошибка",
  access: "Недостаточно прав",
};

const NOTICE_STYLES = {
  success: {
    borderColor: "rgba(76, 175, 80, 0.45)",
    borderLeft: "4px solid #4caf50",
    background: "rgba(18, 40, 28, 0.96)",
  },
  info: {
    borderColor: "rgba(77, 171, 247, 0.45)",
    borderLeft: "4px solid #4dabf7",
    background: "rgba(18, 30, 44, 0.96)",
  },
  error: {
    borderColor: "rgba(244, 67, 54, 0.45)",
    borderLeft: "4px solid #f44336",
    background: "rgba(44, 22, 22, 0.96)",
  },
  access: {
    borderColor: "rgba(255, 193, 7, 0.45)",
    borderLeft: "4px solid #ffc107",
    background: "rgba(44, 35, 18, 0.96)",
  },
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const normalizeModeKey = (mode) => String(mode || "").trim();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const formatThreshold = (value) => {
  const numberValue = toNumberOrNull(value);
  return numberValue === null ? "—" : numberValue.toFixed(3);
};
const formatInteger = (value) => {
  const numberValue = toNumberOrNull(value);
  return numberValue === null ? "—" : String(Math.trunc(numberValue));
};
const formatClasses = (classes) => {
  if (Array.isArray(classes)) return classes.join(", ");
  if (typeof classes === "string" && classes.trim()) return classes;
  return "—";
};

const getModelStatusText = (status) => {
  const key = normalizeStatus(status);
  return STATUS_TEXT[key] || status || "Неизвестно";
};

const getModelTypeText = (type) => {
  return MODEL_TYPE_TEXT[type] || type || "—";
};

const getMetricRawValue = (metrics, keys) => {
  if (!metrics) return null;

  for (const key of keys) {
    if (metrics[key] !== undefined && metrics[key] !== null) {
      return metrics[key];
    }
  }

  return null;
};

const formatMetricValue = (value, { percent = true } = {}) => {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "number") {
    if (percent && value <= 1) {
      return `${(value * 100).toFixed(1)}%`;
    }

    if (percent && value > 1 && value <= 100) {
      return `${value.toFixed(1)}%`;
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  return String(value);
};

const getMetricProgress = (value) => {
  if (typeof value !== "number") return 0;
  if (value <= 1) return value * 100;
  if (value <= 100) return value;
  return 0;
};

const getModeKeys = (model) => {
  const result = [];

  DEFAULT_MODE_KEYS.forEach((modeKey) => {
    if (!result.includes(modeKey)) {
      result.push(modeKey);
    }
  });

  Object.keys(model?.modes || {}).forEach((modeKey) => {
    if (modeKey && !result.includes(modeKey)) {
      result.push(modeKey);
    }
  });

  const defaultMode = normalizeModeKey(model?.default_mode);

  if (defaultMode && !result.includes(defaultMode)) {
    result.unshift(defaultMode);
  }

  return result;
};

const getInitialMode = (model) => {
  const defaultMode = normalizeModeKey(model?.default_mode);
  const modeKeys = getModeKeys(model);

  if (defaultMode) return defaultMode;
  if (modeKeys.length > 0) return modeKeys[0];

  return "balanced";
};

const getModeConfig = (model, modeKey) => {
  if (!model) return {};

  const normalizedMode =
    normalizeModeKey(modeKey) ||
    normalizeModeKey(model.default_mode) ||
    "balanced";

  const rawModeValue = model.modes?.[normalizedMode];

  if (model.model_type === "detection") {
    if (
      rawModeValue &&
      typeof rawModeValue === "object" &&
      !Array.isArray(rawModeValue)
    ) {
      return {
        mode: normalizedMode,
        confidence_threshold:
          toNumberOrNull(rawModeValue.confidence_threshold) ??
          toNumberOrNull(rawModeValue.confidence) ??
          toNumberOrNull(rawModeValue.threshold) ??
          toNumberOrNull(model.confidence_threshold),
        iou_threshold:
          toNumberOrNull(rawModeValue.iou_threshold) ??
          toNumberOrNull(model.iou_threshold),
        imgsz:
          toNumberOrNull(rawModeValue.imgsz) ??
          toNumberOrNull(rawModeValue.image_size) ??
          toNumberOrNull(rawModeValue.input_size),
        max_det:
          toNumberOrNull(rawModeValue.max_det) ??
          toNumberOrNull(rawModeValue.max_detections),
      };
    }

    return {
      mode: normalizedMode,
      confidence_threshold:
        toNumberOrNull(rawModeValue) ??
        toNumberOrNull(model.confidence_threshold),
      iou_threshold: toNumberOrNull(model.iou_threshold),
      imgsz: null,
      max_det: null,
    };
  }

  if (
    rawModeValue &&
    typeof rawModeValue === "object" &&
    !Array.isArray(rawModeValue)
  ) {
    return {
      mode: normalizedMode,
      threshold:
        toNumberOrNull(rawModeValue.threshold) ??
        toNumberOrNull(rawModeValue.confidence_threshold) ??
        toNumberOrNull(model.threshold),
    };
  }

  return {
    mode: normalizedMode,
    threshold:
      toNumberOrNull(rawModeValue) ??
      toNumberOrNull(model.threshold),
  };
};
const getModeOptionText = (model, modeKey) => {
  const config = getModeConfig(model, modeKey);

  if (model?.model_type === "detection") {
    const imgszText =
      config.imgsz !== null && config.imgsz !== undefined
        ? `, imgsz=${formatInteger(config.imgsz)}`
        : "";
  
    const maxDetText =
      config.max_det !== null && config.max_det !== undefined
        ? `, max_det=${formatInteger(config.max_det)}`
        : "";
  
    return `${modeKey} — conf=${formatThreshold(
      config.confidence_threshold
    )}, iou=${formatThreshold(config.iou_threshold)}${imgszText}${maxDetText}`;
  }

  return `${modeKey} — threshold=${formatThreshold(config.threshold)}`;
};



const ensureProbability = (value, fieldName) => {
  const numberValue = toNumberOrNull(value);

  if (numberValue === null) {
    throw new Error(`Для выбранного режима не задано значение "${fieldName}"`);
  }

  if (numberValue <= 0 || numberValue >= 1) {
    throw new Error(`Значение "${fieldName}" должно быть в диапазоне от 0.001 до 0.999`);
  }

  return numberValue;
};
const ensureIntegerInRange = (value, fieldName, min, max) => {
  if (value === "" || value === null || value === undefined) {
    throw new Error(`Для поля "${fieldName}" нужно указать целое число`);
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    throw new Error(`Поле "${fieldName}" должно быть целым числом`);
  }

  if (numberValue < min || numberValue > max) {
    throw new Error(
      `Поле "${fieldName}" должно быть в диапазоне от ${min} до ${max}`
    );
  }

  return numberValue;
};
const buildModesFromCreateForm = (createForm) => {
  if (createForm.model_type === "classification") {
    return {
      strict: {
        threshold: ensureProbability(
          createForm.classification_modes.strict,
          "strict threshold"
        ),
      },
      balanced: {
        threshold: ensureProbability(
          createForm.classification_modes.balanced,
          "balanced threshold"
        ),
      },
      sensitive: {
        threshold: ensureProbability(
          createForm.classification_modes.sensitive,
          "sensitive threshold"
        ),
      },
    };
  }

  return {
    strict: {
      confidence_threshold: ensureProbability(
        createForm.detection_modes.strict.confidence_threshold,
        "strict confidence threshold"
      ),
      iou_threshold: ensureProbability(
        createForm.detection_modes.strict.iou_threshold,
        "strict IoU threshold"
      ),
    },
    balanced: {
      confidence_threshold: ensureProbability(
        createForm.detection_modes.balanced.confidence_threshold,
        "balanced confidence threshold"
      ),
      iou_threshold: ensureProbability(
        createForm.detection_modes.balanced.iou_threshold,
        "balanced IoU threshold"
      ),
    },
    sensitive: {
      confidence_threshold: ensureProbability(
        createForm.detection_modes.sensitive.confidence_threshold,
        "sensitive confidence threshold"
      ),
      iou_threshold: ensureProbability(
        createForm.detection_modes.sensitive.iou_threshold,
        "sensitive IoU threshold"
      ),
    },
  };
};
const valueForInput = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};
const getSelectedModelPerformance = (model) => {
  const performance = model?.metrics?.performance;

  if (!performance) return [];

  return [
    {
      label: "FPS камеры при тесте",
      value: performance.measured_camera_fps,
      digits: 2,
      suffix: " FPS",
    },
    {
      label: "FPS анализа при тесте",
      value: performance.measured_analysis_fps,
      digits: 2,
      suffix: " FPS",
    },
   
    {
      label: "Тестовый режим",
      value: performance.tested_mode,
      text: true,
    },
  ];
};

const formatPerformanceValue = (item) => {
  if (!item) return "—";

  if (item.text) {
    return item.value || "—";
  }

  if (item.value === null || item.value === undefined || item.value === "") {
    return "—";
  }

  const numberValue = Number(item.value);

  if (Number.isNaN(numberValue)) {
    return "—";
  }

  const digits = item.digits ?? 2;
  const suffix = item.suffix ?? "";

  return `${numberValue.toFixed(digits)}${suffix}`;
};
const classesToInput = (classes) => {
  if (Array.isArray(classes)) return classes.join(", ");
  if (typeof classes === "string") return classes;
  return "";
};

const createEditFormFromModel = (model) => {
  if (!model) return null;

  return {
    model_key: model.model_key || "",
    name: model.name || "",
    model_type: model.model_type || "classification",
    architecture: model.architecture || "",
    weights_path: model.weights_path || "",
    classes: classesToInput(model.classes),
    status: model.status || "available",
    default_mode: model.default_mode || getInitialMode(model),
    description: model.description || "",

    classification_modes: {
      strict: valueForInput(getModeConfig(model, "strict").threshold),
      balanced: valueForInput(getModeConfig(model, "balanced").threshold),
      sensitive: valueForInput(getModeConfig(model, "sensitive").threshold),
    },

    detection_modes: {
      strict: {
        confidence_threshold: valueForInput(
          getModeConfig(model, "strict").confidence_threshold
        ),
        iou_threshold: valueForInput(
          getModeConfig(model, "strict").iou_threshold
        ),
        imgsz: valueForInput(getModeConfig(model, "strict").imgsz),
        max_det: valueForInput(getModeConfig(model, "strict").max_det),
      },
      balanced: {
        confidence_threshold: valueForInput(
          getModeConfig(model, "balanced").confidence_threshold
        ),
        iou_threshold: valueForInput(
          getModeConfig(model, "balanced").iou_threshold
        ),
        imgsz: valueForInput(getModeConfig(model, "balanced").imgsz),
        max_det: valueForInput(getModeConfig(model, "balanced").max_det),
      },
      sensitive: {
        confidence_threshold: valueForInput(
          getModeConfig(model, "sensitive").confidence_threshold
        ),
        iou_threshold: valueForInput(
          getModeConfig(model, "sensitive").iou_threshold
        ),
        imgsz: valueForInput(getModeConfig(model, "sensitive").imgsz),
        max_det: valueForInput(getModeConfig(model, "sensitive").max_det),
      },
    },
  };
};
const getClassificationMetricMode = (model, currentMode) => {
  if (!model?.metrics?.by_mode) return null;

  const byMode = model.metrics.by_mode;

  const preferredMode =
    currentMode ||
    model.default_mode ||
    model.metrics.default_mode ||
    "balanced";

  if (byMode[preferredMode]) {
    return preferredMode;
  }

  if (model.default_mode && byMode[model.default_mode]) {
    return model.default_mode;
  }

  const firstMode = Object.keys(byMode)[0];
  return firstMode || null;
};

const getSelectedModelMetrics = (model, currentMode) => {
  if (!model || !model.metrics) return [];

  const metrics = model.metrics;

  if (model.model_type === "detection") {

    const metricMode =
      currentMode ||
      model.default_mode ||
      "balanced";
  
    const modeMetrics =
      metrics.by_mode?.[metricMode] || metrics;
  
    return [
      {
        label: "Confidence threshold",
        value: getMetricRawValue(modeMetrics, [
          "confidence_threshold",
        ]),
        percent: false,
      },
      {
        label: "IoU threshold",
        value: getMetricRawValue(modeMetrics, [
          "iou_threshold",
        ]),
        percent: false,
      },
      {
        label: "Precision",
        value: getMetricRawValue(modeMetrics, [
          "precision",
        ]),
        percent: true,
      },
      {
        label: "Recall",
        value: getMetricRawValue(modeMetrics, [
          "recall",
        ]),
        percent: true,
      },
      {
        label: "mAP@50",
        value: getMetricRawValue(modeMetrics, [
          "map50",
          "mAP50",
          "map_50",
        ]),
        percent: true,
      },
      {
        label: "mAP@50-95",
        value: getMetricRawValue(modeMetrics, [
          "map50_95",
          "mAP50_95",
          "map",
        ]),
        percent: true,
      },
    ];
  }

  const metricMode = getClassificationMetricMode(model, currentMode);
  const modeMetrics =
    metricMode && metrics.by_mode ? metrics.by_mode[metricMode] : metrics;

  return [
    {
      label: "Threshold",
      value: getMetricRawValue(modeMetrics, ["threshold"]),
      percent: false,
    },
    {
      label: "Recall crack",
      value: getMetricRawValue(modeMetrics, ["recall_crack", "recall"]),
      percent: true,
    },
    {
      label: "Precision",
      value: getMetricRawValue(modeMetrics, ["precision"]),
      percent: true,
    },
    {
      label: "F1-score",
      value: getMetricRawValue(modeMetrics, ["f1", "f1_score"]),
      percent: true,
    },
    {
      label: "False Negative",
      value: getMetricRawValue(modeMetrics, ["fn", "false_negative"]),
      percent: false,
    },
    {
      label: "False Positive",
      value: getMetricRawValue(modeMetrics, ["fp", "false_positive"]),
      percent: false,
    },
  ];
};

const hasAnyMetricValue = (metricItems) => {
  return metricItems.some(
    (item) =>
      item.value !== null &&
      item.value !== undefined &&
      item.value !== ""
  );
};

const FloatingNotice = ({ notice, offset = 0 }) => {
  if (!notice) return null;

  const type = notice.type || "info";
  const style = {
    ...(NOTICE_STYLES[type] || NOTICE_STYLES.info),
    top: offset ? `calc(96px + ${offset}px)` : undefined,
  };

  return (
    <div
      className={`ai-panel-access-notice ai-panel-floating-notice ${type} ${
        notice.show ? "show" : ""
      }`}
      style={style}
    >
      <div>
        <strong>{notice.title || NOTICE_TITLES[type] || "Сообщение"}</strong>
        <p>{notice.message}</p>
      </div>
    </div>
  );
};

const AiPanel = () => {
  const { user, hasPermission } = useAuth();

  const [models, setModels] = useState([]);
  const [activeRuntime, setActiveRuntime] = useState(null);

  const [selectedModelId, setSelectedModelId] = useState(null);
  const [selectedMode, setSelectedMode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState("");

  const [accessNotice, setAccessNotice] = useState(null);
  const accessNoticeTimerRef = useRef(null);
  const notificationTimerRef = useRef(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [cameraFpsInput, setCameraFpsInput] = useState(() =>
    String(getSavedCameraFps())
  );
  const [createForm, setCreateForm] = useState({
    model_key: "",
    name: "",
    model_type: "classification",
    architecture: "ResNet18",
    weights_path: "./models_ml/best_weighted.pt",
    classes: "crack, ok",
    status: "available",
    default_mode: "balanced",

    classification_modes: {
      strict: "0.650",
      balanced: "0.465",
      sensitive: "0.350",
    },

    detection_modes: {
      strict: {
        confidence_threshold: "0.35",
        iou_threshold: "0.45",
       
      },
      balanced: {
        confidence_threshold: "0.25",
        iou_threshold: "0.45",
        
      },
      sensitive: {
        confidence_threshold: "0.15",
        iou_threshold: "0.45",
       
      },
    },

    description: "",
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Подтвердить",
    cancelText: "Отмена",
    type: "primary",
    onConfirm: null,
  });

  const canManageAiModels =
    typeof hasPermission === "function"
      ? hasPermission("ai_models.manage")
      : false;

  const profile = useMemo(() => {
    const last = user?.last_name || "";
    const first = user?.first_name || "";
    const patronymic = user?.patronymic || "";

    const name =
      `${last} ${first} ${patronymic}`.trim() ||
      user?.email ||
      "Пользователь";

    const role =
      user?.role_name ||
      user?.role?.name ||
      (Number(user?.role_id) === 1 ? "Администратор" : "Инженер");

    return {
      name,
      role,
    };
  }, [user]);

  const showNotification = (message, type = "info") => {
    setNotification({
      message,
      type,
      title: NOTICE_TITLES[type] || "Сообщение",
      show: true,
    });

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : null));

      setTimeout(() => {
        setNotification(null);
      }, 250);
    }, 2800);
  };
  
  const showAccessNotice = (message) => {
    setAccessNotice({
      message,
      type: "access",
      title: "Недостаточно прав",
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
  };

  const handleAccessError = (e, fallbackMessage) => {
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
  };

  const requireManagePermission = (message) => {
    if (canManageAiModels) return true;

    showAccessNotice(message);
    return false;
  };
  const handleSaveCameraFps = () => {
    if (!requireManagePermission("У вас нет права на изменение настроек камеры.")) {
      return;
    }
  
    const fps = saveCameraFps(cameraFpsInput);
    setCameraFpsInput(String(fps));
  
    showNotification(
      `Скорость камеры сохранена: ${fps} FPS. Задержка между кадрами: ${fpsToDelaySec(fps).toFixed(3)} сек.`,
      "success"
    );
  };

  const openConfirmModal = ({
    title,
    message,
    confirmText = "Подтвердить",
    cancelText = "Отмена",
    type = "primary",
    onConfirm,
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({
      ...prev,
      isOpen: false,
      onConfirm: null,
    }));
  };

  const handleConfirmModalConfirm = async () => {
    const action = confirmModal.onConfirm;

    closeConfirmModal();

    if (typeof action === "function") {
      await action();
    }
  };

  const handleSelectModel = (model) => {
    const mode = getInitialMode(model);
  
    setSelectedModelId(model.id);
    setSelectedMode(mode);
    setEditStatus(model.status || "available");
    setEditDescription(model.description || "");
    setEditForm(createEditFormFromModel(model));
  };

  const loadAiPanel = async ({
    preferredModelId = null,
    keepSelected = false,
  } = {}) => {
    setIsLoading(true);
    setError("");

    try {
      const modelsData = await api.getAiModels();

      let runtimeData = null;

      try {
        runtimeData = await api.getActiveAiModelRuntime();
      } catch (runtimeError) {
        console.warn("Runtime активной модели недоступен:", runtimeError);
      }

      const loadedModels = Array.isArray(modelsData) ? modelsData : [];

      setModels(loadedModels);
      setActiveRuntime(runtimeData || null);

      let modelToSelect = null;

      if (preferredModelId) {
        modelToSelect = loadedModels.find(
          (m) => Number(m.id) === Number(preferredModelId)
        );
      }

      if (!modelToSelect && keepSelected && selectedModelId) {
        modelToSelect = loadedModels.find(
          (m) => Number(m.id) === Number(selectedModelId)
        );
      }

      if (!modelToSelect) {
        modelToSelect = loadedModels.find((m) => m.is_active);
      }

      if (!modelToSelect && loadedModels.length > 0) {
        modelToSelect = loadedModels[0];
      }

      if (modelToSelect) {
        handleSelectModel(modelToSelect);
      }
    } catch (e) {
      if (handleAccessError(e, "У вас нет прав на просмотр AI-моделей.")) {
        return;
      }

      setError(e?.message || "Не удалось загрузить данные AI-панели");
      showNotification(
        e?.message || "Не удалось загрузить данные AI-панели",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.body.classList.add("ai-panel-page");

    return () => {
      document.body.classList.remove("ai-panel-page");

      if (accessNoticeTimerRef.current) {
        clearTimeout(accessNoticeTimerRef.current);
      }

      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadAiPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateFormChange = (field, value) => {
    setCreateForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === "model_type") {
        if (value === "classification") {
          next.architecture = "ResNet18";
          next.classes = "crack, ok";
          next.default_mode = "balanced";
          next.status = "available";
          next.weights_path = "./models_ml/best_weighted.pt";
        }

        if (value === "detection") {
          next.architecture = "YOLOv8";
          next.classes = "crack";
          next.default_mode = "balanced";
          next.status = "experimental";
          next.weights_path = "./models_ml/yolov8_crack.pt";
          next.detection_modes = {
            strict: {
              confidence_threshold: "0.35",
              iou_threshold: "0.45",
           
            },
            balanced: {
              confidence_threshold: "0.25",
              iou_threshold: "0.45",
             
            },
            sensitive: {
              confidence_threshold: "0.15",
              iou_threshold: "0.45",
           
            },
          };
        }
      }

      return next;
    });
  };

  const handleClassificationModeChange = (modeKey, value) => {
    setCreateForm((prev) => ({
      ...prev,
      classification_modes: {
        ...prev.classification_modes,
        [modeKey]: value,
      },
    }));
  };

  const handleDetectionModeChange = (modeKey, field, value) => {
    setCreateForm((prev) => ({
      ...prev,
      detection_modes: {
        ...prev.detection_modes,
        [modeKey]: {
          ...prev.detection_modes[modeKey],
          [field]: value,
        },
      },
    }));
  };
  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => {
      if (!prev) return prev;
  
      const next = {
        ...prev,
        [field]: value,
      };
  
      if (field === "model_type") {
        if (value === "classification") {
          next.classes = next.classes || "crack, ok";
          next.default_mode = next.default_mode || "balanced";
          next.classification_modes = {
            strict: next.classification_modes?.strict || "0.650",
            balanced: next.classification_modes?.balanced || "0.465",
            sensitive: next.classification_modes?.sensitive || "0.350",
          };
        }
  
        if (value === "detection") {
          next.classes = next.classes || "crack";
          next.default_mode = next.default_mode || "sensitive";
          next.detection_modes = next.detection_modes || {
            strict: {
              confidence_threshold: "0.350",
              iou_threshold: "0.450",
              imgsz: "416",
              max_det: "5",
            },
            balanced: {
              confidence_threshold: "0.250",
              iou_threshold: "0.450",
              imgsz: "416",
              max_det: "5",
            },
            sensitive: {
              confidence_threshold: "0.150",
              iou_threshold: "0.450",
              imgsz: "416",
              max_det: "5",
            },
          };
        }
      }
  
      return next;
    });
  };
  
  const handleEditClassificationModeChange = (modeKey, value) => {
    setEditForm((prev) => {
      if (!prev) return prev;
  
      return {
        ...prev,
        classification_modes: {
          ...prev.classification_modes,
          [modeKey]: value,
        },
      };
    });
  };
  
  const handleEditDetectionModeChange = (modeKey, field, value) => {
    setEditForm((prev) => {
      if (!prev) return prev;
  
      return {
        ...prev,
        detection_modes: {
          ...prev.detection_modes,
          [modeKey]: {
            ...prev.detection_modes[modeKey],
            [field]: value,
          },
        },
      };
    });
  };
  const handleCreateModel = async () => {
    if (!requireManagePermission("У вас нет права на создание AI-моделей.")) {
      return;
    }

    setError("");

    try {
      const modelKey = createForm.model_key.trim();
      const name = createForm.name.trim();
      const architecture = createForm.architecture.trim();
      const weightsPath = createForm.weights_path.trim();

      if (!modelKey) {
        showNotification("Укажите model_key", "info");
        return;
      }

      if (!name) {
        showNotification("Укажите название модели", "info");
        return;
      }

      if (!architecture) {
        showNotification("Укажите архитектуру модели", "info");
        return;
      }

      if (
        !weightsPath &&
        ["available", "experimental"].includes(createForm.status)
      ) {
        showNotification(
          "Для модели со статусом available или experimental нужно указать путь к весам",
          "info"
        );
        return;
      }

      const classes = createForm.classes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const generatedModes = buildModesFromCreateForm(createForm);
      const defaultMode = createForm.default_mode || "balanced";

      const defaultConfig = getModeConfig(
        {
          model_type: createForm.model_type,
          default_mode: defaultMode,
          modes: generatedModes,
        },
        defaultMode
      );

      const payload = {
        model_key: modelKey,
        name,
        model_type: createForm.model_type,
        architecture,
        weights_path: weightsPath || null,
        classes: classes.length > 0 ? classes : null,
        status: createForm.status,
        default_mode: defaultMode,
        modes: generatedModes,
        metrics: null,
        description: createForm.description.trim() || null,
      };

      if (createForm.model_type === "classification") {
        payload.threshold = ensureProbability(
          defaultConfig.threshold,
          "threshold выбранного режима"
        );
        payload.confidence_threshold = null;
        payload.iou_threshold = null;
      }

      if (createForm.model_type === "detection") {
        payload.threshold = null;
        payload.confidence_threshold = ensureProbability(
          defaultConfig.confidence_threshold,
          "confidence threshold выбранного режима"
        );
        payload.iou_threshold = ensureProbability(
          defaultConfig.iou_threshold,
          "IoU threshold выбранного режима"
        );
      }

      setIsLoading(true);

      const createdModel = await api.createAiModel(payload);

      await loadAiPanel({ preferredModelId: createdModel?.id });

      setShowCreateForm(false);
      showNotification(`Модель "${createdModel?.name || name}" добавлена`, "success");
    } catch (e) {
      if (handleAccessError(e, "У вас нет права на создание AI-моделей.")) {
        return;
      }

      const message = e?.message || "Не удалось создать модель";
      setError(message);
      showNotification(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateModel = async () => {
    if (!requireManagePermission("У вас нет права на активацию AI-моделей.")) {
      return;
    }

    const selectedModel = models.find(
      (m) => Number(m.id) === Number(selectedModelId)
    );

    if (!selectedModel) {
      showNotification("Сначала выберите модель", "info");
      return;
    }

    const status = normalizeStatus(selectedModel.status);

    if (["disabled", "error", "planned"].includes(status)) {
      showNotification(
        `Модель нельзя активировать. Текущий статус: ${getModelStatusText(
          selectedModel.status
        )}`,
        "info"
      );
      return;
    }

    openConfirmModal({
      title: "Активировать AI-модель?",
      message: `Модель «${selectedModel.name}» станет активной. Новые смены будут использовать именно эту модель и её текущий режим.`,
      confirmText: "Активировать",
      cancelText: "Отмена",
      type: "primary",
      onConfirm: async () => {
        setIsLoading(true);
        setError("");

        try {
          await api.activateAiModel(selectedModel.id);
          await loadAiPanel({ preferredModelId: selectedModel.id });
          showNotification(`Модель «${selectedModel.name}» активирована`, "success");
        } catch (e) {
          if (handleAccessError(e, "У вас нет права на активацию AI-моделей.")) {
            return;
          }

          const message = e?.message || "Не удалось активировать модель";
          setError(message);
          showNotification(message, "error");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleSaveSettings = async () => {
    if (
      !requireManagePermission(
        "У вас нет права на изменение настроек AI-моделей."
      )
    ) {
      return;
    }
  
    const selectedModel = models.find(
      (m) => Number(m.id) === Number(selectedModelId)
    );
  
    if (!selectedModel) {
      showNotification("Сначала выберите модель", "info");
      return;
    }
  
    if (!editForm) {
      showNotification("Форма редактирования не заполнена", "info");
      return;
    }
  
    if (
      selectedModel.is_active &&
      ["planned", "disabled", "error"].includes(normalizeStatus(editForm.status))
    ) {
      showNotification(
        "Активную модель нельзя отключить. Сначала активируйте другую модель.",
        "info"
      );
      return;
    }
  
    setError("");
  
    try {
      const modelKey = editForm.model_key.trim();
      const name = editForm.name.trim();
      const architecture = editForm.architecture.trim();
      const weightsPath = editForm.weights_path.trim();
  
      if (!modelKey) {
        showNotification("Укажите model_key", "info");
        return;
      }
  
      if (!name) {
        showNotification("Укажите название модели", "info");
        return;
      }
  
      if (!architecture) {
        showNotification("Укажите архитектуру модели", "info");
        return;
      }
  
      if (
        !weightsPath &&
        ["available", "experimental"].includes(editForm.status)
      ) {
        showNotification(
          "Для модели со статусом available или experimental нужно указать путь к весам",
          "info"
        );
        return;
      }
  
      const classes = editForm.classes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  
      const generatedModes = buildModesFromCreateForm(editForm);
      const defaultMode = editForm.default_mode || "balanced";
  
      const defaultConfig = getModeConfig(
        {
          model_type: editForm.model_type,
          default_mode: defaultMode,
          modes: generatedModes,
        },
        defaultMode
      );
  
      const payload = {
        model_key: modelKey,
        name,
        model_type: editForm.model_type,
        architecture,
        weights_path: weightsPath || null,
        classes: classes.length > 0 ? classes : null,
        status: editForm.status,
        default_mode: defaultMode,
        modes: generatedModes,
        description: editForm.description.trim() || null,
      };
  
      if (editForm.model_type === "classification") {
        payload.threshold = ensureProbability(
          defaultConfig.threshold,
          "threshold выбранного режима"
        );
        payload.confidence_threshold = null;
        payload.iou_threshold = null;
      }
  
      if (editForm.model_type === "detection") {
        payload.threshold = null;
        payload.confidence_threshold = ensureProbability(
          defaultConfig.confidence_threshold,
          "confidence threshold выбранного режима"
        );
        payload.iou_threshold = ensureProbability(
          defaultConfig.iou_threshold,
          "IoU threshold выбранного режима"
        );
      }
  
      setIsLoading(true);
  
      const updatedModel = await api.updateAiModel(selectedModel.id, payload);
  
      await loadAiPanel({
        preferredModelId: updatedModel?.id || selectedModel.id,
      });
  
      showNotification("Модель сохранена", "success");
    } catch (e) {
      if (
        handleAccessError(
          e,
          "У вас нет права на изменение настроек AI-моделей."
        )
      ) {
        return;
      }
  
      const message = e?.message || "Не удалось сохранить модель";
      setError(message);
      showNotification(message, "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteModel = async () => {
    if (!requireManagePermission("У вас нет права на удаление AI-моделей.")) {
      return;
    }
  
    const selectedModel = models.find(
      (m) => Number(m.id) === Number(selectedModelId)
    );
  
    if (!selectedModel) {
      showNotification("Сначала выберите модель", "info");
      return;
    }
  
    if (selectedModel.is_active) {
      showNotification(
        "Нельзя удалить активную модель. Сначала активируйте другую модель.",
        "info"
      );
      return;
    }
  
    openConfirmModal({
      title: "Удалить AI-модель?",
      message: `Модель «${selectedModel.name}» будет удалена из реестра. Если она уже использовалась в проверках, backend не позволит её удалить.`,
      confirmText: "Удалить",
      cancelText: "Отмена",
      type: "danger",
      onConfirm: async () => {
        setIsLoading(true);
        setError("");
  
        try {
          await api.deleteAiModel(selectedModel.id);
  
          setSelectedModelId(null);
          setSelectedMode("");
          setEditForm(null);
  
          await loadAiPanel();
  
          showNotification(`Модель «${selectedModel.name}» удалена`, "success");
        } catch (e) {
          if (handleAccessError(e, "У вас нет права на удаление AI-моделей.")) {
            return;
          }
  
          const message = e?.message || "Не удалось удалить модель";
          setError(message);
          showNotification(message, "error");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const selectedModel = models.find(
    (m) => Number(m.id) === Number(selectedModelId)
  );

  const activeModel = models.find((m) => m.is_active);

  const totalModels = models.length;
  const availableCount = models.filter(
    (m) => normalizeStatus(m.status) === "available"
  ).length;
  const experimentalCount = models.filter(
    (m) => normalizeStatus(m.status) === "experimental"
  ).length;
  const disabledCount = models.filter((m) =>
    ["disabled", "error", "planned"].includes(normalizeStatus(m.status))
  ).length;

  const modeKeys = selectedModel ? getModeKeys(selectedModel) : [];

  const selectedMetricItems = getSelectedModelMetrics(selectedModel, selectedMode);
  const hasMetrics = hasAnyMetricValue(selectedMetricItems);
  const selectedPerformanceItems = getSelectedModelPerformance(selectedModel);
  const hasPerformance = hasAnyMetricValue(selectedPerformanceItems);
  const classificationMetricMode = getClassificationMetricMode(
    selectedModel,
    selectedMode
  );

  const notificationOffset = notification && accessNotice ? 96 : 0;

  return (
    <div className="container">
      <TopNav
        subtitle="Система распознавания трещин в слитках - Модели"
        userName={profile.name}
        // userRole={profile.role}
        userRole="Контроль качества"
      />

      <FloatingNotice notice={notification} />
      <FloatingNotice notice={accessNotice} offset={notificationOffset} />

      {error && <div className="ai-panel-page-error">{error}</div>}

      <div className="main-content">
        <div className="ai-summary-grid">
          <div className="ai-summary-card">
            <div>
              <div className="ai-summary-value">{totalModels}</div>
              <div className="ai-summary-label">Всего моделей</div>
            </div>
          </div>

          <div className="ai-summary-card">
            <div>
              <div className="ai-summary-value">
                {activeModel?.architecture || "—"}
              </div>
              <div className="ai-summary-label">
                Активная модель: {activeModel?.name || "не выбрана"}
              </div>
            </div>
          </div>

          <div className="ai-summary-card">
            <div>
              <div className="ai-summary-value">{availableCount}</div>
              <div className="ai-summary-label">Доступные модели</div>
            </div>
          </div>

          <div className="ai-summary-card">
            <div>
              <div className="ai-summary-value">{experimentalCount}</div>
              <div className="ai-summary-label">
                Экспериментальные: {experimentalCount} / Неактивные: {disabledCount}
              </div>
            </div>
          </div>
        </div>

        <div className="ai-monitoring-panel">
          <div className="charts-panel">
            <div className="monitoring-panel">
              <div className="panel-header">
                <h2>Реестр AI-моделей</h2>

                <div className="controls">
                  <button
                    className="action-btn2 secondary"
                    onClick={() => {
                      if (
                        !requireManagePermission(
                          "У вас нет права на добавление AI-моделей."
                        )
                      ) {
                        return;
                      }

                      setShowCreateForm((prev) => !prev);
                    }}
                  >
                    {showCreateForm ? "Скрыть форму" : "Добавить модель"}
                  </button>

                  <button
                    className="action-btn2 secondary"
                    onClick={() => loadAiPanel({ keepSelected: true })}
                  >
                    Обновить
                  </button>
                </div>
              </div>

              <div className="panel-content">
                {showCreateForm && canManageAiModels && (
                  <div className="ai-create-model-form">
                    <div className="ai-create-model-title">
                      Добавление новой AI-модели
                    </div>

                    <div className="ai-create-model-grid">
                      <div>
                        <label style={labelStyle}>Название модели</label>
                        <input
                          value={createForm.name}
                          onChange={(e) =>
                            handleCreateFormChange("name", e.target.value)
                          }
                          placeholder="ResNet18 crack/ok classifier v2"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>model_key</label>
                        <input
                          value={createForm.model_key}
                          onChange={(e) =>
                            handleCreateFormChange("model_key", e.target.value)
                          }
                          placeholder="resnet18_crack_ok_v2"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Тип модели</label>
                        <select
                          value={createForm.model_type}
                          onChange={(e) =>
                            handleCreateFormChange("model_type", e.target.value)
                          }
                          style={inputStyle}
                        >
                          <option value="classification">classification</option>
                          <option value="detection">detection</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Архитектура</label>
                        <input
                          value={createForm.architecture}
                          onChange={(e) =>
                            handleCreateFormChange("architecture", e.target.value)
                          }
                          placeholder="ResNet18 / YOLOv8"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Путь к весам</label>
                        <input
                          value={createForm.weights_path}
                          onChange={(e) =>
                            handleCreateFormChange("weights_path", e.target.value)
                          }
                          placeholder="./models_ml/best_weighted.pt"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Классы</label>
                        <input
                          value={createForm.classes}
                          onChange={(e) =>
                            handleCreateFormChange("classes", e.target.value)
                          }
                          placeholder="crack, ok"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Статус</label>
                        <select
                          value={createForm.status}
                          onChange={(e) =>
                            handleCreateFormChange("status", e.target.value)
                          }
                          style={inputStyle}
                        >
                          <option value="available">available</option>
                          <option value="experimental">experimental</option>
                          <option value="planned">planned</option>
                          <option value="disabled">disabled</option>
                          <option value="error">error</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Рабочий режим</label>
                        <select
                          value={createForm.default_mode}
                          onChange={(e) =>
                            handleCreateFormChange("default_mode", e.target.value)
                          }
                          style={inputStyle}
                        >
                          <option value="strict">strict</option>
                          <option value="balanced">balanced</option>
                          <option value="sensitive">sensitive</option>
                        </select>
                      </div>
                    </div>

                    {createForm.model_type === "classification" && (
                      <div className="ai-create-model-mode-section">
                        <div className="ai-create-model-title">
                          Threshold по режимам классификации
                        </div>

                        <div className="ai-create-model-grid">
                          <div>
                            <label style={labelStyle}>Strict threshold</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="0.999"
                              value={createForm.classification_modes.strict}
                              onChange={(e) =>
                                handleClassificationModeChange(
                                  "strict",
                                  e.target.value
                                )
                              }
                              placeholder="например 0.650"
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Balanced threshold</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="0.999"
                              value={createForm.classification_modes.balanced}
                              onChange={(e) =>
                                handleClassificationModeChange(
                                  "balanced",
                                  e.target.value
                                )
                              }
                              placeholder="например 0.465"
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Sensitive threshold</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="0.999"
                              value={createForm.classification_modes.sensitive}
                              onChange={(e) =>
                                handleClassificationModeChange(
                                  "sensitive",
                                  e.target.value
                                )
                              }
                              placeholder="например 0.350"
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {createForm.model_type === "detection" && (
                      <div className="ai-create-model-mode-section">
                        <div className="ai-create-model-title">
                          Confidence / IoU по режимам детекции
                        </div>

                        <div className="ai-create-model-grid">
                          {DEFAULT_MODE_KEYS.map((modeKey) => (
                            <React.Fragment key={modeKey}>
                              <div>
                                <label style={labelStyle}>
                                  {modeKey} confidence threshold
                                </label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  max="0.999"
                                  value={
                                    createForm.detection_modes[modeKey]
                                      .confidence_threshold
                                  }
                                  onChange={(e) =>
                                    handleDetectionModeChange(
                                      modeKey,
                                      "confidence_threshold",
                                      e.target.value
                                    )
                                  }
                                  placeholder={
                                    modeKey === "balanced"
                                      ? "например 0.050"
                                      : modeKey === "strict"
                                      ? "например 0.400"
                                      : "например 0.030"
                                  }
                                  style={inputStyle}
                                />
                              </div>

                              <div>
                                <label style={labelStyle}>
                                  {modeKey} IoU threshold
                                </label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  max="0.999"
                                  value={
                                    createForm.detection_modes[modeKey]
                                      .iou_threshold
                                  }
                                  onChange={(e) =>
                                    handleDetectionModeChange(
                                      modeKey,
                                      "iou_threshold",
                                      e.target.value
                                    )
                                  }
                                  placeholder="например 0.450"
                                  style={inputStyle}
                                />
                              </div>
                              
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="ai-create-model-description">
                      <label style={labelStyle}>Описание</label>
                      <textarea
                        value={createForm.description}
                        onChange={(e) =>
                          handleCreateFormChange("description", e.target.value)
                        }
                        rows={3}
                        placeholder="Описание назначения модели..."
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                        }}
                      />
                    </div>

                    <div className="action-buttons ai-create-model-actions">
                      <button
                        className="action-btn2 primary"
                        onClick={handleCreateModel}
                        disabled={isLoading}
                      >
                        Создать модель
                      </button>

                      <button
                        className="action-btn2 secondary"
                        onClick={() => setShowCreateForm(false)}
                        disabled={isLoading}
                      >
                        Отмена
                      </button>
                    </div>

                    <div className="ai-create-model-note">
                      Файл весов сейчас не загружается через интерфейс. Нужно
                      указать путь к уже размещённому файлу, например{" "}
                      <code>./models_ml/best_weighted.pt</code>
                    </div>
                  </div>
                )}

                <div className="models-list">
                  {models.length === 0 ? (
                    <div className="ai-empty-state">Модели не найдены</div>
                  ) : (
                    models.map((model) => (
                      <div
                        key={model.id}
                        className={`model-comparison ${
                          Number(selectedModelId) === Number(model.id)
                            ? "active"
                            : ""
                        }`}
                        onClick={() => handleSelectModel(model)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="model-icon">
                          <i
                            className={
                              model.model_type === "detection"
                                ? "fas fa-vector-square"
                                : "fas fa-brain"
                            }
                          ></i>
                        </div>

                        <div className="model-info">
                          <div className="model-name">
                            {model.name}
                            {model.is_active && (
                              <span className="ai-active-model-label">
                                Активна
                              </span>
                            )}
                          </div>

                          <div className="model-stats">
                            <div className="model-stat">
                              Тип:{" "}
                              <span className="model-stat-value">
                                {getModelTypeText(model.model_type)}
                              </span>
                            </div>

                            <div className="model-stat">
                              Архитектура:{" "}
                              <span className="model-stat-value">
                                {model.architecture || "—"}
                              </span>
                            </div>

                            <div className="model-stat">
                              Статус:{" "}
                              <span className="model-stat-value">
                                {getModelStatusText(model.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="monitoring-panel model-details-panel">
              <div className="panel-header">
                <h2>Данные выбранной модели</h2>
              </div>

              <div className="panel-content">
                {!selectedModel ? (
                  <div className="ai-empty-state">Выберите модель из списка.</div>
                ) : (
                  <>
                    <div className="selected-model-summary">
                      <div className="summary-row">
                        <span>Название</span>
                        <strong>{selectedModel.name || "—"}</strong>
                      </div>

                      <div className="summary-row">
                        <span>model_key</span>
                        <strong>{selectedModel.model_key || "—"}</strong>
                      </div>

                      <div className="summary-row">
                        <span>Тип</span>
                        <strong>{getModelTypeText(selectedModel.model_type)}</strong>
                      </div>

                      <div className="summary-row">
                        <span>Архитектура</span>
                        <strong>{selectedModel.architecture || "—"}</strong>
                      </div>

                      <div className="summary-row">
                        <span>Статус</span>
                        <strong>{getModelStatusText(selectedModel.status)}</strong>
                      </div>

                      <div className="summary-row">
                        <span>Классы</span>
                        <strong>{formatClasses(selectedModel.classes)}</strong>
                      </div>

                      <div className="summary-row">
                        <span>Рабочий режим</span>
                        <strong>{selectedModel.default_mode || "—"}</strong>
                      </div>

                      {selectedModel.model_type === "classification" && (
                        <div className="summary-row">
                          <span>Текущий threshold</span>
                          <strong>{formatThreshold(selectedModel.threshold)}</strong>
                        </div>
                      )}

                      {selectedModel.model_type === "detection" && (
                        <>
                          <div className="summary-row">
                            <span>Текущий confidence threshold</span>
                            <strong>
                              {formatThreshold(
                                selectedModel.confidence_threshold
                              )}
                            </strong>
                          </div>

                          <div className="summary-row">
                            <span>Текущий IoU threshold</span>
                            <strong>
                              {formatThreshold(selectedModel.iou_threshold)}
                            </strong>
                          </div>
                          <div className="summary-row">
                            <span>Input size выбранного режима</span>
                            <strong>
                              {formatInteger(getModeConfig(selectedModel, selectedMode).imgsz)}
                            </strong>
                          </div>

                          <div className="summary-row">
                            <span>Max detections выбранного режима</span>
                            <strong>
                              {formatInteger(getModeConfig(selectedModel, selectedMode).max_det)}
                            </strong>
                          </div>
                        </>
                      )}

                      <div className="summary-row summary-row-path">
                        <span>Файл весов</span>
                        <strong>{selectedModel.weights_path || "—"}</strong>
                      </div>
                    </div>

                    {selectedModel.modes && (
                      <div className="model-description-box">
                        <strong>Режимы модели:</strong>
                        <div style={{ marginTop: "8px" }}>
                          {getModeKeys(selectedModel).map((modeKey) => (
                            <div key={modeKey}>{getModeOptionText(selectedModel, modeKey)}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="metrics-section-title">
                      Метрики качества

                      {selectedModel.model_type === "classification" &&
                        classificationMetricMode && (
                          <span className="metrics-mode-label">
                            режим: {classificationMetricMode}
                          </span>
                        )}

                      {selectedModel.model_type === "detection" && (
                        <span className="metrics-mode-label">test split</span>
                      )}
                    </div>

                    {!hasMetrics ? (
                      <div className="ai-empty-state">
                        Метрики для этой модели не указаны. Их можно добавить
                        позже после оценки модели на тестовой выборке.
                      </div>
                    ) : (
                      <div className="metric-grid">
                        {selectedMetricItems.map((item) => (
                          <div className="metric-tile" key={item.label}>
                            <div className="metric-tile-label">{item.label}</div>

                            <div className="metric-tile-value">
                            {formatMetricValue(item.value, {
                              percent: item.percent,
                            })}
                            </div>

                            {item.percent && typeof item.value === "number" && (
                              <div className="metric-tile-bar">
                                <div
                                  className="metric-tile-fill"
                                  style={{
                                    width: `${getMetricProgress(item.value)}%`,
                                  }}
                                ></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="metrics-section-title">
                      Производительность модели
                    </div>

                    {!hasPerformance ? (
                      <div className="ai-empty-state">
                        Данные о производительности для этой модели пока не указаны.
                      </div>
                    ) : (
                      <div className="metric-grid">
                        {selectedPerformanceItems.map((item) => (
                          <div className="metric-tile" key={item.label}>
                            <div className="metric-tile-label">{item.label}</div>

                            <div className="metric-tile-value">
                            {formatPerformanceValue(item)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedModel.model_type === "classification" &&
                      selectedModel.metrics?.selection_reason && (
                        <div className="model-note-box">
                          {selectedModel.metrics.selection_reason}
                        </div>
                      )}

                    {selectedModel.model_type === "detection" &&
                      selectedModel.metrics?.status_note && (
                        <div className="model-note-box">
                          {selectedModel.metrics.status_note}
                        </div>
                      )}

                    <div className="model-description-box">
                      {selectedModel.description || "Описание модели отсутствует."}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="analysis-panel">
            <div className="monitoring-panel">
              <div className="panel-header">
                <h2>Настройки модели</h2>
              </div>

              <div className="panel-content">
                {!selectedModel || !editForm ? (
                  <div className="ai-empty-state">Выберите модель из списка.</div>
                ) : (
                  <div className="ai-settings-form">
                    <div className="ai-selected-model-title">
                      <span>Выбранная модель</span>
                      <strong>{selectedModel.name}</strong>
                    </div>

                    <div className="ai-create-model-grid">
                      <div>
                        <label style={labelStyle}>Название модели</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => handleEditFormChange("name", e.target.value)}
                          style={inputStyle}
                          disabled={!canManageAiModels}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>model_key</label>
                        <input
                          value={editForm.model_key}
                          onChange={(e) => handleEditFormChange("model_key", e.target.value)}
                          style={inputStyle}
                          disabled={!canManageAiModels}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Тип модели</label>
                        <select
                            value={editForm.model_type}
                            style={inputStyle}
                            disabled
                          >
                          <option value="classification">classification</option>
                          <option value="detection">detection</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Архитектура</label>
                        <input
                          value={editForm.architecture}
                          onChange={(e) =>
                            handleEditFormChange("architecture", e.target.value)
                          }
                          style={inputStyle}
                          disabled={!canManageAiModels}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Путь к весам</label>
                        <input
                          value={editForm.weights_path}
                          onChange={(e) =>
                            handleEditFormChange("weights_path", e.target.value)
                          }
                          style={inputStyle}
                          disabled={!canManageAiModels}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Классы</label>
                        <input
                          value={editForm.classes}
                          onChange={(e) => handleEditFormChange("classes", e.target.value)}
                          placeholder="crack, ok"
                          style={inputStyle}
                          disabled={!canManageAiModels}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Статус</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => handleEditFormChange("status", e.target.value)}
                          style={inputStyle}
                          disabled={!canManageAiModels}
                        >
                          <option value="available">available — доступна</option>
                          <option value="experimental">experimental — экспериментальная</option>
                          <option value="planned">planned — запланирована</option>
                          <option value="disabled">disabled — отключена</option>
                          <option value="error">error — ошибка</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Рабочий режим</label>
                        <select
                          value={editForm.default_mode}
                          onChange={(e) => {
                            handleEditFormChange("default_mode", e.target.value);
                            setSelectedMode(e.target.value);
                          }}
                          style={inputStyle}
                          disabled={!canManageAiModels}
                        >
                          <option value="strict">strict</option>
                          <option value="balanced">balanced</option>
                          <option value="sensitive">sensitive</option>
                        </select>
                      </div>
                    </div>

                    {editForm.model_type === "classification" && (
                      <div className="ai-create-model-mode-section">
                        <div className="ai-create-model-title">
                          Threshold по режимам классификации
                        </div>

                        <div className="ai-create-model-grid">
                          {DEFAULT_MODE_KEYS.map((modeKey) => (
                            <div key={modeKey}>
                              <label style={labelStyle}>{modeKey} threshold</label>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                max="0.999"
                                value={editForm.classification_modes[modeKey]}
                                onChange={(e) =>
                                  handleEditClassificationModeChange(
                                    modeKey,
                                    e.target.value
                                  )
                                }
                                style={inputStyle}
                                disabled={!canManageAiModels}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {editForm.model_type === "detection" && (
                      <div className="ai-create-model-mode-section">
                        <div className="ai-create-model-title">
                          Confidence / IoU по режимам детекции
                        </div>

                        <div className="ai-create-model-grid">
                          {DEFAULT_MODE_KEYS.map((modeKey) => (
                            <React.Fragment key={modeKey}>
                              <div>
                                <label style={labelStyle}>
                                  {modeKey} confidence threshold
                                </label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  max="0.999"
                                  value={
                                    editForm.detection_modes[modeKey].confidence_threshold
                                  }
                                  onChange={(e) =>
                                    handleEditDetectionModeChange(
                                      modeKey,
                                      "confidence_threshold",
                                      e.target.value
                                    )
                                  }
                                  style={inputStyle}
                                  disabled={!canManageAiModels}
                                />
                              </div>

                              <div>
                                <label style={labelStyle}>{modeKey} IoU threshold</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  max="0.999"
                                  value={editForm.detection_modes[modeKey].iou_threshold}
                                  onChange={(e) =>
                                    handleEditDetectionModeChange(
                                      modeKey,
                                      "iou_threshold",
                                      e.target.value
                                    )
                                  }
                                  style={inputStyle}
                                  disabled={!canManageAiModels}
                                />
                              </div>

                             
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="ai-form-field">
                      <label style={labelStyle}>Описание модели</label>

                      <textarea
                        value={editForm.description}
                        onChange={(e) =>
                          handleEditFormChange("description", e.target.value)
                        }
                        rows={4}
                        placeholder="Описание назначения модели..."
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                        }}
                        disabled={!canManageAiModels}
                      />
                    </div>

                    <div className="action-buttons ai-settings-actions">
                      <button
                        className="action-btn2 secondary"
                        onClick={handleSaveSettings}
                        disabled={isLoading || !canManageAiModels}
                      >
                        Сохранить изменения
                      </button>

                      <button
                        className="action-btn2 danger"
                        onClick={handleDeleteModel}
                        disabled={isLoading || !canManageAiModels || selectedModel.is_active}
                        title={
                          selectedModel.is_active
                            ? "Активную модель нельзя удалить"
                            : "Удалить модель"
                        }
                      >
                        Удалить модель
                      </button>

                      <button
                        className="action-btn2 primary"
                        onClick={handleActivateModel}
                        disabled={isLoading || selectedModel.is_active || !canManageAiModels}
                      >
                        {selectedModel.is_active ? "Уже активна" : "Активировать"}
                      </button>
                    </div>

                    {selectedModel.is_active && (
                      <div className="ai-model-warning">
                        Активную модель нельзя удалить или отключить. Сначала активируйте другую модель.
                      </div>
                    )}

                    {["disabled", "error", "planned"].includes(
                      normalizeStatus(selectedModel.status)
                    ) && (
                      <div className="ai-model-warning">
                        Модель нельзя активировать, потому что её статус:{" "}
                        <strong>{selectedModel.status}</strong>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          

            <div className="monitoring-panel">
              <div className="panel-header">
                <h2>Runtime активной модели</h2>
              </div>

              <div className="panel-content">
                <div className="ai-runtime-details">
                  <div>
                    <strong>Модель:</strong> {activeRuntime?.name || "—"}
                  </div>

                  <div>
                    <strong>Ключ:</strong> {activeRuntime?.model_key || "—"}
                  </div>

                  <div>
                    <strong>Тип:</strong>{" "}
                    {getModelTypeText(activeRuntime?.model_type)}
                  </div>

                  <div>
                    <strong>Архитектура:</strong>{" "}
                    {activeRuntime?.architecture || "—"}
                  </div>

                  <div>
                    <strong>Device:</strong> {activeRuntime?.device || "—"}
                  </div>

                  <div>
                    <strong>Classes:</strong>{" "}
                    {formatClasses(activeRuntime?.classes)}
                  </div>

                  {activeRuntime?.model_type === "classification" && (
                    <div>
                      <strong>Порог классификации:</strong>{" "}
                      {formatThreshold(activeRuntime?.threshold)}
                    </div>
                  )}

                  {activeRuntime?.model_type === "detection" && (
                    <>
                      <div>
                        <strong>Порог уверенности:</strong>{" "}
                        {formatThreshold(activeRuntime?.confidence_threshold)}
                      </div>

                      <div>
                        <strong>IoU-порог:</strong>{" "}
                        {formatThreshold(activeRuntime?.iou_threshold)}
                      </div>
                    </>
                  )}

                  <div>
                    <strong>Weights:</strong>{" "}
                    {activeRuntime?.weights_path || "—"}
                  </div>

                  <div>
                    <strong>Loaded:</strong>{" "}
                    {activeRuntime?.loaded ? "да" : "нет"}
                  </div>
                </div>
              </div>
            </div>

            <div className="monitoring-panel">
              <div className="panel-header">
                <h2>Что означает режим</h2>
              </div>

              <div className="panel-content">
                <div className="ai-mode-help">
                  <p>
                    <strong>strict</strong> — более высокий порог. Меньше ложных
                    срабатываний, но выше риск пропустить дефект.
                  </p>

                  <p>
                    <strong>balanced</strong> — основной рабочий режим. Для
                    ResNet18 это настроенный threshold, для YOLO — confidence
                    threshold выбранного режима.
                  </p>

                  <p>
                    <strong>sensitive</strong> — более чувствительный режим.
                    Снижает риск пропуска дефекта, но может увеличить количество
                    ложных срабатываний.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmModal.isOpen && (
        <div className="ai-confirm-overlay" onClick={closeConfirmModal}>
          <div
            className="ai-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="ai-confirm-header">
              <div>
                <h3>{confirmModal.title}</h3>
                <p>{confirmModal.message}</p>
              </div>
            </div>

            <div className="ai-confirm-actions">
              <button
                type="button"
                className="ai-confirm-btn secondary"
                onClick={closeConfirmModal}
                disabled={isLoading}
              >
                {confirmModal.cancelText}
              </button>

              <button
                type="button"
                className={`ai-confirm-btn ${confirmModal.type}`}
                onClick={handleConfirmModalConfirm}
                disabled={isLoading}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid rgba(60,120,180,0.4)",
  background: "rgba(20,30,45,0.9)",
  color: "#e0e0e0",
};

const labelStyle = {
  color: "#b0c4de",
  display: "block",
  marginBottom: "6px",
};

export default AiPanel;
