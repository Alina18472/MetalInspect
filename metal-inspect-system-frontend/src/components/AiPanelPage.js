import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ai_panel.css";
import TopNav from "../components/TopNav";
import { api } from "../services/Api";
import { useAuth } from "../context/AuthContext";

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
      };
    }

    return {
      mode: normalizedMode,
      confidence_threshold:
        toNumberOrNull(rawModeValue) ??
        toNumberOrNull(model.confidence_threshold),
      iou_threshold: toNumberOrNull(model.iou_threshold),
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
    return `${modeKey} — conf=${formatThreshold(
      config.confidence_threshold
    )}, iou=${formatThreshold(config.iou_threshold)}`;
  }

  return `${modeKey} — threshold=${formatThreshold(config.threshold)}`;
};

const parseProbabilityOrNull = (value, fieldName) => {
  if (value === "" || value === null || value === undefined) return null;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    throw new Error(`Поле "${fieldName}" должно быть числом`);
  }

  if (numberValue <= 0 || numberValue >= 1) {
    throw new Error(`Поле "${fieldName}" должно быть в диапазоне от 0.001 до 0.999`);
  }

  return numberValue;
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

const buildDefaultModes = ({
  modelType,
  threshold,
  confidenceThreshold,
  iouThreshold,
}) => {
  if (modelType === "detection") {
    return {
      strict: {
        confidence_threshold: 0.45,
        iou_threshold: 0.5,
      },
      balanced: {
        confidence_threshold: confidenceThreshold ?? 0.25,
        iou_threshold: iouThreshold ?? 0.45,
      },
      sensitive: {
        confidence_threshold: 0.15,
        iou_threshold: 0.4,
      },
    };
  }

  return {
    strict: {
      threshold: 0.65,
    },
    balanced: {
      threshold: threshold ?? 0.465,
    },
    sensitive: {
      threshold: 0.35,
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
    return [
      {
        label: "Precision",
        value: getMetricRawValue(metrics, ["precision"]),
        percent: true,
      },
      {
        label: "Recall",
        value: getMetricRawValue(metrics, ["recall"]),
        percent: true,
      },
      {
        label: "mAP@50",
        value: getMetricRawValue(metrics, ["map50", "mAP50", "map_50"]),
        percent: true,
      },
      {
        label: "mAP@50-95",
        value: getMetricRawValue(metrics, ["map50_95", "mAP50_95", "map"]),
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

  const [createForm, setCreateForm] = useState({
    model_key: "",
    name: "",
    model_type: "classification",
    architecture: "ResNet18",
    weights_path: "./models_ml/best_weighted.pt",
    classes: "crack, ok",
    status: "available",
    default_mode: "balanced",
    threshold: "0.465",
    confidence_threshold: "",
    iou_threshold: "",
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
          next.threshold = "0.465";
          next.confidence_threshold = "";
          next.iou_threshold = "";
          next.default_mode = "balanced";
          next.status = "available";
          next.weights_path = "./models_ml/best_weighted.pt";
        }

        if (value === "detection") {
          next.architecture = "YOLOv8";
          next.classes = "crack";
          next.threshold = "";
          next.confidence_threshold = "0.25";
          next.iou_threshold = "0.45";
          next.default_mode = "balanced";
          next.status = "experimental";
          next.weights_path = "./models_ml/yolov8_crack.pt";
        }
      }

      return next;
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

      const thresholdValue =
        createForm.model_type === "classification"
          ? parseProbabilityOrNull(createForm.threshold, "balanced threshold")
          : null;

      const confidenceThresholdValue =
        createForm.model_type === "detection"
          ? parseProbabilityOrNull(
              createForm.confidence_threshold,
              "balanced confidence threshold"
            )
          : null;

      const iouThresholdValue =
        createForm.model_type === "detection"
          ? parseProbabilityOrNull(
              createForm.iou_threshold,
              "balanced IoU threshold"
            )
          : null;

      const generatedModes = buildDefaultModes({
        modelType: createForm.model_type,
        threshold: thresholdValue,
        confidenceThreshold: confidenceThresholdValue,
        iouThreshold: iouThresholdValue,
      });

      const defaultMode = createForm.default_mode || "balanced";

      const defaultConfig = getModeConfig(
        {
          model_type: createForm.model_type,
          default_mode: defaultMode,
          modes: generatedModes,
          threshold: thresholdValue,
          confidence_threshold: confidenceThresholdValue,
          iou_threshold: iouThresholdValue,
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

    if (
      selectedModel.is_active &&
      ["planned", "disabled", "error"].includes(normalizeStatus(editStatus))
    ) {
      showNotification(
        "Активную модель нельзя отключить. Сначала активируйте другую модель.",
        "info"
      );
      return;
    }

    const modeKey = selectedMode || getInitialMode(selectedModel);
    const modeConfig = getModeConfig(selectedModel, modeKey);

    const payload = {
      default_mode: modeKey,
      status: editStatus || selectedModel.status,
      description: editDescription,
    };

    try {
      if (selectedModel.model_type === "classification") {
        payload.threshold = ensureProbability(
          modeConfig.threshold,
          "threshold выбранного режима"
        );
      }

      if (selectedModel.model_type === "detection") {
        payload.confidence_threshold = ensureProbability(
          modeConfig.confidence_threshold,
          "confidence threshold выбранного режима"
        );

        payload.iou_threshold = ensureProbability(
          modeConfig.iou_threshold,
          "IoU threshold выбранного режима"
        );
      }
    } catch (e) {
      showNotification(e.message, "error");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await api.updateAiModelSettings(selectedModel.id, payload);
      await loadAiPanel({ preferredModelId: selectedModel.id });
      showNotification("Настройки модели сохранены", "success");
    } catch (e) {
      if (
        handleAccessError(
          e,
          "У вас нет права на изменение настроек AI-моделей."
        )
      ) {
        return;
      }

      const message = e?.message || "Не удалось сохранить настройки модели";
      setError(message);
      showNotification(message, "error");
    } finally {
      setIsLoading(false);
    }
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
  const selectedModeConfig = selectedModel
    ? getModeConfig(selectedModel, selectedMode)
    : {};

  const selectedMetricItems = getSelectedModelMetrics(selectedModel, selectedMode);
  const hasMetrics = hasAnyMetricValue(selectedMetricItems);
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
        userRole={profile.role}
      />

      <FloatingNotice notice={notification} />
      <FloatingNotice notice={accessNotice} offset={notificationOffset} />

      {error && (
        <div className="ai-panel-page-error">
          {error}
        </div>
      )}


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

                      {createForm.model_type === "classification" && (
                        <div>
                          <label style={labelStyle}>
                            Balanced threshold для формирования режимов
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            max="0.999"
                            value={createForm.threshold}
                            onChange={(e) =>
                              handleCreateFormChange("threshold", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </div>
                      )}

                      {createForm.model_type === "detection" && (
                        <>
                          <div>
                            <label style={labelStyle}>
                              Balanced confidence threshold
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="0.999"
                              value={createForm.confidence_threshold}
                              onChange={(e) =>
                                handleCreateFormChange(
                                  "confidence_threshold",
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Balanced IoU threshold</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="0.999"
                              value={createForm.iou_threshold}
                              onChange={(e) =>
                                handleCreateFormChange(
                                  "iou_threshold",
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            />
                          </div>
                        </>
                      )}
                    </div>

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
                      <code>./models_ml/best_weighted.pt</code>. Режимы{" "}
                      <strong>strict</strong>, <strong>balanced</strong> и{" "}
                      <strong>sensitive</strong> будут сформированы автоматически.
                    </div>
                  </div>
                )}

                <div className="models-list">
                  {models.length === 0 ? (
                    <div className="ai-empty-state">
                      Модели не найдены
                    </div>
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
                        </>
                      )}

                      <div className="summary-row summary-row-path">
                        <span>Файл весов</span>
                        <strong>{selectedModel.weights_path || "—"}</strong>
                      </div>
                    </div>

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
                {!selectedModel ? (
                  <div className="ai-empty-state">
                    Выберите модель из списка.
                  </div>
                ) : (
                  <div className="ai-settings-form">
                    <div className="ai-selected-model-title">
                      <span>Выбранная модель</span>
                      <strong>{selectedModel.name}</strong>
                    </div>

                    <div className="ai-form-field">
                      <label style={labelStyle}>Статус модели</label>

                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        style={inputStyle}
                        disabled={!canManageAiModels}
                      >
                        <option value="available">available — доступна</option>
                        <option value="experimental">
                          experimental — экспериментальная
                        </option>
                        <option value="planned">planned — запланирована</option>
                        <option value="disabled">disabled — отключена</option>
                        <option value="error">error — ошибка</option>
                      </select>
                    </div>

                    <div className="ai-form-field">
                      <label style={labelStyle}>Описание модели</label>

                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={4}
                        placeholder="Описание назначения модели..."
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                        }}
                        disabled={!canManageAiModels}
                      />
                    </div>

                    <div className="ai-form-field">
                      <label style={labelStyle}>Рабочий режим</label>

                      <select
                        value={selectedMode}
                        onChange={(e) => setSelectedMode(e.target.value)}
                        style={inputStyle}
                        disabled={!canManageAiModels}
                      >
                        {modeKeys.map((modeKey) => (
                          <option key={modeKey} value={modeKey}>
                            {getModeOptionText(selectedModel, modeKey)}
                          </option>
                        ))}
                      </select>
                    </div>

                    
                   

                    <div className="action-buttons ai-settings-actions">
                      <button
                        className="action-btn2 secondary"
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                      >
                        Сохранить настройки
                      </button>

                      <button
                        className="action-btn2 primary"
                        onClick={handleActivateModel}
                        disabled={isLoading || selectedModel.is_active}
                      >
                        {selectedModel.is_active ? "Уже активна" : "Активировать"}
                      </button>
                    </div>

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
                    ResNet18 это твой настроенный threshold около 0.465.
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