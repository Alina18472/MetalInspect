
// import "../styles/statistic.css";
// import React, { useState, useEffect } from "react";
// import TopNav from "../components/TopNav";
// import { api } from "../services/Api";

// const Statistic = () => {
//     const [filters, setFilters] = useState({
//         period: "all",
//         line: "all",
//         shift: "all",
//         defectType: "all",
//         groupBy: "shift"
//     });

//     const [stats, setStats] = useState({
//         totalIngots: 0,
//         totalDefects: 0,
//         qualityRate: 0,
//         costSavings: 0
//     });

//     const [defectsDistribution, setDefectsDistribution] = useState({
//         cracks: 0,
//         porosity: 0,
//         inclusion: 0,
//         scratch: 0
//     });

//     const [shiftsStats, setShiftsStats] = useState({
//         shift1: { id: null, name: "Смена #1", time: "—", defects: 0, ingots: 0, quality: 0 },
//         shift2: { id: null, name: "Смена #2", time: "—", defects: 0, ingots: 0, quality: 0 },
//         shift3: { id: null, name: "Смена #3", time: "—", defects: 0, ingots: 0, quality: 0 }
//     });

//     const [shiftsList, setShiftsList] = useState([]);
//     const [currentShift, setCurrentShift] = useState(null);
//     const [heatMapData, setHeatMapData] = useState([]);
//     const [notification, setNotification] = useState(null);
//     const [isLoading, setIsLoading] = useState(false);

//     const generateHeatMapData = () => {
//         const data = [];
//         for (let i = 0; i < 50; i++) {
//             data.push(Math.floor(Math.random() * 4));
//         }
//         return data;
//     };

//     useEffect(() => {
//         setHeatMapData(generateHeatMapData());
//     }, []);

//     useEffect(() => {
//         loadStatistics();
//     }, []);

//     const loadStatistics = async () => {
//         setIsLoading(true);

//         try {
//             const [summary, currentShiftData, shiftsData] = await Promise.all([
//                 api.getStatsSummary(),
//                 api.getCurrentShiftStats(),
//                 api.getShiftsStats(20)
//             ]);

//             const shifts = shiftsData?.items || [];

//             setCurrentShift(currentShiftData?.shift || null);
//             setShiftsList(shifts);

//             const selectedShift =
//                 filters.shift !== "all"
//                     ? shifts.find((s) => String(s.shift_id) === String(filters.shift))
//                     : null;

//             if (selectedShift) {
//                 applyStatsFromShift(selectedShift);
//             } else {
//                 applyStatsFromSummary(summary);
//             }

//             applyDefectDistribution(summary);
//             applyShiftsStats(shifts);

//         } catch (e) {
//             showNotification(e?.message || "Не удалось загрузить статистику", "info");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const applyStatsFromSummary = (summary) => {
//         const totalIngots = Number(summary?.inspections_count || 0);
//         const totalDefects = Number(summary?.defects_count || summary?.crack_count || 0);
//         const defectRate = Number(summary?.defect_rate || 0);
//         const qualityRate = totalIngots > 0 ? 100 - defectRate : 0;

//         setStats({
//             totalIngots,
//             totalDefects,
//             qualityRate,
//             costSavings: totalDefects * 6500
//         });
//     };

//     const applyStatsFromShift = (shift) => {
//         const totalIngots = Number(shift?.processed_ingots || 0);
//         const totalDefects = Number(shift?.defects_total || shift?.total_crack || 0);
//         const defectRate = Number(shift?.defect_rate || 0);
//         const qualityRate = totalIngots > 0 ? 100 - defectRate : 0;

//         setStats({
//             totalIngots,
//             totalDefects,
//             qualityRate,
//             costSavings: totalDefects * 6500
//         });
//     };

//     const applyDefectDistribution = (summary) => {
//         // Сейчас модель классифицирует только crack / ok,
//         // поэтому реальные дефекты в БД — это трещины.
//         const crackCount = Number(summary?.defects_count || summary?.crack_count || 0);

//         if (filters.defectType === "all" || filters.defectType === "crack") {
//             setDefectsDistribution({
//                 cracks: crackCount,
//                 porosity: 0,
//                 inclusion: 0,
//                 scratch: 0
//             });
//         } else {
//             setDefectsDistribution({
//                 cracks: 0,
//                 porosity: 0,
//                 inclusion: 0,
//                 scratch: 0
//             });
//         }
//     };

//     const formatShortDate = (value) => {
//         if (!value) return "—";
//         return value.replace("T", " ");
//     };

//     const calcQuality = (shift) => {
//         const processed = Number(shift?.processed_ingots || 0);
//         const defectRate = Number(shift?.defect_rate || 0);

//         if (processed <= 0) return 0;
//         return 100 - defectRate;
//     };

//     const applyShiftsStats = (shifts) => {
//         const prepared = [...shifts.slice(0, 3)];

