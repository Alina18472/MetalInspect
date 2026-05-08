import React, { useEffect, useState } from "react";
import "../styles/ai_panel.css";
import TopNav from "../components/TopNav";
import { api } from "../services/Api";

const AiPanel = () => {
  const [models, setModels] = useState([]);
  const [activeRuntime, setActiveRuntime] = useState(null);

  const [selectedModelId, setSelectedModelId] = useState(null);
  const [selectedMode, setSelectedMode] = useState("");
  const [customThreshold, setCustomThreshold] = useState("");
  const [customIouThreshold, setCustomIouThreshold] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState("");

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
 

  useEffect(() => {
    document.body.classList.add("ai-panel-page");
    return () => document.body.classList.remove("ai-panel-page");
  }, []);

  useEffect(() => {
    loadAiPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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

  const getModelStatusText = (status) => {
    const map = {
      available: "Доступна",
      experimental: "Экспериментальная",
      planned: "Запланирована",
      disabled: "Отключена",
      error: "Ошибка",
    };

    return map[status] || status || "Неизвестно";
  };

  const getModelTypeText = (type) => {
    const map = {
      classification: "Классификация",
      detection: "Детекция",
    };

    return map[type] || type || "—";
  };

  const normalizeStatus = (status) => {
    return String(status || "").trim().toLowerCase();
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

  const getModelMainThreshold = (model) => {
    if (!model) return "";

    if (model.model_type === "detection") {
      return model.confidence_threshold !== null &&
        model.confidence_threshold !== undefined
        ? String(model.confidence_threshold)
        : "";
    }

    return model.threshold !== null && model.threshold !== undefined
      ? String(model.threshold)
      : "";
  };

  const getModelIouThreshold = (model) => {
    if (!model) return "";

    return model.iou_threshold !== null && model.iou_threshold !== undefined
      ? String(model.iou_threshold)
      : "";
  };

  const getModeConfig = (model, modeKey) => {
    if (!model || !model.modes || !modeKey) return {};

    const value = model.modes[modeKey];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }

    if (model.model_type === "detection") {
      return {
        confidence_threshold: value,
        iou_threshold: model.iou_threshold,
      };
    }

    return {
      threshold: value,
    };
  };

  const getModeOptionText = (model, modeKey) => {
    const config = getModeConfig(model, modeKey);

    if (model.model_type === "detection") {
      const conf = config.confidence_threshold ?? model.confidence_threshold ?? "—";
      const iou = config.iou_threshold ?? model.iou_threshold ?? "—";
      return `${modeKey} — conf=${conf}, iou=${iou}`;
    }

    const threshold = config.threshold ?? model.threshold ?? "—";
    return `${modeKey} — threshold=${threshold}`;
  };

  const handleSelectModel = (model) => {
    const mode = model.default_mode || "";

    setSelectedModelId(model.id);
    setSelectedMode(mode);
    setEditStatus(model.status || "available");
    setEditDescription(model.description || "");

    const config = getModeConfig(model, mode);

    if (model.model_type === "detection") {
      setCustomThreshold(
        config.confidence_threshold !== null &&
          config.confidence_threshold !== undefined
          ? String(config.confidence_threshold)
          : getModelMainThreshold(model)
      );

      setCustomIouThreshold(
        config.iou_threshold !== null && config.iou_threshold !== undefined
          ? String(config.iou_threshold)
          : getModelIouThreshold(model)
      );
    } else {
      setCustomThreshold(
        config.threshold !== null && config.threshold !== undefined
          ? String(config.threshold)
          : getModelMainThreshold(model)
      );

      setCustomIouThreshold("");
    }
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

      const loadedModels = modelsData || [];

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
      setError(e?.message || "Не удалось загрузить данные AI-панели");
    } finally {
      setIsLoading(false);
    }
  };

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

  const parseNumberOrNull = (value, fieldName) => {
    if (value === "" || value === null || value === undefined) return null;

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      throw new Error(`Поле "${fieldName}" должно быть числом`);
    }

    if (numberValue < 0 || numberValue > 1) {
      throw new Error(`Поле "${fieldName}" должно быть в диапазоне от 0 до 1`);
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

  const handleCreateModel = async () => {
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

      if (!weightsPath && ["available", "experimental"].includes(createForm.status)) {
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
          ? parseNumberOrNull(createForm.threshold, "threshold")
          : null;

      const confidenceThresholdValue =
        createForm.model_type === "detection"
          ? parseNumberOrNull(
              createForm.confidence_threshold,
              "confidence_threshold"
            )
          : null;

      const iouThresholdValue =
        createForm.model_type === "detection"
          ? parseNumberOrNull(createForm.iou_threshold, "iou_threshold")
          : null;

      const generatedModes = buildDefaultModes({
        modelType: createForm.model_type,
        threshold: thresholdValue,
        confidenceThreshold: confidenceThresholdValue,
        iouThreshold: iouThresholdValue,
      });

      const payload = {
        model_key: modelKey,
        name,
        model_type: createForm.model_type,
        architecture,
        weights_path: weightsPath || null,
        classes: classes.length > 0 ? classes : null,
        status: createForm.status,
        default_mode: createForm.default_mode || "balanced",
        threshold: thresholdValue,
        confidence_threshold: confidenceThresholdValue,
        iou_threshold: iouThresholdValue,
        modes: generatedModes,
        metrics: null,
        description: createForm.description.trim() || null,
      };

      setIsLoading(true);

      const createdModel = await api.createAiModel(payload);

      await loadAiPanel({ preferredModelId: createdModel.id });

      setShowCreateForm(false);
      showNotification(`Модель "${createdModel.name}" добавлена`, "success");
    } catch (e) {
      setError(e?.message || "Не удалось создать модель");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateModel = async () => {
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
      message: `Модель «${selectedModel.name}» станет активной. Новые смены будут использовать именно эту модель и её настройки.`,
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
          setError(e?.message || "Не удалось активировать модель");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleSaveSettings = async () => {
    const selectedModel = models.find(
      (m) => Number(m.id) === Number(selectedModelId)
    );

    if (!selectedModel) {
      showNotification("Сначала выберите модель", "info");
      return;
    }

    if (
      selectedModel.is_active &&
      ["planned", "disabled", "error"].includes(editStatus)
    ) {
      showNotification(
        "Активную модель нельзя отключить. Сначала активируйте другую модель.",
        "info"
      );
      return;
    }

    const payload = {};

    if (selectedMode) {
      payload.default_mode = selectedMode;
    }

    if (editStatus) {
      payload.status = editStatus;
    }

    payload.description = editDescription;

    if (customThreshold !== "") {
      const thresholdNumber = Number(customThreshold);

      if (
        Number.isNaN(thresholdNumber) ||
        thresholdNumber < 0 ||
        thresholdNumber > 1
      ) {
        showNotification("Threshold должен быть числом от 0 до 1", "info");
        return;
      }

      if (selectedModel.model_type === "classification") {
        payload.threshold = thresholdNumber;
      }

      if (selectedModel.model_type === "detection") {
        payload.confidence_threshold = thresholdNumber;
      }
    }

    if (selectedModel.model_type === "detection" && customIouThreshold !== "") {
      const iouNumber = Number(customIouThreshold);

      if (Number.isNaN(iouNumber) || iouNumber < 0 || iouNumber > 1) {
        showNotification("IoU threshold должен быть числом от 0 до 1", "info");
        return;
      }

      payload.iou_threshold = iouNumber;
    }

    setIsLoading(true);
    setError("");

    try {
      await api.updateAiModelSettings(selectedModel.id, payload);
      await loadAiPanel({ preferredModelId: selectedModel.id });
      showNotification("Настройки модели сохранены", "success");
    } catch (e) {
      setError(e?.message || "Не удалось сохранить настройки модели");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModel = models.find(
    (m) => Number(m.id) === Number(selectedModelId)
  );
  
  const activeModel = models.find((m) => m.is_active);
  
  const totalModels = models.length;
  const availableCount = models.filter((m) => m.status === "available").length;
  const experimentalCount = models.filter((m) => m.status === "experimental").length;
  const disabledCount = models.filter((m) =>
    ["disabled", "error", "planned"].includes(normalizeStatus(m.status))
  ).length;
  
  const modes = selectedModel?.modes || {};
  const selectedMetricItems = getSelectedModelMetrics(selectedModel, selectedMode);
  const hasMetrics = hasAnyMetricValue(selectedMetricItems);
  const classificationMetricMode = getClassificationMetricMode(
    selectedModel,
    selectedMode
  );
  

  return (
    <div className="container">
            <TopNav
              subtitle="Система распознавания трещин в слитках • Управление AI-моделями"
              userName="Оператор системы"
              userRole="Контроль качества"
            />

            {notification && (
              <div style={{ padding: "12px 20px", color: "#4dabf7", fontWeight: 600 }}>
                {notification.type === "success" ? "✓ " : "ℹ "}
                {notification.message}
              </div>
            )}

            {error && (
              <div style={{ padding: "12px 20px", color: "#f44336", fontWeight: 600 }}>
                {error}
              </div>
            )}

            {isLoading && (
              <div style={{ padding: "12px 20px", color: "#8fb4d9" }}>
                Загрузка...
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
                <h2>
                  <i className="fas fa-list"></i> Реестр AI-моделей
                </h2>

                <div className="controls">
                  <button
                    className="action-btn2 secondary"
                    onClick={() => setShowCreateForm((prev) => !prev)}
                  >
                    <i className="fas fa-plus"></i>{" "}
                    {showCreateForm ? "Скрыть форму" : "Добавить модель"}
                  </button>

                  <button
                    className="action-btn2 secondary"
                    onClick={() => loadAiPanel({ keepSelected: true })}
                  >
                    <i className="fas fa-sync-alt"></i> Обновить
                  </button>
                </div>
              </div>

              <div className="panel-content">
                {showCreateForm && (
                  <div
                    style={{
                      marginBottom: "20px",
                      padding: "18px",
                      borderRadius: "10px",
                      border: "1px solid rgba(77,171,247,0.25)",
                      background: "rgba(15, 25, 40, 0.75)",
                    }}
                  >
                    <div
                      style={{
                        color: "#e0e0e0",
                        fontWeight: 700,
                        marginBottom: "16px",
                        fontSize: "16px",
                      }}
                    >
                      Добавление новой AI-модели
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "14px",
                      }}
                    >
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
                        <label style={labelStyle}>Default mode</label>
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
                          <label style={labelStyle}>Threshold</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            max="1"
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
                            <label style={labelStyle}>Confidence threshold</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max="1"
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
                            <label style={labelStyle}>IoU threshold</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max="1"
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

                    <div style={{ marginTop: "14px" }}>
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

                    <div className="action-buttons" style={{ marginTop: "16px" }}>
                      <button
                        className="action-btn2 primary"
                        onClick={handleCreateModel}
                        disabled={isLoading}
                      >
                        <i className="fas fa-plus"></i> Создать модель
                      </button>

                      <button
                        className="action-btn2 secondary"
                        onClick={() => setShowCreateForm(false)}
                        disabled={isLoading}
                      >
                        Отмена
                      </button>
                    </div>

                    <div
                      style={{
                        color: "#8fb4d9",
                        marginTop: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      Сейчас файл весов не загружается через интерфейс. Нужно
                      указать путь к уже размещённому файлу, например{" "}
                      <code>./models_ml/best_weighted.pt</code>. Режимы{" "}
                      <strong>strict</strong>, <strong>balanced</strong> и{" "}
                      <strong>sensitive</strong> будут сформированы автоматически.
                    </div>
                  </div>
                )}

                <div className="models-list">
                  {models.length === 0 ? (
                    <div style={{ color: "#8fb4d9", padding: "20px" }}>
                      Модели не найдены
                    </div>
                  ) : (
                    models.map((model) => (
                      <div
                        key={model.id}
                        className={`model-comparison ${
                          selectedModelId === model.id ? "active" : ""
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
                              <span
                                style={{
                                  color: "#4CAF50",
                                  marginLeft: "10px",
                                }}
                              >
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
                                {model.architecture}
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
                <h2>
                  <i className="fas fa-chart-bar"></i> Данные выбранной модели
                </h2>
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
                        <strong>{selectedModel.classes?.join(", ") || "—"}</strong>
                      </div>

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
                <h2>
                  <i className="fas fa-cogs"></i> Настройки модели
                </h2>
              </div>

              <div className="panel-content">
                {!selectedModel ? (
                  <div style={{ color: "#8fb4d9" }}>
                    Выберите модель из списка.
                  </div>
                ) : (
                  <>
                    <div style={{ color: "#b0c4de", marginBottom: "8px" }}>
                      Выбранная модель
                    </div>

                    <div
                      style={{
                        color: "#e0e0e0",
                        fontWeight: 600,
                        marginBottom: "18px",
                      }}
                    >
                      {selectedModel.name}
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={labelStyle}>Статус модели</label>

                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        style={inputStyle}
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

                    <div style={{ marginBottom: "16px" }}>
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
                      />
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={labelStyle}>Режим</label>

                      <select
                        value={selectedMode}
                        onChange={(e) => {
                          setSelectedMode(e.target.value);
                          const modeKey = e.target.value;
                          const config = getModeConfig(selectedModel, modeKey);

                          if (selectedModel.model_type === "detection") {
                            setCustomThreshold(
                              config.confidence_threshold !== null &&
                                config.confidence_threshold !== undefined
                                ? String(config.confidence_threshold)
                                : getModelMainThreshold(selectedModel)
                            );

                            setCustomIouThreshold(
                              config.iou_threshold !== null &&
                                config.iou_threshold !== undefined
                                ? String(config.iou_threshold)
                                : getModelIouThreshold(selectedModel)
                            );
                          } else {
                            setCustomThreshold(
                              config.threshold !== null &&
                                config.threshold !== undefined
                                ? String(config.threshold)
                                : getModelMainThreshold(selectedModel)
                            );

                            setCustomIouThreshold("");
                          }
                        }}
                        style={inputStyle}
                      >
                        <option value="">Не выбран</option>
                        {Object.keys(modes).map((modeKey) => (
                          <option key={modeKey} value={modeKey}>
                            {getModeOptionText(selectedModel, modeKey)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={labelStyle}>
                        {selectedModel.model_type === "detection"
                          ? "Confidence threshold"
                          : "Threshold"}
                      </label>

                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={customThreshold}
                        onChange={(e) => setCustomThreshold(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    {selectedModel.model_type === "detection" && (
                      <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>IoU threshold</label>

                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max="1"
                          value={customIouThreshold}
                          onChange={(e) =>
                            setCustomIouThreshold(e.target.value)
                          }
                          style={inputStyle}
                        />
                      </div>
                    )}

                    <div className="action-buttons">
                      <button
                        className="action-btn2 secondary"
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                      >
                        <i className="fas fa-save"></i> Сохранить настройки
                      </button>

                      <button
                        className="action-btn2 primary"
                        onClick={handleActivateModel}
                        disabled={isLoading || selectedModel.is_active}
                      >
                        <i className="fas fa-power-off"></i>{" "}
                        {selectedModel.is_active ? "Уже активна" : "Активировать"}
                      </button>
                    </div>

                    {selectedModel &&
                      ["disabled", "error", "planned"].includes(
                        normalizeStatus(selectedModel.status)
                      ) && (
                        <div
                          style={{
                            color: "#ffb4b4",
                            marginTop: "12px",
                            lineHeight: 1.5,
                          }}
                        >
                          Модель нельзя активировать, потому что её статус:{" "}
                          <strong>{selectedModel.status}</strong>.
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>

            <div className="monitoring-panel">
              <div className="panel-header">
                <h2>
                  <i className="fas fa-server"></i> Runtime активной модели
                </h2>
              </div>

              <div className="panel-content">
                <div style={{ color: "#b0c4de", lineHeight: 1.8 }}>
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
                    {activeRuntime?.classes?.join(", ") || "—"}
                  </div>
                  {activeRuntime?.model_type === "classification" && (
                    <div>
                      <strong>Порог классификации:</strong>{" "}
                      {activeRuntime?.threshold !== null &&
                      activeRuntime?.threshold !== undefined
                        ? Number(activeRuntime.threshold).toFixed(3)
                        : "—"}
                    </div>
                  )}

                  {activeRuntime?.model_type === "detection" && (
                    <>
                      <div>
                        <strong>Порог уверенности:</strong>{" "}
                        {activeRuntime?.confidence_threshold !== null &&
                        activeRuntime?.confidence_threshold !== undefined
                          ? Number(activeRuntime.confidence_threshold).toFixed(3)
                          : "—"}
                      </div>

                      <div>
                        <strong>IoU-порог:</strong>{" "}
                        {activeRuntime?.iou_threshold !== null &&
                        activeRuntime?.iou_threshold !== undefined
                          ? Number(activeRuntime.iou_threshold).toFixed(3)
                          : "—"}
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
                <h2>
                  <i className="fas fa-info-circle"></i> Что означает режим
                </h2>
              </div>

              <div className="panel-content">
                <div style={{ color: "#8fb4d9", lineHeight: 1.7 }}>
                  <p>
                    <strong>strict</strong> — более высокий threshold, меньше
                    ложных срабатываний, но выше риск пропустить дефект.
                  </p>
                  <p>
                    <strong>balanced</strong> — основной рабочий режим, выбранный
                    после настройки threshold.
                  </p>
                  <p>
                    <strong>sensitive</strong> — более чувствительный режим,
                    снижает риск пропуска дефекта, но может увеличить количество
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
              <div className={`ai-confirm-icon ${confirmModal.type}`}>
                <i
                  className={
                    confirmModal.type === "danger"
                      ? "fas fa-exclamation-triangle"
                      : "fas fa-question"
                  }
                ></i>
              </div>

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