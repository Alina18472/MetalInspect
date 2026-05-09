import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/journal.css";
import TopNav from "../components/TopNav";
import { api, API_BASE_URL } from "../services/Api";

const normalizeImageUrl = (url) => {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  return `${API_BASE_URL}/${url}`;
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

  if ([x1, y1, x2, y2].some((value) => Number.isNaN(value))) {
    return null;
  }

  if (x2 < x1) [x1, x2] = [x2, x1];
  if (y2 < y1) [y1, y2] = [y2, y1];

  return { x1, y1, x2, y2 };
};

const isSameData = (prev, next) => {
  return JSON.stringify(prev) === JSON.stringify(next);
};

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

const getStatusText = (status) => {
  const map = {
    ok: "OK",
    pending: "Ожидает проверки",
    confirmed: "Подтверждено инженером",
    rejected: "Отклонено как ложное",
    sent_to_mes: "Передано в MES",
  };

  return map[status] || status || "—";
};

const getStatusBadgeClass = (status) => {
  const map = {
    ok: "success",
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

const getConfidenceClass = (confidence) => {
  if (confidence > 0.9) return "high-confidence";
  if (confidence > 0.8) return "medium-confidence";
  return "low-confidence";
};

const getConfidenceTextClass = (confidence) => {
  const value = Number(confidence);

  if (Number.isNaN(value)) return "confidence-text-muted";
  if (value >= 0.9) return "confidence-text-high";
  if (value >= 0.8) return "confidence-text-medium";

  return "confidence-text-low";
};

const isLongComment = (comment) => {
  return String(comment || "").length > 30;
};

const csvCell = (value) => {
  if (value === null || value === undefined) return "";

  let text = "";

  if (typeof value === "object") {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  text = text.replace(/\r?\n|\r/g, " ").trim();

  if (text.includes(";") || text.includes('"') || text.includes(",")) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const Journal = () => {
  const [activeTab, setActiveTab] = useState("inspections");

  const [inspectionData, setInspectionData] = useState([]);
  const [defectData, setDefectData] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    operator: "",
    confidence: "",
    verdict: "",
    search: "",
    aiModelKey: "",
  });

  const [expandedComments, setExpandedComments] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [reviewModal, setReviewModal] = useState({
    open: false,
    event: null,
    comment: "",
    loading: false,
  });

  const [mesConfirmModal, setMesConfirmModal] = useState({
    isOpen: false,
    event: null,
    isSubmitting: false,
  });

  const [accessNotice, setAccessNotice] = useState(null);

  const detailsImgRef = useRef(null);
  const reviewImgRef = useRef(null);
  const loadingRef = useRef(false);
  const accessNoticeTimerRef = useRef(null);

  const [detailsImageBox, setDetailsImageBox] = useState(null);
  const [reviewImageBox, setReviewImageBox] = useState(null);

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

  const loadJournal = useCallback(
    async ({ silent = false } = {}) => {
      if (loadingRef.current) return;

      loadingRef.current = true;

      if (!silent) {
        setIsLoading(true);
      }

      setError("");

      try {
        const [inspections, defects] = await Promise.all([
          api.getInspectionJournal({ limit: 100 }),
          api.getDefectJournal({ limit: 100 }),
        ]);

        const mappedInspections = (inspections.items || []).map((item) => ({
          type: "inspection",

          inspectionId: item.inspection_id,
          defectDbId: item.defect_id,

          time: item.time ? item.time.replace("T", " ") : "",
          shiftId: item.shift_id,
          id: item.ingot_id,

          verdict: item.verdict,
          hasDefect: item.has_defect,

          confidence: item.confidence || item.max_p_crack || 0,
          maxPCrack: item.max_p_crack,
          threshold: item.threshold,
          mode: item.mode,
          framesCount: item.frames_count,

          status: item.defect_status || "ok",
          operator: item.operator || "Автоматически",
          statusChangedBy: item.status_changed_by || null,
          statusChangedById: item.status_changed_by_id || null,
          confirmedAt: item.confirmed_at
            ? item.confirmed_at.replace("T", " ")
            : null,

          comment:
            item.comment ||
            (item.has_defect
              ? "Требуется проверка оператором"
              : "Дефект не обнаружен"),

          defectType: item.defect_type || (item.has_defect ? "crack" : "ok"),

          bestFrameUrl: normalizeImageUrl(item.best_frame_url),

          aiModelId: item.ai_model_id,
          aiModelKey: item.ai_model_key,
          aiModelName: item.ai_model_name,
          aiModelType: item.ai_model_type,
          aiModelArchitecture: item.ai_model_architecture,

          sourceIngotId: item.source_ingot_id,
          cycleNumber: item.cycle_number,
          sequenceNumber: item.sequence_number,

          sentToMesAt: item.sent_to_mes_at,
          mesStatus: item.mes_status,
          mesMessage: item.mes_message,

          bbox: item.bbox || null,
          detections: Array.isArray(item.detections) ? item.detections : [],
          bboxCount:
            item.bbox_count ??
            (Array.isArray(item.detections) ? item.detections.length : 0),
        }));

        const mappedDefects = (defects.items || []).map((item) => ({
          type: "defect",

          defectDbId: item.id,
          inspectionId: item.inspection_id,

          time: item.time ? item.time.replace("T", " ") : "",
          shiftId: item.shift_id,
          id: item.ingot_id,

          confidence: item.confidence || item.max_p_crack || 0,
          maxPCrack: item.max_p_crack,
          threshold: item.threshold,
          mode: item.mode,
          framesCount: item.frames_count,
          verdict: item.verdict || "CRACK",

          status: item.status || "pending",
          operator: item.operator || "Автоматически",
          statusChangedBy: item.status_changed_by || null,
          statusChangedById: item.status_changed_by_id || null,
          confirmedAt: item.confirmed_at
            ? item.confirmed_at.replace("T", " ")
            : null,

          comment: item.comment || "Требуется проверка оператором",
          defectType: item.defect_type || "crack",

          bestFrameUrl: normalizeImageUrl(item.best_frame_url),

          aiModelId: item.ai_model_id,
          aiModelKey: item.ai_model_key,
          aiModelName: item.ai_model_name,
          aiModelType: item.ai_model_type,
          aiModelArchitecture: item.ai_model_architecture,

          sourceIngotId: item.source_ingot_id,
          cycleNumber: item.cycle_number,
          sequenceNumber: item.sequence_number,

          sentToMesAt: item.sent_to_mes_at,
          mesStatus: item.mes_status,
          mesMessage: item.mes_message,

          bbox: item.bbox || null,
          detections: Array.isArray(item.detections) ? item.detections : [],
          bboxCount:
            item.bbox_count ??
            (Array.isArray(item.detections) ? item.detections.length : 0),
        }));

        setInspectionData((prev) =>
          isSameData(prev, mappedInspections) ? prev : mappedInspections
        );

        setDefectData((prev) =>
          isSameData(prev, mappedDefects) ? prev : mappedDefects
        );
      } catch (e) {
        if (
          handleAccessError(
            e,
            "У вас нет прав на просмотр журнала событий."
          )
        ) {
          setError("");
          return;
        }

        setError(e?.message || "Не удалось загрузить журнал");
      } finally {
        loadingRef.current = false;

        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [handleAccessError]
  );

  useEffect(() => {
    loadJournal();

    const interval = setInterval(() => {
      loadJournal({ silent: true });
    }, 3000);

    return () => clearInterval(interval);
  }, [loadJournal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filters]);

  useEffect(() => {
    return () => {
      if (accessNoticeTimerRef.current) {
        clearTimeout(accessNoticeTimerRef.current);
      }
    };
  }, []);

  const updateDetailsImageBox = () => {
    const box = getRenderedImageBox(detailsImgRef.current);
    if (box) setDetailsImageBox(box);
  };

  const updateReviewImageBox = () => {
    const box = getRenderedImageBox(reviewImgRef.current);
    if (box) setReviewImageBox(box);
  };

  useEffect(() => {
    const handleResize = () => {
      updateDetailsImageBox();
      updateReviewImageBox();
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!detailsModalOpen) return;

    const recalculate = () => {
      updateDetailsImageBox();
    };

    requestAnimationFrame(recalculate);

    const timer1 = setTimeout(recalculate, 50);
    const timer2 = setTimeout(recalculate, 200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [detailsModalOpen, selectedEvent?.bestFrameUrl]);

  useEffect(() => {
    if (!reviewModal.open) return;

    const recalculate = () => {
      updateReviewImageBox();
    };

    requestAnimationFrame(recalculate);

    const timer1 = setTimeout(recalculate, 50);
    const timer2 = setTimeout(recalculate, 200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [reviewModal.open, reviewModal.event?.bestFrameUrl]);

  const currentTabData = useMemo(() => {
    return activeTab === "inspections" ? inspectionData : defectData;
  }, [activeTab, inspectionData, defectData]);

  const modelOptions = useMemo(() => {
    return Array.from(
      new Map(
        [...inspectionData, ...defectData]
          .filter((event) => event.aiModelKey || event.aiModelName)
          .map((event) => [
            event.aiModelKey || event.aiModelName,
            event.aiModelName || event.aiModelKey || "Модель без названия",
          ])
      ).entries()
    ).map(([value, label]) => ({
      value,
      label,
    }));
  }, [inspectionData, defectData]);

  const filteredData = useMemo(() => {
    let result = [...currentTabData];

    if (filters.dateFrom) {
      result = result.filter((event) => {
        const eventDate = String(event.time || "").slice(0, 10);
        return eventDate && eventDate >= filters.dateFrom;
      });
    }

    if (filters.dateTo) {
      result = result.filter((event) => {
        const eventDate = String(event.time || "").slice(0, 10);
        return eventDate && eventDate <= filters.dateTo;
      });
    }

    if (filters.search.trim()) {
      const search = filters.search.trim().toLowerCase();

      result = result.filter((event) => {
        return (
          String(event.id || "").toLowerCase().includes(search) ||
          String(event.sourceIngotId || "").toLowerCase().includes(search) ||
          String(event.inspectionId || "").toLowerCase().includes(search) ||
          String(event.defectDbId || "").toLowerCase().includes(search) ||
          String(event.shiftId || "").toLowerCase().includes(search) ||
          String(event.comment || "").toLowerCase().includes(search) ||
          String(event.operator || "").toLowerCase().includes(search) ||
          String(event.aiModelName || "").toLowerCase().includes(search) ||
          String(event.aiModelKey || "").toLowerCase().includes(search)
        );
      });
    }

    if (filters.status) {
      result = result.filter((event) => event.status === filters.status);
    }

    if (filters.verdict) {
      result = result.filter((event) => event.verdict === filters.verdict);
    }

    if (filters.aiModelKey) {
      result = result.filter((event) => {
        const modelValue = event.aiModelKey || event.aiModelName || "";
        return modelValue === filters.aiModelKey;
      });
    }

    if (filters.operator) {
      if (filters.operator === "auto") {
        result = result.filter((event) => event.operator === "Автоматически");
      }

      if (filters.operator === "user") {
        result = result.filter((event) => event.operator !== "Автоматически");
      }
    }

    if (filters.confidence) {
      result = result.filter((event) => {
        const value = Number(event.confidence || 0);

        if (filters.confidence === "high") return value >= 0.9;
        if (filters.confidence === "medium") return value >= 0.75 && value < 0.9;
        if (filters.confidence === "low") return value < 0.75;

        return true;
      });
    }

    return result;
  }, [currentTabData, filters]);

  const totalPages = Math.max(Math.ceil(filteredData.length / recordsPerPage), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const indexOfLastRecord = safeCurrentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      status: "",
      operator: "",
      confidence: "",
      verdict: "",
      search: "",
      aiModelKey: "",
    });

    setCurrentPage(1);
  };

  const nextPage = () => {
    if (safeCurrentPage < totalPages) {
      setCurrentPage(safeCurrentPage + 1);
    }
  };

  const prevPage = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage(safeCurrentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const toggleComment = (key) => {
    setExpandedComments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const viewEventDetails = (event) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  const openReviewModal = (event) => {
    setReviewModal({
      open: true,
      event,
      comment: event.status === "pending" ? "" : event.comment || "",
      loading: false,
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      open: false,
      event: null,
      comment: "",
      loading: false,
    });
  };

  const getEventDetections = (event) => {
    if (!event) return [];

    if (Array.isArray(event.detections) && event.detections.length > 0) {
      return event.detections;
    }

    if (event.bbox) {
      return [{ bbox: event.bbox, confidence: event.confidence }];
    }

    return [];
  };

  const isDetectionModel = (modelType, architecture) => {
    const value = `${modelType || ""} ${architecture || ""}`.toLowerCase();

    return (
      value.includes("detection") ||
      value.includes("detector") ||
      value.includes("yolo")
    );
  };

  const eventUsesBbox = (event) => {
    if (!event) return false;

    return (
      isDetectionModel(event.aiModelType, event.aiModelArchitecture) ||
      getEventDetections(event).length > 0
    );
  };

  const getBboxStyle = (det, targetImageBox) => {
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

  const renderBboxes = (event, targetImageBox) =>
    getEventDetections(event).map((det, index) => {
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

  const submitConfirmReview = async () => {
    if (!reviewModal.event?.defectDbId) return;

    const comment =
      reviewModal.comment.trim() || "Трещина подтверждена визуально";

    try {
      setReviewModal((prev) => ({
        ...prev,
        loading: true,
      }));

      await api.confirmDefect(reviewModal.event.defectDbId, comment);
      await loadJournal({ silent: true });

      closeReviewModal();
    } catch (e) {
      if (
        handleAccessError(
          e,
          "Для подтверждения дефекта требуется право «Проверка дефектов»."
        )
      ) {
        setReviewModal((prev) => ({
          ...prev,
          loading: false,
        }));

        return;
      }

      setError(e?.message || "Не удалось подтвердить дефект");

      setReviewModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const submitRejectReview = async () => {
    if (!reviewModal.event?.defectDbId) return;

    const comment = reviewModal.comment.trim() || "Ложное срабатывание";

    try {
      setReviewModal((prev) => ({
        ...prev,
        loading: true,
      }));

      await api.rejectDefect(reviewModal.event.defectDbId, comment);
      await loadJournal({ silent: true });

      closeReviewModal();
    } catch (e) {
      if (
        handleAccessError(
          e,
          "Для отклонения дефекта требуется право «Проверка дефектов»."
        )
      ) {
        setReviewModal((prev) => ({
          ...prev,
          loading: false,
        }));

        return;
      }

      setError(e?.message || "Не удалось отклонить срабатывание");

      setReviewModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const sendToMesFromJournal = (event) => {
    if (!event?.defectDbId) {
      setError("Не удалось определить ID дефекта для передачи в MES");
      return;
    }

    setError("");

    setMesConfirmModal({
      isOpen: true,
      event: { ...event },
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

  const confirmSendToMesFromJournal = async () => {
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
      await loadJournal({ silent: true });

      setMesConfirmModal({
        isOpen: false,
        event: null,
        isSubmitting: false,
      });

      closeReviewModal();
      setDetailsModalOpen(false);
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

  const getStatusBadge = (status) => {
    if (status === "ok") {
      return <span className="status-badge status-confirmed">OK</span>;
    }

    if (status === "confirmed") {
      return <span className="status-badge status-confirmed">Подтверждено</span>;
    }

    if (status === "rejected") {
      return <span className="status-badge status-rejected">Отклонено</span>;
    }

    if (status === "sent_to_mes") {
      return (
        <span className="status-badge status-confirmed">Передано в MES</span>
      );
    }

    return <span className="status-badge status-pending">Ожидает</span>;
  };

  const getExportRows = () => {
    return filteredData.map((event) => ({
      "Тип записи":
        event.type === "inspection" ? "Проверка слитка" : "Дефектное событие",
      Время: event.time || "",
      "ID проверки": event.inspectionId || "",
      "ID дефекта": event.defectDbId || "",
      "ID слитка": event.id || "",
      "Исходный слиток": event.sourceIngotId || "",
      "ID смены": event.shiftId || "",
      "Вердикт ИИ": event.verdict || "",
      Статус: getStatusText(event.status),
      Оператор: event.operator || "Автоматически",
      "Статус изменил": event.statusChangedBy || "",
      "Дата изменения статуса": event.confirmedAt || "",
      Комментарий: event.comment || "",
      "Тип дефекта":
        event.defectType === "crack" ? "Трещина" : event.defectType || "",
      "Уверенность ИИ, %": Math.round(Number(event.confidence || 0) * 100),
      max_p_crack: formatNumber(event.maxPCrack),
      threshold: formatNumber(event.threshold),
      Режим: event.mode || "",
      "Кадров в слитке": event.framesCount || "",
      "AI-модель": event.aiModelName || "",
      "Ключ модели": event.aiModelKey || "",
      "Тип модели": event.aiModelType || "",
      "Архитектура модели": event.aiModelArchitecture || "",
      "Количество bbox": event.bboxCount || 0,
      bbox: event.bbox || "",
      detections: event.detections || "",
      "Ссылка на кадр": event.bestFrameUrl || "",
    }));
  };

  const exportJournalToCsv = () => {
    if (!filteredData.length) {
      setError("Нет данных для экспорта");
      return;
    }

    const rows = getExportRows();
    const headers = Object.keys(rows[0]);

    const csvContent = [
      headers.map(csvCell).join(";"),
      ...rows.map((row) =>
        headers.map((header) => csvCell(row[header])).join(";")
      ),
    ].join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const now = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", "_")
      .replace(/:/g, "-");

    const tabName = activeTab === "inspections" ? "inspections" : "defects";
    const fileName = `journal_${tabName}_${now}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedEventHasDefect = Boolean(selectedEvent?.defectDbId);

  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => {
      if (totalPages <= 5) return index + 1;
      if (safeCurrentPage <= 3) return index + 1;
      if (safeCurrentPage >= totalPages - 2) return totalPages - 4 + index;
      return safeCurrentPage - 2 + index;
    }
  );

  return (
    <div className="journal-page">
      <TopNav
        subtitle="Система распознавания трещин в слитках - Журнал событий"
        userName="Оператор Иванов А.С."
        userRole="Контроль качества"
      />

      {error && (
        <div
          style={{
            color: "#f44336",
            padding: "12px 20px",
            fontWeight: "600",
          }}
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div
          style={{
            color: "#8fb4d9",
            padding: "12px 20px",
            fontWeight: "600",
          }}
        >
          Загрузка журнала...
        </div>
      )}

      <div className="journal-main-content">
        <div className="journal-sidebar">
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button
              className={`filter-btn ${
                activeTab === "inspections" ? "primary" : "secondary"
              }`}
              onClick={() => setActiveTab("inspections")}
            >
              Все проверки
            </button>

            <button
              className={`filter-btn ${
                activeTab === "defects" ? "primary" : "secondary"
              }`}
              onClick={() => setActiveTab("defects")}
            >
              Дефектные события
            </button>
          </div>

          <div className="filters-panel">
            <div className="panel-header">
              <h2>Фильтрация событий</h2>
            </div>

            <div className="filters-content">
              <div className="filter-group">
                <label>Дата проверки</label>

                <div className="date-filter-row">
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      handleFilterChange("dateFrom", e.target.value)
                    }
                  />

                  <input
                    type="date"
                    className="filter-input"
                    value={filters.dateTo}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="filter-group">
                <label htmlFor="search">Поиск</label>

                <input
                  type="text"
                  id="search"
                  className="filter-input"
                  placeholder="ID слитка, смена, комментарий, оператор"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="status">Статус</label>

                <select
                  id="status"
                  className="filter-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="">Все статусы</option>

                  {activeTab === "inspections" && <option value="ok">OK</option>}

                  <option value="pending">Ожидает проверки</option>
                  <option value="confirmed">Подтверждено инженером</option>
                  <option value="rejected">Отклонено как ложное</option>
                  <option value="sent_to_mes">Передано в MES</option>
                </select>
              </div>

              {activeTab === "inspections" && (
                <div className="filter-group">
                  <label htmlFor="verdict">Вердикт ИИ</label>

                  <select
                    id="verdict"
                    className="filter-select"
                    value={filters.verdict}
                    onChange={(e) =>
                      handleFilterChange("verdict", e.target.value)
                    }
                  >
                    <option value="">Все результаты</option>
                    <option value="CRACK">CRACK</option>
                    <option value="OK">OK</option>
                  </select>
                </div>
              )}

              <div className="filter-group">
                <label htmlFor="operator">Исполнитель</label>

                <select
                  id="operator"
                  className="filter-select"
                  value={filters.operator}
                  onChange={(e) => handleFilterChange("operator", e.target.value)}
                >
                  <option value="">Все операторы</option>
                  <option value="auto">Автоматически</option>
                  <option value="user">Пользователь</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="confidence">Уверенность ИИ</label>

                <select
                  id="confidence"
                  className="filter-select"
                  value={filters.confidence}
                  onChange={(e) =>
                    handleFilterChange("confidence", e.target.value)
                  }
                >
                  <option value="">Любая уверенность</option>
                  <option value="high">Высокая (&gt;90%)</option>
                  <option value="medium">Средняя (75-90%)</option>
                  <option value="low">Низкая (&lt;75%)</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="aiModelKey">AI-модель</label>

                <select
                  id="aiModelKey"
                  className="filter-select"
                  value={filters.aiModelKey}
                  onChange={(e) =>
                    handleFilterChange("aiModelKey", e.target.value)
                  }
                >
                  <option value="">Все модели</option>

                  {modelOptions.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <button className="filter-btn secondary" onClick={resetFilters}>
                Сбросить фильтры
              </button>
            </div>
          </div>
        </div>

        <div className="journal-main-panel">
          <div className="panel-header">
            <h2>
              {activeTab === "inspections"
                ? "Журнал проверок слитков"
                : "Журнал дефектных событий"}
            </h2>

            <div className="controls">
              <div className="record-count">Найдено {filteredData.length} записей</div>

              <button
                className="filter-btn secondary export-btn"
                onClick={exportJournalToCsv}
                disabled={filteredData.length === 0}
              >
                Экспорт CSV
              </button>
            </div>
          </div>

          <div className="journal-content">
            <div className="journal-table-container">
              <table className="journal-table">
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>ID слитка</th>
                    <th>Результат ИИ</th>
                    <th>Статус</th>
                    <th>Оператор</th>
                    <th>Комментарий</th>
                    <th>Действия</th>
                  </tr>
                </thead>

                <tbody>
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#8fb4d9",
                        }}
                      >
                        <div>По заданным фильтрам записей не найдено</div>
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((event) => {
                      const eventKey = `${event.type}-${
                        event.inspectionId || event.defectDbId
                      }`;
                      const confidencePercent = Math.round(event.confidence * 100);

                      return (
                        <tr key={eventKey}>
                          <td className="time-cell">{event.time}</td>
                          <td className="id-cell">{event.id}</td>

                          <td>
                            <div className="confidence-cell">
                              <div className="confidence-bar">
                                <div
                                  className={`confidence-fill ${getConfidenceClass(
                                    event.confidence
                                  )}`}
                                  style={{ width: `${confidencePercent}%` }}
                                ></div>
                              </div>

                              <span>{confidencePercent}%</span>
                            </div>
                          </td>

                          <td>{getStatusBadge(event.status)}</td>

                          <td>
                            <div className="operator-cell">
                              <span>{event.operator}</span>
                            </div>
                          </td>

                          <td className="comment-cell">
                            <div
                              className={`comment-preview ${
                                expandedComments[eventKey] ? "expanded" : ""
                              }`}
                            >
                              {event.comment || "—"}
                            </div>

                            {isLongComment(event.comment) && (
                              <button
                                type="button"
                                className="comment-toggle-btn"
                                onClick={() => toggleComment(eventKey)}
                              >
                                {expandedComments[eventKey]
                                  ? "Свернуть"
                                  : "Показать полностью"}
                              </button>
                            )}
                          </td>

                          <td className="action-cell">
                            {event.defectDbId && event.status !== "ok" && (
                              <button
                                className="action-btn action-review"
                                title="Решение инженера"
                                onClick={() => openReviewModal(event)}
                              >
                                Решение
                              </button>
                            )}

                            <button
                              className="action-btn"
                              title="Подробная информация"
                              onClick={() => viewEventDetails(event)}
                            >
                              Детали
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <div className="pagination-info">
                {filteredData.length === 0
                  ? "Нет записей для отображения"
                  : `Показаны записи ${indexOfFirstRecord + 1}-${Math.min(
                      indexOfLastRecord,
                      filteredData.length
                    )} из ${filteredData.length}`}
              </div>

              <div className="pagination-controls">
                <div
                  className={`page-btn ${safeCurrentPage === 1 ? "disabled" : ""}`}
                  onClick={prevPage}
                >
                  <span>‹</span>
                </div>

                {pageNumbers.map((pageNum) => (
                  <div
                    key={pageNum}
                    className={`page-btn ${
                      safeCurrentPage === pageNum ? "active" : ""
                    }`}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </div>
                ))}

                <div
                  className={`page-btn ${
                    safeCurrentPage === totalPages ? "disabled" : ""
                  }`}
                  onClick={nextPage}
                >
                  <span>›</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {detailsModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={() => setDetailsModalOpen(false)}>
          <div
            className="modal-content event-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Детали события</h3>

              <button
                className="close-modal"
                onClick={() => setDetailsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div
                className={`details-modal-layout ${
                  selectedEventHasDefect ? "with-image" : "without-image"
                }`}
              >
                {selectedEventHasDefect && (
                  <aside className="details-image-column">
                    <div className="modal-defect-image-card">
                      <div className="modal-defect-image-header">
                        <h4>Кадр дефекта</h4>

                        <span>
                          {eventUsesBbox(selectedEvent)
                            ? `BBOX: ${
                                selectedEvent.bboxCount ||
                                getEventDetections(selectedEvent).length
                              }`
                            : "BBOX: —"}
                        </span>
                      </div>

                      {selectedEvent.bestFrameUrl ? (
                        <div className="modal-defect-image-wrapper">
                          <img
                            ref={detailsImgRef}
                            src={selectedEvent.bestFrameUrl}
                            alt="Кадр дефекта"
                            className="modal-defect-image"
                            onLoad={() => {
                              requestAnimationFrame(updateDetailsImageBox);
                            }}
                          />

                          {eventUsesBbox(selectedEvent) &&
                            renderBboxes(selectedEvent, detailsImageBox)}
                        </div>
                      ) : (
                        <div className="modal-image-empty">
                          <span>Кадр дефекта недоступен</span>
                        </div>
                      )}
                    </div>
                  </aside>
                )}

                <div className="details-info-column">
                  <div className="details-grid">
                    <div className="details-section">
                      <h4>Общая информация</h4>

                      <div className="details-row">
                        <span>ID проверки:</span>
                        <strong>{selectedEvent.inspectionId || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>ID дефекта:</span>
                        <strong>{selectedEvent.defectDbId || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>ID слитка:</span>
                        <strong>{selectedEvent.id || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Исходный слиток:</span>
                        <strong>{selectedEvent.sourceIngotId || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Смена:</span>
                        <strong>{selectedEvent.shiftId || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Время:</span>
                        <strong>{selectedEvent.time || "—"}</strong>
                      </div>
                    </div>

                    <div className="details-section">
                      <h4>Результат ИИ</h4>

                      <div className="details-row">
                        <span>Вердикт:</span>
                        <strong>{selectedEvent.verdict || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>max_p_crack:</span>
                        <strong>{formatNumber(selectedEvent.maxPCrack)}</strong>
                      </div>

                      <div className="details-row">
                        <span>threshold:</span>
                        <strong>{formatNumber(selectedEvent.threshold)}</strong>
                      </div>

                      <div className="details-row">
                        <span>Режим:</span>
                        <strong>{selectedEvent.mode || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Кадров в слитке:</span>
                        <strong>{selectedEvent.framesCount || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>BBOX:</span>
                        <strong>{selectedEvent.bboxCount || 0}</strong>
                      </div>
                    </div>

                    <div className="details-section">
                      <h4>Модель</h4>

                      <div className="details-row">
                        <span>Название:</span>
                        <strong>{selectedEvent.aiModelName || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Тип:</span>
                        <strong>{selectedEvent.aiModelType || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Архитектура:</span>
                        <strong>{selectedEvent.aiModelArchitecture || "—"}</strong>
                      </div>
                    </div>

                    <div className="details-section">
                      <h4>Статус проверки</h4>

                      <div className="details-row">
                        <span>Статус:</span>
                        <strong>{selectedEvent.status || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Оператор:</span>
                        <strong>{selectedEvent.operator || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Статус изменил:</span>
                        <strong>{selectedEvent.statusChangedBy || "—"}</strong>
                      </div>

                      <div className="details-row">
                        <span>Дата изменения:</span>
                        <strong>{selectedEvent.confirmedAt || "—"}</strong>
                      </div>

                      <div className="details-comment-box">
                        <span>Комментарий:</span>
                        <p>{selectedEvent.comment || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              {selectedEvent.defectDbId && selectedEvent.status === "confirmed" && (
                <button
                  type="button"
                  className="modal-btn primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendToMesFromJournal(selectedEvent);
                  }}
                >
                  Передать в MES
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewModal.open && reviewModal.event && (
        <div
          className="modal-overlay"
          style={{ display: "flex" }}
          onClick={closeReviewModal}
        >
          <div className="defect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-block">
                <h3>Детализация дефекта</h3>

                <p>
                  {reviewModal.event.id} • {reviewModal.event.time}
                </p>

                <div className="modal-header-badges">
                  <span
                    className={`status-badge ${getModalVerdictClass(
                      reviewModal.event
                    )}`}
                  >
                    {getModalVerdictText(reviewModal.event)}
                  </span>

                  <span className="status-badge dark">
                    {reviewModal.event.aiModelName ||
                      reviewModal.event.aiModelKey ||
                      "AI-модель"}
                  </span>

                  <span
                    className={`status-badge ${getStatusBadgeClass(
                      reviewModal.event.status
                    )}`}
                  >
                    {getStatusText(reviewModal.event.status)}
                  </span>
                </div>
              </div>

              <button className="close-modal" onClick={closeReviewModal}>
                &times;
              </button>
            </div>

            <div className="defect-modal-body">
              <div className="defect-image-panel">
                {reviewModal.event.bestFrameUrl ? (
                  <>
                    <img
                      ref={reviewImgRef}
                      src={reviewModal.event.bestFrameUrl}
                      alt={`Лучший кадр ${reviewModal.event.id}`}
                      onLoad={() => {
                        requestAnimationFrame(updateReviewImageBox);
                      }}
                      className="defect-image"
                    />

                    {eventUsesBbox(reviewModal.event) &&
                      renderBboxes(reviewModal.event, reviewImageBox)}
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
                    <strong>{getStatusText(reviewModal.event.status)}</strong>
                  </div>

                  {reviewModal.event.status === "pending" && (
                    <>
                      <textarea
                        className="engineer-comment-input"
                        value={reviewModal.comment}
                        onChange={(e) =>
                          setReviewModal((prev) => ({
                            ...prev,
                            comment: e.target.value,
                          }))
                        }
                        placeholder="Введите комментарий: например, 'Трещина подтверждена визуально'"
                      />

                      <div className="modal-actions">
                        <button
                          className="control-btn"
                          onClick={submitConfirmReview}
                          disabled={reviewModal.loading}
                        >
                          {reviewModal.loading
                            ? "Сохранение..."
                            : "Подтвердить дефект"}
                        </button>

                        <button
                          className="control-btn secondary"
                          onClick={submitRejectReview}
                          disabled={reviewModal.loading}
                        >
                          {reviewModal.loading ? "Сохранение..." : "Отклонить"}
                        </button>
                      </div>
                    </>
                  )}

                  {reviewModal.event.status === "confirmed" && (
                    <>
                      <p className="decision-note">
                        Дефект подтверждён инженером. Можно передать информацию в
                        MES.
                      </p>

                      <div className="modal-actions">
                        <button
                          type="button"
                          className="control-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendToMesFromJournal(reviewModal.event);
                          }}
                        >
                          Передать в MES
                        </button>
                      </div>
                    </>
                  )}

                  {reviewModal.event.status === "sent_to_mes" && (
                    <div className="result-message success">
                      Дефект подтверждён и передан в MES
                    </div>
                  )}

                  {reviewModal.event.status === "rejected" && (
                    <div className="result-message warning">
                      Срабатывание отклонено инженером
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <h4>AI-результат</h4>

                  <div className="detail-row">
                    <span>ID слитка</span>
                    <strong>{reviewModal.event.id}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Вердикт</span>
                    <strong>{getModalVerdictText(reviewModal.event)}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Уверенность</span>
                    <strong
                      className={getConfidenceTextClass(
                        reviewModal.event.confidence
                      )}
                    >
                      {formatPercent(reviewModal.event.confidence)}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Модель</span>
                    <strong>
                      {reviewModal.event.aiModelName ||
                        reviewModal.event.aiModelKey ||
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
                        {reviewModal.event.status === "sent_to_mes"
                          ? "Передано в MES"
                          : reviewModal.event.mesStatus || "Не передано"}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>Время передачи</span>
                      <strong>
                        {reviewModal.event.sentToMesAt
                          ? reviewModal.event.sentToMesAt.replace("T", " ")
                          : "—"}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>Сообщение</span>
                      <strong>{reviewModal.event.mesMessage || "—"}</strong>
                    </div>
                  </div>
                </details>

                <details className="detail-section technical-details">
                  <summary>Технические данные проверки</summary>

                  <div className="technical-details-body">
                    <div className="detail-row">
                      <span>max_p_crack</span>
                      <strong>{formatNumber(reviewModal.event.maxPCrack)}</strong>
                    </div>

                    <div className="detail-row">
                      <span>Threshold</span>
                      <strong>{formatNumber(reviewModal.event.threshold)}</strong>
                    </div>

                    <div className="detail-row">
                      <span>Кадров в слитке</span>
                      <strong>{reviewModal.event.framesCount || "—"}</strong>
                    </div>

                    <div className="detail-row">
                      <span>BBOX</span>
                      <strong>{reviewModal.event.bboxCount || 0}</strong>
                    </div>

                    <div className="detail-row">
                      <span>Тип модели</span>
                      <strong>{reviewModal.event.aiModelType || "—"}</strong>
                    </div>

                    <div className="detail-row">
                      <span>Архитектура</span>
                      <strong>
                        {reviewModal.event.aiModelArchitecture || "—"}
                      </strong>
                    </div>
                  </div>
                </details>

                <div className="detail-section">
                  <h4>Комментарий</h4>
                  <p className="defect-comment">
                    {reviewModal.event.comment || "Комментарий пока отсутствует"}
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
                  Информация о подтверждённом дефекте будет передана во внешнюю
                  MES-систему. После передачи событие получит статус «Передано в
                  MES».
                </p>
              </div>
            </div>

            <div className="mes-confirm-info">
              <div className="mes-confirm-row">
                <span>ID слитка</span>
                <strong>{mesConfirmModal.event?.id || "—"}</strong>
              </div>

              <div className="mes-confirm-row">
                <span>ID дефекта</span>
                <strong>{mesConfirmModal.event?.defectDbId || "—"}</strong>
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
                <strong>{formatPercent(mesConfirmModal.event?.confidence)}</strong>
              </div>

              <div className="mes-confirm-row">
                <span>Статус</span>
                <strong>{getStatusText(mesConfirmModal.event?.status)}</strong>
              </div>

              <div className="mes-confirm-row">
                <span>Время события</span>
                <strong>{mesConfirmModal.event?.time || "—"}</strong>
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
                onClick={confirmSendToMesFromJournal}
                disabled={mesConfirmModal.isSubmitting}
              >
                {mesConfirmModal.isSubmitting ? "Передача..." : "Передать в MES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {accessNotice && (
        <div
          className={`journal-access-notice ${accessNotice.show ? "show" : ""}`}
        >
          <div>
            <strong>Недостаточно прав</strong>
            <p>{accessNotice.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;