//         const s1 = prepared[0];
//         const s2 = prepared[1];
//         const s3 = prepared[2];

//         setShiftsStats({
//             shift1: {
//                 id: s1?.shift_id || null,
//                 name: s1 ? `Смена #${s1.shift_id}` : "Смена #1",
//                 time: s1 ? formatShortDate(s1.started_at) : "—",
//                 defects: Number(s1?.total_crack || 0),
//                 ingots: Number(s1?.processed_ingots || 0),
//                 quality: calcQuality(s1)
//             },
//             shift2: {
//                 id: s2?.shift_id || null,
//                 name: s2 ? `Смена #${s2.shift_id}` : "Смена #2",
//                 time: s2 ? formatShortDate(s2.started_at) : "—",
//                 defects: Number(s2?.total_crack || 0),
//                 ingots: Number(s2?.processed_ingots || 0),
//                 quality: calcQuality(s2)
//             },
//             shift3: {
//                 id: s3?.shift_id || null,
//                 name: s3 ? `Смена #${s3.shift_id}` : "Смена #3",
//                 time: s3 ? formatShortDate(s3.started_at) : "—",
//                 defects: Number(s3?.total_crack || 0),
//                 ingots: Number(s3?.processed_ingots || 0),
//                 quality: calcQuality(s3)
//             }
//         });
//     };

//     const applyFilters = () => {
//         loadStatistics();
//         showNotification("Фильтры применены", "success");
//     };

//     const resetFilters = () => {
//         setFilters({
//             period: "all",
//             line: "all",
//             shift: "all",
//             defectType: "all",
//             groupBy: "shift"
//         });

//         setTimeout(() => {
//             loadStatistics();
//         }, 0);

//         showNotification("Фильтры сброшены", "info");
//     };

//     const handleFilterChange = (filterName, value) => {
//         setFilters((prev) => ({
//             ...prev,
//             [filterName]: value
//         }));
//     };

//     const showNotification = (message, type) => {
//         setNotification({ message, type });
//         setTimeout(() => setNotification(null), 3000);
//     };

//     const exportToExcel = () => {
//         showNotification("Экспорт отчета будет добавлен позже", "info");
//     };

//     const exportToPDF = () => {
//         showNotification("Формирование PDF отчета будет добавлено позже", "info");
//     };

//     const getHeatMapColor = (defectCount) => {
//         if (defectCount <= 1) return "heatmap-low";
//         if (defectCount <= 3) return "heatmap-medium";
//         if (defectCount <= 5) return "heatmap-high";
//         return "heatmap-critical";
//     };

//     const getDefectPercentage = (count) => {
//         const total = Object.values(defectsDistribution).reduce((sum, val) => sum + val, 0);
//         return total > 0 ? ((count / total) * 100).toFixed(1) : 0;
//     };

//     const getPeriodText = () => {
//         if (filters.shift !== "all") {
//             return `Смена #${filters.shift}`;
//         }

//         const periodText = {
//             all: "Всё время",
//             today: "Сегодня",
//             yesterday: "Вчера",
//             week: "Неделя",
//             month: "Месяц",
//             quarter: "Квартал",
//             year: "Год",
//             custom: "Произвольный период"
//         };

//         return periodText[filters.period] || "Всё время";
//     };

//     return (
//         <div className="statistic-page">
//             {/* Фоновое изображение */}
//             <div className="statistic-page-bg"></div>

//             {/* Уведомление */}
//             {notification && (
//                 <div className={`notification ${notification.type}`}>
//                     <i className={`fas fa-${notification.type === 'success' ? 'check-circle' : 'info-circle'}`}></i>
//                     {notification.message}
//                 </div>
//             )}
//             {isLoading && (
//                 <div className="notification info">
//                     <i className="fas fa-info-circle"></i>
//                     Загрузка статистики...
//                 </div>
//             )}

//             {/* Контейнер */}
//             <div className="statistic-container">
//                 {/* Шапка */}
//                 <TopNav
//                     subtitle="Система распознавания трещин в слитках • Статистика и аналитика"
//                     userName="Оператор Иванов А.С."
//                     userRole="Смена #3 • 08:00-20:00"
//                 />

//                 {/* Основное содержимое */}
//                 <div className="statistic-main-content">
//                     {/* Панель фильтров */}
//                     <div className="statistic-filters-panel">
//                         <div className="statistic-filters-flex">
//                             <div className="statistic-filter-group">
//                                 <label className="statistic-filter-label">
//                                     <i className="far fa-calendar-alt"></i> Период
//                                 </label>
//                                 <select 
//                                     className="statistic-filter-select"
//                                     value={filters.period}
//                                     onChange={(e) => handleFilterChange('period', e.target.value)}
//                                 >
//                                     <option value="all">Всё время</option>
//                                     <option value="today">Сегодня</option>
//                                     <option value="yesterday">Вчера</option>
//                                     <option value="week">Неделя</option>
//                                     <option value="month">Месяц</option>
//                                     <option value="quarter">Квартал</option>
//                                     <option value="year">Год</option>
//                                     <option value="custom">Произвольный</option>
//                                 </select>
//                             </div>
                            
