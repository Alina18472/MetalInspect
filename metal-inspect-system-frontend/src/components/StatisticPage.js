import "../styles/statistic.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import TopNav from "../components/TopNav";
import { api } from "../services/Api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const INITIAL_FILTERS = {
  dateFrom: "",
  dateTo: "",
  shiftId: "all",
  defectStatus: "all",
};

const INITIAL_META = {
  total: 0,
  page: 1,
  page_size: 10,
  total_pages: 1,
  has_next: false,
  has_prev: false,
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

const FloatingNotice = ({ notice, offset = 0 }) => {
  if (!notice) return null;

  const type = notice.type || "info";

  const style = {
    ...(NOTICE_STYLES[type] || NOTICE_STYLES.info),
    top: offset ? `calc(96px + ${offset}px)` : undefined,
  };

  return (
    <div
      className={`statistic-floating-notice ${type} ${
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

const getNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? fallback : numberValue;
};

const getOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? null : numberValue;
};

const Statistic = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [summary, setSummary] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [allShifts, setAllShifts] = useState([]);

  const [notification, setNotification] = useState(null);
  const notificationTimerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [shiftPage, setShiftPage] = useState(1);
  const [shiftPageSize, setShiftPageSize] = useState(10);
  const [shiftsMeta, setShiftsMeta] = useState(INITIAL_META);

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

  const buildStatsParams = (sourceFilters) => {
    const params = {};

    if (sourceFilters.dateFrom) {
      params.date_from = sourceFilters.dateFrom;
    }

    if (sourceFilters.dateTo) {
      params.date_to = sourceFilters.dateTo;
    }

    if (sourceFilters.shiftId && sourceFilters.shiftId !== "all") {
      params.shift_id = sourceFilters.shiftId;
    }

    if (sourceFilters.defectStatus && sourceFilters.defectStatus !== "all") {
      params.defect_status = sourceFilters.defectStatus;
    }

    return params;
  };

  const loadStatistics = async (
    nextFilters = filters,
    nextPage = shiftPage,
    nextPageSize = shiftPageSize
  ) => {
    setIsLoading(true);

    try {
      const baseParams = buildStatsParams(nextFilters);

      const shiftsParams = {
        ...baseParams,
        page: nextPage,
        page_size: nextPageSize,
      };

      const [summaryData, shiftsData, allShiftsData] = await Promise.all([
        api.getStatsSummary(baseParams),
        api.getShiftsStats(shiftsParams),
        api.getShiftsStats({ page: 1, page_size: 100 }),
      ]);

      setSummary(summaryData || null);
      setShifts(Array.isArray(shiftsData?.items) ? shiftsData.items : []);
      setAllShifts(
        Array.isArray(allShiftsData?.items) ? allShiftsData.items : []
      );

      setShiftsMeta({
        total: getNumber(shiftsData?.total),
        page: getNumber(shiftsData?.page, nextPage),
        page_size: getNumber(shiftsData?.page_size, nextPageSize),
        total_pages: getNumber(shiftsData?.total_pages, 1),
        has_next: Boolean(shiftsData?.has_next),
        has_prev: Boolean(shiftsData?.has_prev),
      });
    } catch (e) {
      showNotification(e?.message || "Не удалось загрузить статистику", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics(INITIAL_FILTERS, 1, 10);

    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = () => {
    setShiftPage(1);
    loadStatistics(filters, 1, shiftPageSize);
    showNotification("Фильтры применены", "success");
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setShiftPage(1);
    loadStatistics(INITIAL_FILTERS, 1, shiftPageSize);
    showNotification("Фильтры сброшены", "info");
  };

  const goToShiftPage = (nextPage) => {
    const totalPages = shiftsMeta.total_pages || 1;
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);

    setShiftPage(normalizedPage);
    loadStatistics(filters, normalizedPage, shiftPageSize);
  };

  const handleShiftPageSizeChange = (value) => {
    const nextPageSize = Number(value);

    setShiftPageSize(nextPageSize);
    setShiftPage(1);
    loadStatistics(filters, 1, nextPageSize);
  };

  const formatDate = (value) => {
    if (!value) return "—";
    return String(value).replace("T", " ");
  };

  const formatDecimal = (value, digits = 3) => {
    if (value === null || value === undefined || value === "") return "—";

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) return "—";

    return numberValue.toFixed(digits);
  };

  const statusText = (status) => {
    const map = {
      running: "Идёт",
      finished: "Завершена",
      stopped: "Остановлена",
      error: "Ошибка",
      pending: "Ожидает проверки",
      confirmed: "Подтверждено",
      rejected: "Отклонено",
      sent_to_mes: "Передано в MES",
    };

    return map[status] || status || "—";
  };

  const getPeriodText = () => {
    if (filters.dateFrom || filters.dateTo) {
      return `${filters.dateFrom || "начало"} — ${
        filters.dateTo || "сейчас"
      }`;
    }

    return "Всё время";
  };

  const aiCheckedCount = getNumber(
    summary?.ai_checked_count ?? summary?.inspections_count
  );

  const aiOkCount = getNumber(summary?.ai_ok_count ?? summary?.ok_count);
  const aiCrackCount = getNumber(summary?.ai_crack_count ?? summary?.crack_count);

  const aiDefectRate = getNumber(
    summary?.ai_defect_rate ?? summary?.defect_rate
  );

  const avgAiDefectMaxPCrack = summary?.avg_max_p_crack_ai_defects;
  const avgConfirmedDefectMaxPCrack =
    summary?.avg_max_p_crack_confirmed_defects;

  const pendingStatusCount = getNumber(
    summary?.engineer_pending_count ?? summary?.defects_pending
  );

  const confirmedStatusCount = getNumber(
    summary?.engineer_confirmed_status_count ?? summary?.defects_confirmed
  );

  const rejectedStatusCount = getNumber(
    summary?.engineer_rejected_count ?? summary?.defects_rejected
  );

  const sentToMesCount = getNumber(
    summary?.engineer_sent_to_mes_count ?? summary?.defects_sent_to_mes
  );

  const engineerConfirmedCount =
    summary?.engineer_confirmed_count !== undefined &&
    summary?.engineer_confirmed_count !== null
      ? getNumber(summary.engineer_confirmed_count)
      : confirmedStatusCount + sentToMesCount;

  const engineerReviewedCount =
    summary?.engineer_reviewed_count !== undefined &&
    summary?.engineer_reviewed_count !== null
      ? getNumber(summary.engineer_reviewed_count)
      : confirmedStatusCount + rejectedStatusCount + sentToMesCount;

  const falseAlarmRateReviewed = getNumber(
    summary?.false_alarm_rate_reviewed ?? summary?.false_alarm_rate
  );

  const engineerConfirmationRate = getNumber(
    summary?.engineer_confirmation_rate
  );

  const chartData = useMemo(() => {
    return [...shifts]
      .slice(0, 8)
      .reverse()
      .map((shift) => {
        const shiftConfirmedStatus = getNumber(
          shift.engineer_confirmed_status_count ?? shift.defects_confirmed
        );

        const shiftSentToMes = getNumber(
          shift.engineer_sent_to_mes_count ?? shift.defects_sent_to_mes
        );

        return {
          name: `#${shift.shift_id}`,
          shiftId: shift.shift_id,

          aiOk: getNumber(shift.ai_ok_count ?? shift.total_ok),
          aiCrack: getNumber(shift.ai_crack_count ?? shift.total_crack),
          aiDefectRate: getNumber(shift.ai_defect_rate ?? shift.defect_rate),

          avgMaxPCrackAiDefects: getOptionalNumber(
            shift.avg_max_p_crack_ai_defects
          ),
          avgMaxPCrackConfirmedDefects: getOptionalNumber(
            shift.avg_max_p_crack_confirmed_defects
          ),

          engineerPending: getNumber(
            shift.engineer_pending_count ?? shift.defects_pending
          ),
          engineerConfirmedStatus: shiftConfirmedStatus,
          engineerRejected: getNumber(
            shift.engineer_rejected_count ?? shift.defects_rejected
          ),
          engineerSentToMes: shiftSentToMes,
          engineerConfirmedTotal:
            shift.engineer_confirmed_count !== undefined &&
            shift.engineer_confirmed_count !== null
              ? getNumber(shift.engineer_confirmed_count)
              : shiftConfirmedStatus + shiftSentToMes,
          falseAlarmRateReviewed: getNumber(
            shift.false_alarm_rate_reviewed ?? shift.false_alarm_rate
          ),
        };
      });
  }, [shifts]);

  const statusChartData = useMemo(() => {
    return [
      { name: "Ожидает", value: pendingStatusCount, color: "#fbbf24" },
      { name: "Подтверждено", value: confirmedStatusCount, color: "#22c55e" },
      { name: "Отклонено", value: rejectedStatusCount, color: "#ef4444" },
      { name: "Передано в MES", value: sentToMesCount, color: "#38bdf8" },
    ].filter((item) => item.value > 0);
  }, [
    pendingStatusCount,
    confirmedStatusCount,
    rejectedStatusCount,
    sentToMesCount,
  ]);

  const paginationStart =
    shiftsMeta.total > 0
      ? (shiftsMeta.page - 1) * shiftsMeta.page_size + 1
      : 0;

  const paginationEnd = Math.min(
    shiftsMeta.page * shiftsMeta.page_size,
    shiftsMeta.total
  );

  const pageNumbers = Array.from(
    { length: shiftsMeta.total_pages || 1 },
    (_, index) => index + 1
  ).filter((page) => {
    const current = shiftsMeta.page || 1;

    return (
      page === 1 ||
      page === shiftsMeta.total_pages ||
      Math.abs(page - current) <= 2
    );
  });

  return (
    <div className="statistic-page">
      <div className="statistic-page-bg"></div>

      <FloatingNotice notice={notification} />

        {isLoading && (
          <FloatingNotice
            notice={{
              message: "Загрузка статистики...",
              type: "info",
              title: "Информация",
              show: true,
            }}
            offset={notification ? 96 : 0}
          />
        )}

      <div className="statistic-container">
        <TopNav
          subtitle="Система распознавания трещин в слитках - Статистика"
          userName="Оператор системы"
          userRole="Контроль качества"
        />

        <div className="statistic-main-content">
          <div className="statistic-filters-panel">
            <div className="statistic-filters-flex">
              <div className="statistic-filter-group">
                <label className="statistic-filter-label">Дата с</label>

                <input
                  type="date"
                  className="statistic-filter-select"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                />
              </div>

              <div className="statistic-filter-group">
                <label className="statistic-filter-label">Дата по</label>

                <input
                  type="date"
                  className="statistic-filter-select"
                  value={filters.dateTo}
                  onChange={(e) =>
                    handleFilterChange("dateTo", e.target.value)
                  }
                />
              </div>

              <div className="statistic-filter-group">
                <label className="statistic-filter-label">Смена</label>

                <select
                  className="statistic-filter-select"
                  value={filters.shiftId}
                  onChange={(e) =>
                    handleFilterChange("shiftId", e.target.value)
                  }
                >
                  <option value="all">Все смены</option>

                  {allShifts.map((shift) => (
                    <option key={shift.shift_id} value={shift.shift_id}>
                      Смена #{shift.shift_id} — {statusText(shift.status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="statistic-filter-group">
                <label className="statistic-filter-label">
                  Статус события
                </label>

                <select
                  className="statistic-filter-select"
                  value={filters.defectStatus}
                  onChange={(e) =>
                    handleFilterChange("defectStatus", e.target.value)
                  }
                >
                  <option value="all">Все статусы</option>
                  <option value="pending">Ожидает проверки</option>
                  <option value="confirmed">Подтверждено</option>
                  <option value="rejected">Отклонено</option>
                  <option value="sent_to_mes">Передано в MES</option>
                </select>
              </div>

              <div className="statistic-filter-buttons">
                <button
                  className="statistic-filter-btn statistic-filter-btn-primary"
                  onClick={applyFilters}
                  disabled={isLoading}
                >
                  Применить
                </button>

                <button
                  className="statistic-filter-btn statistic-filter-btn-secondary"
                  onClick={resetFilters}
                  disabled={isLoading}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>

          <div className="statistic-dashboard-grid">
            <section className="statistic-section statistic-kpi-section">
              <div className="statistic-section-header">
                <div>
                  <h2>Общая статистика контроля</h2>
                  <p>
                    Период: {getPeriodText()}. AI-результат и решение инженера
                    считаются отдельно.
                  </p>
                </div>
              </div>

              <div className="statistic-kpi-grid">
                <SummaryCard
                  type="primary"
                  value={aiCheckedCount.toLocaleString()}
                  label="Проверено слитков"
                />

                <SummaryCard
                  type="success"
                  value={aiOkCount.toLocaleString()}
                  label="AI OK"
                />

                <SummaryCard
                  type="danger"
                  value={aiCrackCount.toLocaleString()}
                  label="AI CRACK"
                />

                <SummaryCard
                  type="danger"
                  value={`${aiDefectRate.toFixed(2)}%`}
                  label="Доля AI-дефектных"
                />

                <SummaryCard
                  type="warning"
                  value={pendingStatusCount.toLocaleString()}
                  label="Ожидает инженера"
                />

                <SummaryCard
                  type="success"
                  value={engineerConfirmedCount.toLocaleString()}
                  label="Подтверждено инженером"
                />

                <SummaryCard
                  type="danger"
                  value={rejectedStatusCount.toLocaleString()}
                  label="Отклонено инженером"
                />

                <SummaryCard
                  type="primary"
                  value={sentToMesCount.toLocaleString()}
                  label="Передано в MES"
                />

                <SummaryCard
                  type="primary"
                  value={engineerReviewedCount.toLocaleString()}
                  label="Рассмотрено инженером"
                />

                <SummaryCard
                  type="warning"
                  value={`${falseAlarmRateReviewed.toFixed(2)}%`}
                  label="Ложные среди рассмотренных"
                />

                <SummaryCard
                  type="success"
                  value={`${engineerConfirmationRate.toFixed(2)}%`}
                  label="Подтверждаемость"
                />

                <SummaryCard
                  type="primary"
                  value={formatDecimal(avgAiDefectMaxPCrack, 3)}
                  label="Средний max_p_crack по AI-дефектам"
                />

                <SummaryCard
                  type="success"
                  value={formatDecimal(avgConfirmedDefectMaxPCrack, 3)}
                  label="Средний max_p_crack по подтверждённым дефектам"
                />
              </div>
            </section>

            <section className="statistic-section">
              <div className="statistic-section-header">
                <div>
                  <h2>Динамика по сменам</h2>
                  <p>
                    Отдельно показаны решения AI-модели и результаты проверки
                    инженером.
                  </p>
                </div>
              </div>

              <div className="statistic-charts-grid">
                <div className="statistic-chart-card statistic-chart-main">
                  <div className="statistic-chart-card-header">
                    <h3>AI-результаты по сменам</h3>
                  </div>

                  {chartData.length === 0 ? (
                    <div className="statistic-chart-empty">
                      Нет данных для графика
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(180, 210, 240, 0.14)"
                        />
                        <XAxis dataKey="name" stroke="#8fb4d9" />
                        <YAxis stroke="#8fb4d9" allowDecimals={false} />
                        <Tooltip content={<StatsTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="aiOk"
                          name="AI OK"
                          fill="#22c55e"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="aiCrack"
                          name="AI CRACK"
                          fill="#ef4444"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <ChartCard title="Проверка инженером по сменам">
                  {chartData.length === 0 ? (
                    <div className="statistic-chart-empty">
                      Нет данных для графика
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(180, 210, 240, 0.14)"
                        />
                        <XAxis dataKey="name" stroke="#8fb4d9" />
                        <YAxis stroke="#8fb4d9" allowDecimals={false} />
                        <Tooltip content={<StatsTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="engineerPending"
                          name="Ожидает"
                          fill="#fbbf24"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="engineerConfirmedStatus"
                          name="Подтверждено"
                          fill="#22c55e"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="engineerRejected"
                          name="Отклонено"
                          fill="#ef4444"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="engineerSentToMes"
                          name="В MES"
                          fill="#38bdf8"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Доля AI-дефектных">
                  {chartData.length === 0 ? (
                    <div className="statistic-chart-empty">
                      Нет данных для графика
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(180, 210, 240, 0.14)"
                        />
                        <XAxis dataKey="name" stroke="#8fb4d9" />
                        <YAxis
                          stroke="#8fb4d9"
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<StatsTooltip suffix="%" />} />
                        <Line
                          type="monotone"
                          dataKey="aiDefectRate"
                          name="Доля AI-дефектных"
                          stroke="#f97316"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Ложные срабатывания">
                  {chartData.length === 0 ? (
                    <div className="statistic-chart-empty">
                      Нет данных для графика
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(180, 210, 240, 0.14)"
                        />
                        <XAxis dataKey="name" stroke="#8fb4d9" />
                        <YAxis
                          stroke="#8fb4d9"
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<StatsTooltip suffix="%" />} />
                        <Line
                          type="monotone"
                          dataKey="falseAlarmRateReviewed"
                          name="Ложные среди рассмотренных"
                          stroke="#fbbf24"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Средний max_p_crack по дефектам">
                  {chartData.length === 0 ? (
                    <div className="statistic-chart-empty">
                      Нет данных для графика
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(180, 210, 240, 0.14)"
                        />
                        <XAxis dataKey="name" stroke="#8fb4d9" />
                        <YAxis stroke="#8fb4d9" domain={[0, 1]} />
                        <Tooltip content={<StatsTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgMaxPCrackAiDefects"
                          name="По AI-дефектам"
                          stroke="#38bdf8"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgMaxPCrackConfirmedDefects"
                          name="По подтверждённым"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Статусы событий">
                  {statusChartData.length === 0 ? (
                    <div className="statistic-chart-empty">
                      Нет данных по событиям
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={78}
                          paddingAngle={4}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<StatsTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </section>

            <div className="statistic-lower-grid">
              <section className="statistic-section">
                <div className="statistic-section-header">
                  <div>
                    <h2>Последние смены</h2>
                    <p>Краткая сводка по последним обработанным сменам</p>
                  </div>
                </div>

                <div className="statistic-recent-shifts">
                  {shifts.slice(0, 5).map((shift) => {
                    const shiftConfirmedTotal =
                      shift.engineer_confirmed_count !== undefined &&
                      shift.engineer_confirmed_count !== null
                        ? getNumber(shift.engineer_confirmed_count)
                        : getNumber(
                            shift.engineer_confirmed_status_count ??
                              shift.defects_confirmed
                          ) +
                          getNumber(
                            shift.engineer_sent_to_mes_count ??
                              shift.defects_sent_to_mes
                          );

                    return (
                      <div
                        className="statistic-shift-row"
                        key={shift.shift_id}
                      >
                        <div className="statistic-shift-main">
                          <strong>Смена #{shift.shift_id}</strong>
                          <span>{formatDate(shift.started_at)}</span>
                        </div>

                        <div className="statistic-shift-metrics">
                          <div>
                            <strong>{shift.processed_ingots}</strong>
                            <span>слитков</span>
                          </div>

                          <div>
                            <strong className="statistic-danger-text">
                              {getNumber(
                                shift.ai_crack_count ?? shift.total_crack
                              )}
                            </strong>
                            <span>AI CRACK</span>
                          </div>

                          <div>
                            <strong className="statistic-success-text">
                              {shiftConfirmedTotal.toLocaleString()}
                            </strong>
                            <span>подтв.</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {shifts.length === 0 && (
                    <div className="statistic-empty-text">
                      Смены пока не найдены
                    </div>
                  )}
                </div>
              </section>

              <section className="statistic-section">
                <div className="statistic-section-header">
                  <div>
                    <h2>Пояснения</h2>
                    <p>Что означают основные показатели страницы</p>
                  </div>
                </div>

                <div className="statistic-explain-list">
                  <ExplainItem
                    title="AI CRACK"
                    text="Количество проверок, где модель обнаружила подозрение на трещину. Это ещё не обязательно подтверждённый дефект."
                  />

                  <ExplainItem
                    title="Подтверждено инженером"
                    text="Количество дефектов, которые инженер подтвердил. События, переданные в MES, тоже считаются подтверждёнными."
                  />

                  <ExplainItem
                    title="Средний max_p_crack по AI-дефектам"
                    text="Средняя уверенность модели только среди событий, которые сама модель определила как CRACK."
                  />

                  <ExplainItem
                    title="Средний max_p_crack по подтверждённым дефектам"
                    text="Средняя уверенность модели только среди дефектов, которые подтвердил инженер. Переданные в MES дефекты тоже входят в этот показатель."
                  />

                  <ExplainItem
                    title="Ложные среди рассмотренных"
                    text="Доля отклонённых событий среди тех, по которым инженер уже принял решение."
                  />
                </div>
              </section>
            </div>

            <section className="statistic-section statistic-table-section">
              <div className="statistic-section-header">
                <div>
                  <h2>История смен</h2>
                  <p>
                    Подробная таблица с разделением AI-результата и проверки
                    инженером
                  </p>
                </div>
              </div>

              <div className="statistic-table-wrap">
                <table className="statistic-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Начало</th>
                      <th>Конец</th>
                      <th>Режим</th>
                      <th>Threshold</th>
                      <th>Слитков</th>
                      <th>AI OK</th>
                      <th>AI CRACK</th>
                      <th>Событий</th>
                      <th>Ожидает</th>
                      <th>Подтв.</th>
                      <th>Откл.</th>
                      <th>В MES</th>
                      <th>% AI деф.</th>
                      <th>% ложн.</th>
                      <th>avg AI max_p</th>
                      <th>avg confirmed max_p</th>
                    </tr>
                  </thead>

                  <tbody>
                    {shifts.length === 0 ? (
                      <tr>
                        <td colSpan="17" className="statistic-table-empty">
                          Смены пока не найдены
                        </td>
                      </tr>
                    ) : (
                      shifts.map((shift) => (
                        <tr key={shift.shift_id}>
                          <td>#{shift.shift_id}</td>
                          <td>{formatDate(shift.started_at)}</td>
                          <td>{formatDate(shift.finished_at)}</td>
                          <td>{shift.mode || "—"}</td>
                          <td>{formatDecimal(shift.threshold, 3)}</td>
                          <td>{shift.processed_ingots}</td>
                          <td>{getNumber(shift.ai_ok_count ?? shift.total_ok)}</td>
                          <td>
                            {getNumber(shift.ai_crack_count ?? shift.total_crack)}
                          </td>
                          <td>
                            {getNumber(
                              shift.defect_events_total ?? shift.defects_total
                            )}
                          </td>
                          <td>
                            {getNumber(
                              shift.engineer_pending_count ??
                                shift.defects_pending
                            )}
                          </td>
                          <td>
                            {getNumber(
                              shift.engineer_confirmed_status_count ??
                                shift.defects_confirmed
                            )}
                          </td>
                          <td>
                            {getNumber(
                              shift.engineer_rejected_count ??
                                shift.defects_rejected
                            )}
                          </td>
                          <td>
                            {getNumber(
                              shift.engineer_sent_to_mes_count ??
                                shift.defects_sent_to_mes
                            )}
                          </td>
                          <td>
                            {formatDecimal(
                              shift.ai_defect_rate ?? shift.defect_rate,
                              2
                            )}
                            %
                          </td>
                          <td>
                            {formatDecimal(
                              shift.false_alarm_rate_reviewed ??
                                shift.false_alarm_rate,
                              2
                            )}
                            %
                          </td>
                          <td>
                            {formatDecimal(
                              shift.avg_max_p_crack_ai_defects,
                              3
                            )}
                          </td>
                          <td>
                            {formatDecimal(
                              shift.avg_max_p_crack_confirmed_defects,
                              3
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="statistic-pagination">
                  <div className="statistic-pagination-info">
                    Показано {paginationStart}–{paginationEnd} из{" "}
                    {shiftsMeta.total} смен
                  </div>

                  <div className="statistic-pagination-controls">
                    <select
                      className="statistic-page-size-select"
                      value={shiftPageSize}
                      onChange={(e) =>
                        handleShiftPageSizeChange(e.target.value)
                      }
                    >
                      <option value="5">5 на странице</option>
                      <option value="10">10 на странице</option>
                      <option value="20">20 на странице</option>
                      <option value="50">50 на странице</option>
                    </select>

                    <button
                      className="statistic-page-btn"
                      disabled={!shiftsMeta.has_prev}
                      onClick={() => goToShiftPage(1)}
                    >
                      <span>«</span>
                    </button>

                    <button
                      className="statistic-page-btn"
                      disabled={!shiftsMeta.has_prev}
                      onClick={() => goToShiftPage(shiftsMeta.page - 1)}
                    >
                      <span>‹</span>
                    </button>

                    <div className="statistic-page-numbers">
                      {pageNumbers.map((page, index) => {
                        const prevPage = pageNumbers[index - 1];
                        const showDots = prevPage && page - prevPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showDots && (
                              <span className="statistic-page-dots">...</span>
                            )}

                            <button
                              className={`statistic-page-number ${
                                page === shiftsMeta.page ? "active" : ""
                              }`}
                              onClick={() => goToShiftPage(page)}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <button
                      className="statistic-page-btn"
                      disabled={!shiftsMeta.has_next}
                      onClick={() => goToShiftPage(shiftsMeta.page + 1)}
                    >
                      <span>›</span>
                    </button>

                    <button
                      className="statistic-page-btn"
                      disabled={!shiftsMeta.has_next}
                      onClick={() => goToShiftPage(shiftsMeta.total_pages)}
                    >
                      <span>»</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

function SummaryCard({ type = "primary", value, label }) {
  return (
    <div className={`statistic-summary-card statistic-summary-${type}`}>
      <div className="statistic-summary-content">
        <div className="statistic-summary-value">{value}</div>
        <div className="statistic-summary-label">{label}</div>
      </div>
    </div>
  );
}

function ExplainItem({ title, text }) {
  return (
    <div className="statistic-explain-item">
      <div>
        <div className="statistic-explain-title">{title}</div>
        <div className="statistic-explain-text">{text}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="statistic-chart-card">
      <div className="statistic-chart-card-header">
        <h3>{title}</h3>
      </div>

      {children}
    </div>
  );
}

function StatsTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="statistic-chart-tooltip">
      {label && <div className="statistic-chart-tooltip-title">{label}</div>}

      {payload.map((item) => (
        <div
          className="statistic-chart-tooltip-row"
          key={item.dataKey || item.name}
        >
          <span
            className="statistic-chart-tooltip-dot"
            style={{ backgroundColor: item.color }}
          ></span>

          <span>{item.name}:</span>

          <strong>
            {typeof item.value === "number"
              ? item.value.toFixed(item.value % 1 === 0 ? 0 : 3)
              : item.value}
            {suffix}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default Statistic;