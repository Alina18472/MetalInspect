
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

  useEffect(() => {
    document.body.classList.add("ai-panel-page");
    return () => document.body.classList.remove("ai-panel-page");
  }, []);

  useEffect(() => {
    loadAiPanel();
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadAiPanel = async ({ preferredModelId = null, keepSelected = false } = {}) => {
    setIsLoading(true);
    setError("");
  
    try {
      const [modelsData, runtimeData] = await Promise.all([
        api.getAiModels(),
        api.getActiveAiModelRuntime(),
      ]);
  
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
  
      if (modelToSelect) {
        handleSelectModel(modelToSelect);
      }
    } catch (e) {
      setError(e?.message || "Не удалось загрузить данные AI-панели");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModel = models.find((m) => Number(m.id) === Number(selectedModelId));
  const activeModel = models.find((m) => m.is_active);

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

  const getMetricValue = (metrics, key) => {
    if (!metrics || metrics[key] === undefined || metrics[key] === null) return "—";

    const value = metrics[key];

    if (typeof value === "number") {
      if (value <= 1) return `${(value * 100).toFixed(1)}%`;
      return String(value);
    }

    return String(value);
  };
  const getModelMainThreshold = (model) => {
    if (!model) return "";
  
    if (model.model_type === "detection") {
      return model.confidence_threshold !== null && model.confidence_threshold !== undefined
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
  
  const formatThresholdForCard = (model) => {
    if (!model) return "—";
  
    if (model.model_type === "detection") {
      const conf =
        model.confidence_threshold !== null && model.confidence_threshold !== undefined
          ? Number(model.confidence_threshold).toFixed(3)
          : "—";
  
      const iou =
        model.iou_threshold !== null && model.iou_threshold !== undefined
          ? Number(model.iou_threshold).toFixed(3)
          : "—";
  
      return `conf ${conf}`;
    }
  
    return model.threshold !== null && model.threshold !== undefined
      ? Number(model.threshold).toFixed(3)
      : "—";
  };
  const handleSelectModel = (model) => {
    const mode = model.default_mode || "";
  
    setSelectedModelId(model.id);
    setSelectedMode(mode);
  
    const config = getModeConfig(model, mode);
  
    if (model.model_type === "detection") {
      setCustomThreshold(
        config.confidence_threshold !== null && config.confidence_threshold !== undefined
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

  const handleActivateModel = async () => {
    if (!selectedModel) {
      showNotification("Сначала выберите модель", "info");
      return;
    }
  
    const status = normalizeStatus(selectedModel.status);
  
    if (["disabled", "error"].includes(status)) {
      showNotification(
        `Модель нельзя активировать. Текущий статус: ${selectedModel.status}`,
        "info"
      );
      return;
    }
  
    const ok = window.confirm(
      `Активировать модель "${selectedModel.name}"?\n\nПосле этого новые смены будут использовать эту модель.`
    );
  
    if (!ok) return;
  
    setIsLoading(true);
    setError("");
  
    try {
      await api.activateAiModel(selectedModel.id);
      await loadAiPanel({ preferredModelId: selectedModel.id });
      showNotification(`Модель "${selectedModel.name}" активирована`, "success");
    } catch (e) {
      setError(e?.message || "Не удалось активировать модель");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedModel) {
      showNotification("Сначала выберите модель", "info");
      return;
    }
  
    const payload = {};
  
    if (selectedMode) {
      payload.default_mode = selectedMode;
    }
  
    if (customThreshold !== "") {
      const thresholdNumber = Number(customThreshold);
  
      if (Number.isNaN(thresholdNumber) || thresholdNumber < 0 || thresholdNumber > 1) {
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

  const metrics = selectedModel?.metrics || {};
  const modes = selectedModel?.modes || {};

  return (
    <div className="container">
      <TopNav
        subtitle="Система распознавания трещин в слитках • Управление AI-моделями"
        userName="Оператор системы"
        userRole="AI-зрение • Контроль качества"
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
        <div className="metrics-header">
          <div className="metric-card metric-accuracy">
            <div className="metric-icon">
              <i className="fas fa-microchip"></i>
            </div>
            <div className="metric-content">
              <div className="metric-value">
                {activeModel?.architecture || "—"}
              </div>
              <div className="metric-label">Активная архитектура</div>
              <div className="metric-trend trend-up">
                {activeModel?.name || "Активная модель не выбрана"}
              </div>
            </div>
          </div>

          <div className="metric-card metric-precision">
            <div className="metric-icon">
              <i className="fas fa-layer-group"></i>
            </div>
            <div className="metric-content">
              <div className="metric-value">
                {getModelTypeText(activeModel?.model_type)}
              </div>
              <div className="metric-label">Тип модели</div>
              <div className="metric-trend trend-up">
                {activeModel?.model_key || "—"}
              </div>
            </div>
          </div>

          <div className="metric-card metric-recall">
            <div className="metric-icon">
              <i className="fas fa-sliders-h"></i>
            </div>
            <div className="metric-content">
            <div className="metric-value">
              {formatThresholdForCard(activeModel)}
            </div>
            <div className="metric-label">
              {activeModel?.model_type === "detection" ? "Confidence" : "Threshold"}
            </div>
            <div className="metric-trend trend-up">
              Режим: {activeModel?.default_mode || "—"}
              {activeModel?.model_type === "detection" &&
                activeModel?.iou_threshold !== null &&
                activeModel?.iou_threshold !== undefined
                  ? ` • IoU ${Number(activeModel.iou_threshold).toFixed(3)}`
                  : ""}
            </div>
            </div>
          </div>

          <div className="metric-card metric-f1">
            <div className="metric-icon">
              <i className="fas fa-desktop"></i>
            </div>
            <div className="metric-content">
              <div className="metric-value">
                {activeRuntime?.device || "—"}
              </div>
              <div className="metric-label">Runtime device</div>
              <div className="metric-trend trend-up">
                {activeRuntime?.loaded ? "Модель загружена" : "Не загружена"}
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
                  <button className="action-btn secondary" onClick={loadAiPanel}>
                    <i className="fas fa-sync-alt"></i> Обновить
                  </button>
                </div>
              </div>

              <div className="panel-content">
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
                              <span style={{ color: "#4CAF50", marginLeft: "10px" }}>
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

            <div className="monitoring-panel">
              <div className="panel-header">
                <h2>
                  <i className="fas fa-chart-bar"></i> Метрики выбранной модели
                </h2>
              </div>

              <div className="panel-content">
                <div className="metric-bars">
                  <div className="metric-bar">
                    <div className="bar-header">
                      <div className="bar-label">
                        <i className="fas fa-search"></i>
                        <span>Recall crack</span>
                      </div>
                      <div className="bar-value">
                        {getMetricValue(metrics, "recall_crack")}
                      </div>
                    </div>
                    <div className="bar-container">
                      <div
                        className="bar-fill bar-recall"
                        style={{
                          width: `${Number(metrics.recall_crack || 0) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="metric-bar">
                    <div className="bar-header">
                      <div className="bar-label">
                        <i className="fas fa-check-double"></i>
                        <span>Precision min</span>
                      </div>
                      <div className="bar-value">
                        {getMetricValue(metrics, "precision_min")}
                      </div>
                    </div>
                    <div className="bar-container">
                      <div
                        className="bar-fill bar-precision"
                        style={{
                          width: `${Number(metrics.precision_min || 0) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="metric-bar">
                    <div className="bar-header">
                      <div className="bar-label">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>False Negative</span>
                      </div>
                      <div className="bar-value">
                        {metrics.false_negative ?? "—"}
                      </div>
                    </div>
                    <div className="bar-container">
                      <div
                        className="bar-fill bar-f1"
                        style={{
                          width: `${metrics.false_negative ? 8 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div style={{ color: "#8fb4d9", marginTop: "18px", lineHeight: 1.6 }}>
                    {selectedModel?.description || "Описание модели отсутствует."}
                  </div>
                </div>
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
                  <div style={{ color: "#8fb4d9" }}>Выберите модель из списка.</div>
                ) : (
                  <>
                    <div style={{ color: "#b0c4de", marginBottom: "8px" }}>
                      Выбранная модель
                    </div>

                    <div style={{ color: "#e0e0e0", fontWeight: 600, marginBottom: "18px" }}>
                      {selectedModel.name}
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ color: "#b0c4de", display: "block", marginBottom: "6px" }}>
                        Режим
                      </label>

                      <select
                        value={selectedMode}
                        onChange={(e) => {
                          setSelectedMode(e.target.value);
                          const modeKey = e.target.value;
                          const config = getModeConfig(selectedModel, modeKey);

                          if (selectedModel.model_type === "detection") {
                            setCustomThreshold(
                              config.confidence_threshold !== null && config.confidence_threshold !== undefined
                                ? String(config.confidence_threshold)
                                : getModelMainThreshold(selectedModel)
                            );

                            setCustomIouThreshold(
                              config.iou_threshold !== null && config.iou_threshold !== undefined
                                ? String(config.iou_threshold)
                                : getModelIouThreshold(selectedModel)
                            );
                          } else {
                            setCustomThreshold(
                              config.threshold !== null && config.threshold !== undefined
                                ? String(config.threshold)
                                : getModelMainThreshold(selectedModel)
                            );

                            setCustomIouThreshold("");
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid rgba(60,120,180,0.4)",
                          background: "rgba(20,30,45,0.9)",
                          color: "#e0e0e0",
                        }}
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
                      <label style={{ color: "#b0c4de", display: "block", marginBottom: "6px" }}>
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
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid rgba(60,120,180,0.4)",
                          background: "rgba(20,30,45,0.9)",
                          color: "#e0e0e0",
                        }}
                      />
                    </div>
                    {selectedModel.model_type === "detection" && (
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ color: "#b0c4de", display: "block", marginBottom: "6px" }}>
                        IoU threshold
                      </label>

                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={customIouThreshold}
                        onChange={(e) => setCustomIouThreshold(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid rgba(60,120,180,0.4)",
                          background: "rgba(20,30,45,0.9)",
                          color: "#e0e0e0",
                        }}
                      />
                    </div>
                  )}

                    <div className="action-buttons">
                      <button
                        className="action-btn secondary"
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                      >
                        <i className="fas fa-save"></i> Сохранить настройки
                      </button>

                      <button
                        className="action-btn primary"
                        onClick={handleActivateModel}
                        disabled={isLoading || selectedModel.is_active}
                      >
                        <i className="fas fa-power-off"></i>{" "}
                        {selectedModel.is_active ? "Уже активна" : "Активировать"}
                      </button>
                    </div>
                    {selectedModel &&
                      ["disabled", "error", "planned"].includes(normalizeStatus(selectedModel.status)) && (
                        <div style={{ color: "#ffb4b4", marginTop: "12px", lineHeight: 1.5 }}>
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
                    <strong>Тип:</strong> {getModelTypeText(activeRuntime?.model_type)}
                  </div>
                  <div>
                    <strong>Архитектура:</strong> {activeRuntime?.architecture || "—"}
                  </div>
                  <div>
                    <strong>Device:</strong> {activeRuntime?.device || "—"}
                  </div>
                  <div>
                    <strong>Classes:</strong>{" "}
                    {activeRuntime?.classes?.join(", ") || "—"}
                  </div>
                  <div>
                    <strong>Threshold:</strong>{" "}
                    {activeRuntime?.threshold !== null && activeRuntime?.threshold !== undefined
                      ? Number(activeRuntime.threshold).toFixed(3)
                      : "—"}
                  </div>

                  <div>
                    <strong>Confidence threshold:</strong>{" "}
                    {activeRuntime?.confidence_threshold !== null &&
                    activeRuntime?.confidence_threshold !== undefined
                      ? Number(activeRuntime.confidence_threshold).toFixed(3)
                      : "—"}
                  </div>

                  <div>
                    <strong>IoU threshold:</strong>{" "}
                    {activeRuntime?.iou_threshold !== null &&
                    activeRuntime?.iou_threshold !== undefined
                      ? Number(activeRuntime.iou_threshold).toFixed(3)
                      : "—"}
                  </div>
                  <div>
                    <strong>Weights:</strong> {activeRuntime?.weights_path || "—"}
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
                    <strong>strict</strong> — более высокий threshold, меньше ложных
                    срабатываний, но выше риск пропустить дефект.
                  </p>
                  <p>
                    <strong>balanced</strong> — основной рабочий режим, выбранный после
                    настройки threshold.
                  </p>
                  <p>
                    <strong>sensitive</strong> — более чувствительный режим, снижает риск
                    пропуска дефекта, но может увеличить количество ложных срабатываний.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
};

export default AiPanel;