//                             <div className="statistic-filter-group">
//                                 <label className="statistic-filter-label">
//                                     <i className="fas fa-industry"></i> Производственная линия
//                                 </label>
//                                 <select 
//                                     className="statistic-filter-select"
//                                     value={filters.line}
//                                     onChange={(e) => handleFilterChange('line', e.target.value)}
//                                 >
//                                     <option value="all">Все линии</option>
//                                     <option value="line1">Линия разливки #1</option>
//                                     <option value="line2">Линия разливки #2</option>
//                                     <option value="line3">Линия разливки #3</option>
//                                 </select>
//                             </div>
                            
//                             <div className="statistic-filter-group">
//                                 <label className="statistic-filter-label">
//                                     <i className="fas fa-user-clock"></i> Смена
//                                 </label>
//                                 <select 
//                                     className="statistic-filter-select"
//                                     value={filters.shift}
//                                     onChange={(e) => handleFilterChange('shift', e.target.value)}
//                                 >
//                                     <option value="all">Все смены</option>
//                                     {shiftsList.map((shift) => (
//                                         <option key={shift.shift_id} value={shift.shift_id}>
//                                             Смена #{shift.shift_id} — {shift.status}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>
                            
//                             <div className="statistic-filter-group">
//                                 <label className="statistic-filter-label">
//                                     <i className="fas fa-exclamation-triangle"></i> Тип дефекта
//                                 </label>
//                                 <select 
//                                     className="statistic-filter-select"
//                                     value={filters.defectType}
//                                     onChange={(e) => handleFilterChange('defectType', e.target.value)}
//                                 >
//                                     <option value="all">Все типы</option>
//                                     <option value="crack">Трещины</option>
//                                     <option value="porosity">Пористость</option>
//                                     <option value="inclusion">Включения</option>
//                                     <option value="scratch">Царапины</option>
//                                 </select>
//                             </div>
                            
//                             <div className="statistic-filter-buttons">
//                                 <button 
//                                     className="statistic-filter-btn statistic-filter-btn-primary"
//                                     onClick={applyFilters}
//                                 >
//                                     <i className="fas fa-filter"></i> Применить фильтры
//                                 </button>
//                                 <button 
//                                     className="statistic-filter-btn statistic-filter-btn-secondary"
//                                     onClick={resetFilters}
//                                 >
//                                     <i className="fas fa-redo"></i> Сбросить
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
                    
//                     {/* Основная панель статистики */}
//                     <div className="statistic-stats-panel">
//                         {/* Левая часть - основная статистика */}
//                         <div className="statistic-main-stats">
//                             {/* Общая статистика */}
//                             <div className="statistic-stats-container">
//                                 <div className="statistic-panel-header">
//                                     <h2 className="statistic-panel-header-title">
//                                         <i className="fas fa-chart-bar"></i> Общая статистика контроля качества
//                                     </h2>
//                                     <div className="statistic-period-info">
//                                         Период: {getPeriodText()}
//                                     </div>
//                                 </div>
//                                 <div className="statistic-panel-content">
//                                     <div className="statistic-overall-stats">
//                                         <div className="statistic-stat-card statistic-stat-total">
//                                             <div className="statistic-stat-value">{stats.totalIngots.toLocaleString()}</div>
//                                             <div className="statistic-stat-label">Всего проверено слитков</div>
//                                             <div className="statistic-stat-change statistic-change-up">
//                                                 <i className="fas fa-arrow-up"></i> +5.2% к прошлой неделе
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-stat-card statistic-stat-defects">
//                                             <div className="statistic-stat-value">{stats.totalDefects}</div>
//                                             <div className="statistic-stat-label">Выявлено дефектов</div>
//                                             <div className="statistic-stat-change statistic-change-down">
//                                                 <i className="fas fa-arrow-down"></i> -2.7% к прошлой неделе
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-stat-card statistic-stat-quality">
//                                             <div className="statistic-stat-value">{stats.qualityRate.toFixed(2)}%</div>
//                                             <div className="statistic-stat-label">Процент качественных</div>
//                                             <div className="statistic-stat-change statistic-change-up">
//                                                 <i className="fas fa-arrow-up"></i> +0.3% к прошлой неделе
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-stat-card statistic-stat-cost">
//                                             <div className="statistic-stat-value">₽{stats.costSavings.toLocaleString()}</div>
//                                             <div className="statistic-stat-label">Экономия от системы</div>
//                                             <div className="statistic-stat-change statistic-change-up">
//                                                 <i className="fas fa-arrow-up"></i> +8.5% к прошлой неделе
//                                             </div>
//                                         </div>
//                                     </div>
                                    
//                                     {/* График динамики */}
//                                     <div className="statistic-chart-container">
//                                         <div className="statistic-chart-placeholder">
//                                             <i className="fas fa-chart-line"></i>
//                                             <div className="statistic-chart-title">Динамика обнаружения дефектов по дням</div>
//                                             <div className="statistic-chart-description">
//                                                 График показывает изменение количества дефектов<br />
//                                                 и процента брака за выбранный период
//                                             </div>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="statistic-legend">
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color" style={{ backgroundColor: '#f44336' }}></div>
//                                             <span>Количество дефектов</span>
//                                         </div>
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
//                                             <span>Процент качественных</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
                            
//                             {/* Распределение дефектов */}
//                             <div className="statistic-stats-container">
//                                 <div className="statistic-panel-header">
//                                     <h2 className="statistic-panel-header-title">
//                                         <i className="fas fa-pie-chart"></i> Распределение дефектов по типам
//                                     </h2>
//                                     <div className="statistic-defects-total">
//                                         Всего дефектов: {Object.values(defectsDistribution).reduce((sum, val) => sum + val, 0)}
//                                     </div>
//                                 </div>
//                                 <div className="statistic-panel-content">
//                                     <div className="statistic-defects-distribution">
//                                         <div className="statistic-defect-type statistic-defect-crack">
//                                             <div className="statistic-defect-header">
//                                                 <div className="statistic-defect-name">
//                                                     <i className="fas fa-exclamation-circle"></i>
//                                                     <span>Трещины</span>
//                                                 </div>
//                                                 <div className="statistic-defect-count">{defectsDistribution.cracks}</div>
//                                             </div>
//                                             <div className="statistic-progress-container">
//                                                 <div 
//                                                     className="statistic-progress-fill" 
//                                                     style={{ 
//                                                         width: `${getDefectPercentage(defectsDistribution.cracks)}%`
//                                                     }}
//                                                 ></div>
//                                             </div>
//                                             <div className="statistic-defect-percentage">
//                                                 {getDefectPercentage(defectsDistribution.cracks)}% от всех дефектов
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-defect-type statistic-defect-porosity">
//                                             <div className="statistic-defect-header">
//                                                 <div className="statistic-defect-name">
//                                                     <i className="fas fa-circle"></i>
//                                                     <span>Пористость</span>
//                                                 </div>
//                                                 <div className="statistic-defect-count">{defectsDistribution.porosity}</div>
//                                             </div>
//                                             <div className="statistic-progress-container">
//                                                 <div 
//                                                     className="statistic-progress-fill" 
//                                                     style={{ 
//                                                         width: `${getDefectPercentage(defectsDistribution.porosity)}%`
//                                                     }}
//                                                 ></div>
//                                             </div>
//                                             <div className="statistic-defect-percentage">
//                                                 {getDefectPercentage(defectsDistribution.porosity)}% от всех дефектов
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-defect-type statistic-defect-inclusion">
//                                             <div className="statistic-defect-header">
//                                                 <div className="statistic-defect-name">
//                                                     <i className="fas fa-asterisk"></i>
//                                                     <span>Включения</span>
//                                                 </div>
//                                                 <div className="statistic-defect-count">{defectsDistribution.inclusion}</div>
//                                             </div>
//                                             <div className="statistic-progress-container">
//                                                 <div 
//                                                     className="statistic-progress-fill" 
//                                                     style={{ 
//                                                         width: `${getDefectPercentage(defectsDistribution.inclusion)}%`
//                                                     }}
//                                                 ></div>
//                                             </div>
//                                             <div className="statistic-defect-percentage">
//                                                 {getDefectPercentage(defectsDistribution.inclusion)}% от всех дефектов
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-defect-type statistic-defect-scratch">
//                                             <div className="statistic-defect-header">
//                                                 <div className="statistic-defect-name">
//                                                     <i className="fas fa-grip-lines"></i>
//                                                     <span>Царапины</span>
//                                                 </div>
//                                                 <div className="statistic-defect-count">{defectsDistribution.scratch}</div>
//                                             </div>
//                                             <div className="statistic-progress-container">
//                                                 <div 
//                                                     className="statistic-progress-fill" 
//                                                     style={{ 
//                                                         width: `${getDefectPercentage(defectsDistribution.scratch)}%`
//                                                     }}
//                                                 ></div>
//                                             </div>
//                                             <div className="statistic-defect-percentage">
//                                                 {getDefectPercentage(defectsDistribution.scratch)}% от всех дефектов
//                                             </div>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="statistic-chart-container statistic-pie-chart-container">
//                                         <div className="statistic-chart-placeholder">
//                                             <i className="fas fa-chart-pie"></i>
//                                             <div className="statistic-chart-title">Круговая диаграмма распределения дефектов</div>
//                                             <div className="statistic-chart-description">
//                                                 Визуализация соотношения различных типов дефектов
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
                        
//                         {/* Правая часть - дополнительная статистика */}
//                         <div className="statistic-sidebar-stats">
//                             {/* Статистика по сменам */}
//                             <div className="statistic-stats-container">
//                                 <div className="statistic-panel-header">
//                                     <h2 className="statistic-panel-header-title">
//                                         <i className="fas fa-user-clock"></i> Статистика по сменам
//                                     </h2>
//                                 </div>
//                                 <div className="statistic-panel-content">
//                                     <div className="statistic-shifts-stats">
//                                         <div className="statistic-shift-row">
//                                             <div className="statistic-shift-info">
//                                             <div className="statistic-shift-name">{shiftsStats.shift1.name}</div>
//                                             <div className="statistic-shift-time">{shiftsStats.shift1.time}</div>
//                                             </div>
//                                             <div className="statistic-shift-stats">
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-defects">
//                                                         {shiftsStats.shift1.defects}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Дефектов</div>
//                                                 </div>
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-ingots">
//                                                         {shiftsStats.shift1.ingots}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Слитков</div>
//                                                 </div>
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-quality">
//                                                         {shiftsStats.shift1.quality > 0 ? `${shiftsStats.shift1.quality.toFixed(1)}%` : '—'}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Качество</div>
//                                                 </div>
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-shift-row">
//                                             <div className="statistic-shift-info">
//                                                 <div className="statistic-shift-name">{shiftsStats.shift2.name}</div>
//                                                 <div className="statistic-shift-time">{shiftsStats.shift2.time}</div>
//                                             </div>
//                                             <div className="statistic-shift-stats">
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-defects">
//                                                         {shiftsStats.shift2.defects}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Дефектов</div>
//                                                 </div>
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-ingots">
//                                                         {shiftsStats.shift2.ingots}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Слитков</div>
//                                                 </div>
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-quality">
//                                                         {shiftsStats.shift2.quality > 0 ? `${shiftsStats.shift2.quality.toFixed(1)}%` : '—'}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Качество</div>
//                                                 </div>
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-shift-row">
//                                             <div className="statistic-shift-info">
//                                                 <div className="statistic-shift-name">{shiftsStats.shift3.name}</div>
//                                                 <div className="statistic-shift-time">{shiftsStats.shift3.time}</div>
//                                             </div>
//                                             <div className="statistic-shift-stats">
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-defects">
//                                                         {shiftsStats.shift3.defects}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Дефектов</div>
//                                                 </div>
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-ingots">
//                                                         {shiftsStats.shift3.ingots}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Слитков</div>
//                                                 </div>
//                                                 <div className="statistic-shift-stat">
//                                                     <div className="statistic-shift-value statistic-shift-quality">
//                                                         {shiftsStats.shift3.quality > 0 ? `${shiftsStats.shift3.quality.toFixed(1)}%` : '—'}
//                                                     </div>
//                                                     <div className="statistic-shift-label">Качество</div>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="statistic-legend statistic-shifts-legend">
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color" style={{ backgroundColor: '#f44336' }}></div>
//                                             <span>Дефекты</span>
//                                         </div>
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color" style={{ backgroundColor: '#2196F3' }}></div>
//                                             <span>Слитки</span>
//                                         </div>
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
//                                             <span>Качество</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
                            
//                             {/* Heat Map распределения дефектов */}
//                             <div className="statistic-stats-container">
//                                 <div className="statistic-panel-header">
//                                     <h2 className="statistic-panel-header-title">
//                                         <i className="fas fa-map"></i> Heat Map дефектов на слитках
//                                     </h2>
//                                 </div>
//                                 <div className="statistic-panel-content">
//                                     <div className="statistic-heatmap-description">
//                                         Распределение дефектов по зонам слитка (вид сверху)
//                                     </div>
                                    
//                                     <div className="statistic-heatmap-container">
//                                         <div className="statistic-heatmap-grid">
//                                             {heatMapData.map((defectCount, index) => (
//                                                 <div 
//                                                     key={index}
//                                                     className={`statistic-heatmap-cell ${getHeatMapColor(defectCount)} ${defectCount > 0 ? 'statistic-pulse-animation' : ''}`}
//                                                     data-defects={`${defectCount} дефектов`}
//                                                     title={`${defectCount} дефектов`}
//                                                     style={{ animationDelay: `${(index % 10) * 0.1}s` }}
//                                                 />
//                                             ))}
//                                         </div>
//                                     </div>
                                    
//                                     <div className="statistic-legend statistic-heatmap-legend">
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color statistic-heatmap-low"></div>
//                                             <span>0-1 дефектов</span>
//                                         </div>
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color statistic-heatmap-medium"></div>
//                                             <span>2-3 дефекта</span>
//                                         </div>
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color statistic-heatmap-high"></div>
//                                             <span>4-5 дефектов</span>
//                                         </div>
//                                         <div className="statistic-legend-item">
//                                             <div className="statistic-legend-color statistic-heatmap-critical"></div>
//                                             <span>6+ дефектов</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
                            
//                             {/* Экономические показатели */}
//                             <div className="statistic-stats-container">
//                                 <div className="statistic-panel-header">
//                                     <h2 className="statistic-panel-header-title">
//                                         <i className="fas fa-coins"></i> Экономические показатели
//                                     </h2>
//                                 </div>
//                                 <div className="statistic-panel-content">
//                                     <div className="statistic-economic-stats">
//                                         <div className="statistic-economic-card statistic-economic-savings">
//                                             <div className="statistic-economic-value">₽{stats.costSavings.toLocaleString()}</div>
//                                             <div className="statistic-economic-label">Экономия за неделю</div>
//                                             <div className="statistic-stat-change statistic-change-up">
//                                                 <i className="fas fa-arrow-up"></i> +8.5%
//                                             </div>
//                                         </div>
                                        
//                                         <div className="statistic-economic-card statistic-economic-roi">
//                                             <div className="statistic-economic-value">214%</div>
//                                             <div className="statistic-economic-label">ROI системы</div>
//                                             <div className="statistic-stat-change statistic-change-up">
//                                                 <i className="fas fa-arrow-up"></i> +12%
//                                             </div>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="statistic-economic-details">
//                                         <div className="statistic-economic-detail">
//                                             <span>Средняя стоимость брака:</span>
//                                             <span className="statistic-economic-detail-value statistic-economic-negative">₽6,500</span>
//                                         </div>
//                                         <div className="statistic-economic-detail">
//                                             <span>Трудозатраты на контроль:</span>
//                                             <span className="statistic-economic-detail-value statistic-economic-positive">-68%</span>
//                                         </div>
//                                         <div className="statistic-economic-detail">
//                                             <span>Окупаемость системы:</span>
//                                             <span className="statistic-economic-detail-value statistic-economic-positive">5.2 мес.</span>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="statistic-export-options">
//                                         <button 
//                                             className="statistic-export-btn statistic-export-excel"
//                                             onClick={exportToExcel}
//                                         >
//                                             <i className="fas fa-file-excel"></i> Excel
//                                         </button>
//                                         <button 
//                                             className="statistic-export-btn statistic-export-pdf"
//                                             onClick={exportToPDF}
//                                         >
//                                             <i className="fas fa-file-pdf"></i> PDF отчет
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Statistic;

import "../styles/statistic.css";
import React, { useEffect, useState } from "react";
import TopNav from "../components/TopNav";
import { api } from "../services/Api";

const Statistic = () => {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    shiftId: "all",
    defectStatus: "all",
  });

  const [summary, setSummary] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [allShifts, setAllShifts] = useState([]);

  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStatistics = async () => {
    setIsLoading(true);

    try {
      const params = {
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        shift_id: filters.shiftId,
        defect_status: filters.defectStatus,
        limit: 20,
      };

      const [summaryData, shiftsData, allShiftsData] = await Promise.all([
        api.getStatsSummary(params),
        api.getShiftsStats(params),
        api.getShiftsStats({ limit: 100 }),
      ]);

      setSummary(summaryData);
      setShifts(shiftsData?.items || []);
      setAllShifts(allShiftsData?.items || []);
    } catch (e) {
      showNotification(e?.message || "Не удалось загрузить статистику", "info");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = () => {
    loadStatistics();
    showNotification("Фильтры применены", "success");
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      shiftId: "all",
      defectStatus: "all",
    });

    setTimeout(() => {
      loadStatistics();
    }, 0);

    showNotification("Фильтры сброшены", "info");
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatDate = (value) => {
    if (!value) return "—";
    return value.replace("T", " ");
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
      return `${filters.dateFrom || "начало"} — ${filters.dateTo || "сейчас"}`;
    }

    return "Всё время";
  };

  const maxProcessed = Math.max(...shifts.map((s) => s.processed_ingots || 0), 1);
  const maxCrack = Math.max(...shifts.map((s) => s.total_crack || 0), 1);

  const totalIngots = Number(summary?.inspections_count || 0);
  const okCount = Number(summary?.ok_count || 0);
  const crackCount = Number(summary?.crack_count || 0);
  const defectRate = Number(summary?.defect_rate || 0);
  const qualityRate = totalIngots > 0 ? 100 - defectRate : 0;

  const pending = Number(summary?.defects_pending || 0);
  const confirmed = Number(summary?.defects_confirmed || 0);
  const rejected = Number(summary?.defects_rejected || 0);
  const sentToMes = Number(summary?.defects_sent_to_mes || 0);
  const statusesTotal = Math.max(pending + confirmed + rejected + sentToMes, 1);

  return (
    <div className="statistic-page">
      <div className="statistic-page-bg"></div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          <i
            className={`fas fa-${
              notification.type === "success" ? "check-circle" : "info-circle"
            }`}
          ></i>
          {notification.message}
        </div>
      )}

      {isLoading && (
        <div className="notification info">
          <i className="fas fa-info-circle"></i>
          Загрузка статистики...
        </div>
      )}

      <div className="statistic-container">
        <TopNav
          subtitle="Система распознавания трещин в слитках • Статистика и аналитика"
          userName="Оператор системы"
          userRole="AI-зрение • Контроль качества"
        />

        <div className="statistic-main-content">
          <div className="statistic-filters-panel">
            <div className="statistic-filters-flex">
              <div className="statistic-filter-group">
                <label className="statistic-filter-label">
                  <i className="far fa-calendar-alt"></i> Дата с
                </label>
                <input
                  type="date"
                  className="statistic-filter-select"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                />
              </div>

              <div className="statistic-filter-group">
                <label className="statistic-filter-label">
                  <i className="far fa-calendar-alt"></i> Дата по
                </label>
                <input
                  type="date"
                  className="statistic-filter-select"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>

              <div className="statistic-filter-group">
                <label className="statistic-filter-label">
                  <i className="fas fa-user-clock"></i> Смена
                </label>
                <select
                  className="statistic-filter-select"
                  value={filters.shiftId}
                  onChange={(e) => handleFilterChange("shiftId", e.target.value)}
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
                  <i className="fas fa-check-circle"></i> Статус события
                </label>
                <select
                  className="statistic-filter-select"
                  value={filters.defectStatus}
                  onChange={(e) => handleFilterChange("defectStatus", e.target.value)}
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
                >
                  <i className="fas fa-filter"></i> Применить
                </button>
                <button
                  className="statistic-filter-btn statistic-filter-btn-secondary"
                  onClick={resetFilters}
                >
                  <i className="fas fa-redo"></i> Сбросить
                </button>
              </div>
            </div>
          </div>

          <div className="statistic-stats-panel">
            <div className="statistic-main-stats">
              <div className="statistic-stats-container">
                <div className="statistic-panel-header">
                  <h2 className="statistic-panel-header-title">
                    <i className="fas fa-chart-bar"></i> Общая статистика контроля
                  </h2>
                  <div className="statistic-period-info">
                    Период: {getPeriodText()}
                  </div>
                </div>

                <div className="statistic-panel-content">
                  <div className="statistic-overall-stats">
                    <div className="statistic-stat-card statistic-stat-total">
                      <div className="statistic-stat-value">
                        {totalIngots.toLocaleString()}
                      </div>
                      <div className="statistic-stat-label">
                        Всего проверено слитков
                      </div>
                    </div>

                    <div className="statistic-stat-card statistic-stat-quality">
                      <div className="statistic-stat-value">
                        {okCount.toLocaleString()}
                      </div>
                      <div className="statistic-stat-label">OK слитков</div>
                    </div>

                    <div className="statistic-stat-card statistic-stat-defects">
                      <div className="statistic-stat-value">
                        {crackCount.toLocaleString()}
                      </div>
                      <div className="statistic-stat-label">Дефектных слитков</div>
                    </div>

                    <div className="statistic-stat-card statistic-stat-quality">
                      <div className="statistic-stat-value">
                        {qualityRate.toFixed(2)}%
                      </div>
                      <div className="statistic-stat-label">
                        Процент качественных
                      </div>
                    </div>

                    <div className="statistic-stat-card statistic-stat-total">
                      <div className="statistic-stat-value">
                        {defectRate.toFixed(2)}%
                      </div>
                      <div className="statistic-stat-label">Доля дефектных</div>
                    </div>

                    <div className="statistic-stat-card statistic-stat-total">
                      <div className="statistic-stat-value">
                        {Number(summary?.avg_max_p_crack || 0).toFixed(3)}
                      </div>
                      <div className="statistic-stat-label">
                        Средний max_p_crack
                      </div>
                    </div>

                    <div className="statistic-stat-card statistic-stat-total">
                      <div className="statistic-stat-value">
                        {Number(summary?.avg_frames || 0).toFixed(2)}
                      </div>
                      <div className="statistic-stat-label">
                        Среднее кадров на слиток
                      </div>
                    </div>

                    <div className="statistic-stat-card statistic-stat-defects">
                      <div className="statistic-stat-value">
                        {Number(summary?.defects_count || 0)}
                      </div>
                      <div className="statistic-stat-label">
                        Событий дефектов
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              
                
                
                
            </div>

            <div className="statistic-sidebar-stats">
              <div className="statistic-stats-container">
                <div className="statistic-panel-header">
                  <h2 className="statistic-panel-header-title">
                    <i className="fas fa-check-circle"></i> Статусы событий
                  </h2>
                </div>

                <div className="statistic-panel-content">
                  <div className="statistic-defects-distribution">
                    <StatusRow
                      title="Ожидает проверки"
                      count={pending}
                      total={statusesTotal}
                      icon="fas fa-clock"
                    />
                    <StatusRow
                      title="Подтверждено"
                      count={confirmed}
                      total={statusesTotal}
                      icon="fas fa-check-circle"
                    />
                    <StatusRow
                      title="Отклонено"
                      count={rejected}
                      total={statusesTotal}
                      icon="fas fa-times-circle"
                    />
                    <StatusRow
                      title="Передано в MES"
                      count={sentToMes}
                      total={statusesTotal}
                      icon="fas fa-paper-plane"
                    />
                  </div>

                  <div className="statistic-legend statistic-shifts-legend">
                    <div className="statistic-legend-item">
                      <div
                        className="statistic-legend-color"
                        style={{ backgroundColor: "#f44336" }}
                      ></div>
                      <span>Дефектные события</span>
                    </div>
                    <div className="statistic-legend-item">
                      <div
                        className="statistic-legend-color"
                        style={{ backgroundColor: "#4CAF50" }}
                      ></div>
                      <span>Подтверждение инженером</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="statistic-stats-container">
                <div className="statistic-panel-header">
                  <h2 className="statistic-panel-header-title">
                    <i className="fas fa-user-clock"></i> Последние смены
                  </h2>
                </div>

                <div className="statistic-panel-content">
                  <div className="statistic-shifts-stats">
                    {shifts.slice(0, 5).map((shift) => (
                      <div className="statistic-shift-row" key={shift.shift_id}>
                        <div className="statistic-shift-info">
                          <div className="statistic-shift-name">
                            Смена #{shift.shift_id}
                          </div>
                          <div className="statistic-shift-time">
                            {formatDate(shift.started_at)}
                          </div>
                        </div>

                        <div className="statistic-shift-stats">
                          <div className="statistic-shift-stat">
                            <div className="statistic-shift-value statistic-shift-ingots">
                              {shift.processed_ingots}
                            </div>
                            <div className="statistic-shift-label">Слитков</div>
                          </div>

                          <div className="statistic-shift-stat">
                            <div className="statistic-shift-value statistic-shift-defects">
                              {shift.total_crack}
                            </div>
                            <div className="statistic-shift-label">Дефектов</div>
                          </div>

                          <div className="statistic-shift-stat">
                            <div className="statistic-shift-value statistic-shift-quality">
                              {(100 - Number(shift.defect_rate || 0)).toFixed(1)}%
                            </div>
                            <div className="statistic-shift-label">Качество</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {shifts.length === 0 && (
                      <div style={{ color: "#8fb4d9" }}>
                        Смены пока не найдены
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="statistic-stats-container" style={{ marginTop: "20px" }}>
            <div className="statistic-panel-header">
              <h2 className="statistic-panel-header-title">
                <i className="fas fa-table"></i> История смен
              </h2>
            </div>

            <div className="statistic-panel-content">
              <div style={{ overflowX: "auto" }}>
                <table className="events-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Статус</th>
                      <th>Начало</th>
                      <th>Конец</th>
                      <th>Режим</th>
                      <th>Threshold</th>
                      <th>Слитков</th>
                      <th>OK</th>
                      <th>CRACK</th>
                      <th>% дефектных</th>
                      <th>avg max_p</th>
                    </tr>
                  </thead>

                  <tbody>
                    {shifts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="11"
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "#8fb4d9",
                          }}
                        >
                          Смены пока не найдены
                        </td>
                      </tr>
                    ) : (
                      shifts.map((shift) => (
                        <tr key={shift.shift_id}>
                          <td>#{shift.shift_id}</td>
                          <td>{statusText(shift.status)}</td>
                          <td>{formatDate(shift.started_at)}</td>
                          <td>{formatDate(shift.finished_at)}</td>
                          <td>{shift.mode || "—"}</td>
                          <td>{Number(shift.threshold || 0).toFixed(3)}</td>
                          <td>{shift.processed_ingots}</td>
                          <td>{shift.total_ok}</td>
                          <td>{shift.total_crack}</td>
                          <td>{Number(shift.defect_rate || 0).toFixed(2)}%</td>
                          <td>{Number(shift.avg_max_p_crack || 0).toFixed(3)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatusRow({ title, count, total, icon }) {
  const percent = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="statistic-defect-type statistic-defect-crack">
      <div className="statistic-defect-header">
        <div className="statistic-defect-name">
          <i className={icon}></i>
          <span>{title}</span>
        </div>
        <div className="statistic-defect-count">{count}</div>
      </div>

      <div className="statistic-progress-container">
        <div
          className="statistic-progress-fill"
          style={{ width: `${percent}%` }}
        ></div>
      </div>

      <div className="statistic-defect-percentage">
        {percent.toFixed(1)}% от событий
      </div>
    </div>
  );
}

export default Statistic;