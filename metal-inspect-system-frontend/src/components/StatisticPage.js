
import "../styles/statistic.css";
import React, { useState, useEffect } from 'react';
import TopNav from "../components/TopNav";


const Statistic = () => {
    // Состояния для фильтров
    const [filters, setFilters] = useState({
        period: 'week',
        line: 'all',
        shift: 'all',
        defectType: 'all',
        groupBy: 'shift'
    });

    // Состояния для статистики
    const [stats, setStats] = useState({
        totalIngots: 1247,
        totalDefects: 18,
        qualityRate: 98.56,
        costSavings: 124700
    });

    // Состояния для распределения дефектов
    const [defectsDistribution, setDefectsDistribution] = useState({
        cracks: 12,
        porosity: 3,
        inclusion: 2,
        scratch: 1
    });

    // Состояния для статистики по сменам
    const [shiftsStats, setShiftsStats] = useState({
        shift1: { defects: 7, ingots: 412, quality: 98.3 },
        shift2: { defects: 5, ingots: 398, quality: 98.7 },
        shift3: { defects: 6, ingots: 437, quality: 98.6 }
    });

    // Состояния для Heat Map
    const [heatMapData, setHeatMapData] = useState([]);

    // Состояние для уведомлений
    const [notification, setNotification] = useState(null);

    // Инициализация Heat Map
    const generateHeatMapData = () => {
        const data = [];
        for (let i = 0; i < 50; i++) {
            data.push(Math.floor(Math.random() * 8));
        }
        return data;
    };

    // Данные для разных периодов
    const periodData = {
        today: { ingots: 187, defects: 3, quality: 98.4, savings: 18700 },
        week: { ingots: 1247, defects: 18, quality: 98.56, savings: 124700 },
        month: { ingots: 5215, defects: 72, quality: 98.62, savings: 521500 }
    };

    // Данные для разных типов дефектов
    const defectTypeData = {
        all: { cracks: 12, porosity: 3, inclusion: 2, scratch: 1 },
        crack: { cracks: 12, porosity: 0, inclusion: 0, scratch: 0 },
        porosity: { cracks: 0, porosity: 3, inclusion: 0, scratch: 0 },
        inclusion: { cracks: 0, porosity: 0, inclusion: 2, scratch: 0 },
        scratch: { cracks: 0, porosity: 0, inclusion: 0, scratch: 1 }
    };

    // Данные для разных смен
    const shiftData = {
        all: { 
            shift1: { defects: 7, ingots: 412, quality: 98.3 },
            shift2: { defects: 5, ingots: 398, quality: 98.7 },
            shift3: { defects: 6, ingots: 437, quality: 98.6 } 
        },
        shift1: { 
            shift1: { defects: 7, ingots: 412, quality: 98.3 },
            shift2: { defects: 0, ingots: 0, quality: 0 },
            shift3: { defects: 0, ingots: 0, quality: 0 } 
        },
        shift2: { 
            shift1: { defects: 0, ingots: 0, quality: 0 },
            shift2: { defects: 5, ingots: 398, quality: 98.7 },
            shift3: { defects: 0, ingots: 0, quality: 0 } 
        },
        shift3: { 
            shift1: { defects: 0, ingots: 0, quality: 0 },
            shift2: { defects: 0, ingots: 0, quality: 0 },
            shift3: { defects: 6, ingots: 437, quality: 98.6 } 
        }
    };

    // Эффект для инициализации Heat Map
    useEffect(() => {
        setHeatMapData(generateHeatMapData());
    }, []);

    // Эффект для обновления статистики при изменении фильтров
    useEffect(() => {
        updateStatistics();
    }, [filters]);

    // Эффект для обновления статистики в реальном времени
    useEffect(() => {
        const interval = setInterval(() => {
            // Небольшие случайные изменения
            setStats(prev => ({
                ...prev,
                totalIngots: prev.totalIngots + Math.floor(Math.random() * 3) + 1,
                totalDefects: prev.totalDefects + (Math.random() > 0.7 ? 1 : 0)
            }));
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    // Эффект для пересчета процента качества
    useEffect(() => {
        const newQuality = ((stats.totalIngots - stats.totalDefects) / stats.totalIngots * 100).toFixed(2);
        const newSavings = stats.totalIngots * 100;
        
        setStats(prev => ({
            ...prev,
            qualityRate: parseFloat(newQuality),
            costSavings: newSavings
        }));
    }, [stats.totalIngots, stats.totalDefects]);

    // Функция обновления статистики
    const updateStatistics = () => {
        const data = periodData[filters.period] || periodData.week;
        const defectData = defectTypeData[filters.defectType] || defectTypeData.all;
        const shiftStats = shiftData[filters.shift] || shiftData.all;

        setStats({
            totalIngots: data.ingots,
            totalDefects: data.defects,
            qualityRate: data.quality,
            costSavings: data.savings
        });

        setDefectsDistribution(defectData);
        setShiftsStats(shiftStats);
    };

    // Функция применения фильтров
    const applyFilters = () => {
        updateStatistics();
        showNotification('Фильтры применены', 'success');
    };

    // Функция сброса фильтров
    const resetFilters = () => {
        setFilters({
            period: 'week',
            line: 'all',
            shift: 'all',
            defectType: 'all',
            groupBy: 'shift'
        });
        showNotification('Фильтры сброшены', 'info');
    };

    // Функция изменения фильтра
    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    // Функция отображения уведомлений
    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Функция экспорта в Excel
    const exportToExcel = () => {
        showNotification('Формирование отчета Excel...', 'info');
        setTimeout(() => showNotification('Отчет успешно экспортирован в Excel', 'success'), 1500);
    };

    // Функция экспорта в PDF
    const exportToPDF = () => {
        showNotification('Формирование PDF отчета...', 'info');
        setTimeout(() => showNotification('PDF отчет успешно сформирован', 'success'), 2000);
    };

    // Функция получения цвета Heat Map
    const getHeatMapColor = (defectCount) => {
        if (defectCount <= 1) return 'heatmap-low';
        if (defectCount <= 3) return 'heatmap-medium';
        if (defectCount <= 5) return 'heatmap-high';
        return 'heatmap-critical';
    };

    // Функция получения процента для дефекта
    const getDefectPercentage = (count) => {
        const total = Object.values(defectsDistribution).reduce((sum, val) => sum + val, 0);
        return total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    };

    // Получение текста периода для отображения
    const getPeriodText = () => {
        const periodText = {
            today: 'Сегодня',
            week: '12-18 июня 2023',
            month: 'Июнь 2023',
            quarter: '2-й квартал 2023',
            year: '2023 год'
        };
        return periodText[filters.period] || '12-18 июня 2023';
    };

    return (
        <div className="statistic-page">
            {/* Фоновое изображение */}
            <div className="statistic-page-bg"></div>

            {/* Уведомление */}
            {notification && (
                <div className={`notification ${notification.type}`}>
                    <i className={`fas fa-${notification.type === 'success' ? 'check-circle' : 'info-circle'}`}></i>
                    {notification.message}
                </div>
            )}

            {/* Контейнер */}
            <div className="statistic-container">
                {/* Шапка */}
                <TopNav
                    subtitle="Система распознавания трещин в слитках • Статистика и аналитика"
                    userName="Оператор Иванов А.С."
                    userRole="Смена #3 • 08:00-20:00"
                />

                {/* Основное содержимое */}
                <div className="statistic-main-content">
                    {/* Панель фильтров */}
                    <div className="statistic-filters-panel">
                        <div className="statistic-filters-flex">
                            <div className="statistic-filter-group">
                                <label className="statistic-filter-label">
                                    <i className="far fa-calendar-alt"></i> Период
                                </label>
                                <select 
                                    className="statistic-filter-select"
                                    value={filters.period}
                                    onChange={(e) => handleFilterChange('period', e.target.value)}
                                >
                                    <option value="today">Сегодня</option>
                                    <option value="yesterday">Вчера</option>
                                    <option value="week">Неделя</option>
                                    <option value="month">Месяц</option>
                                    <option value="quarter">Квартал</option>
                                    <option value="year">Год</option>
                                    <option value="custom">Произвольный</option>
                                </select>
                            </div>
                            
                            <div className="statistic-filter-group">
                                <label className="statistic-filter-label">
                                    <i className="fas fa-industry"></i> Производственная линия
                                </label>
                                <select 
                                    className="statistic-filter-select"
                                    value={filters.line}
                                    onChange={(e) => handleFilterChange('line', e.target.value)}
                                >
                                    <option value="all">Все линии</option>
                                    <option value="line1">Линия разливки #1</option>
                                    <option value="line2">Линия разливки #2</option>
                                    <option value="line3">Линия разливки #3</option>
                                </select>
                            </div>
                            
                            <div className="statistic-filter-group">
                                <label className="statistic-filter-label">
                                    <i className="fas fa-user-clock"></i> Смена
                                </label>
                                <select 
                                    className="statistic-filter-select"
                                    value={filters.shift}
                                    onChange={(e) => handleFilterChange('shift', e.target.value)}
                                >
                                    <option value="all">Все смены</option>
                                    <option value="shift1">Смена #1 (ночная)</option>
                                    <option value="shift2">Смена #2 (дневная)</option>
                                    <option value="shift3">Смена #3 (вечерняя)</option>
                                </select>
                            </div>
                            
                            <div className="statistic-filter-group">
                                <label className="statistic-filter-label">
                                    <i className="fas fa-exclamation-triangle"></i> Тип дефекта
                                </label>
                                <select 
                                    className="statistic-filter-select"
                                    value={filters.defectType}
                                    onChange={(e) => handleFilterChange('defectType', e.target.value)}
                                >
                                    <option value="all">Все типы</option>
                                    <option value="crack">Трещины</option>
                                    <option value="porosity">Пористость</option>
                                    <option value="inclusion">Включения</option>
                                    <option value="scratch">Царапины</option>
                                </select>
                            </div>
                            
                            <div className="statistic-filter-buttons">
                                <button 
                                    className="statistic-filter-btn statistic-filter-btn-primary"
                                    onClick={applyFilters}
                                >
                                    <i className="fas fa-filter"></i> Применить фильтры
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
                    
                    {/* Основная панель статистики */}
                    <div className="statistic-stats-panel">
                        {/* Левая часть - основная статистика */}
                        <div className="statistic-main-stats">
                            {/* Общая статистика */}
                            <div className="statistic-stats-container">
                                <div className="statistic-panel-header">
                                    <h2 className="statistic-panel-header-title">
                                        <i className="fas fa-chart-bar"></i> Общая статистика контроля качества
                                    </h2>
                                    <div className="statistic-period-info">
                                        Период: {getPeriodText()}
                                    </div>
                                </div>
                                <div className="statistic-panel-content">
                                    <div className="statistic-overall-stats">
                                        <div className="statistic-stat-card statistic-stat-total">
                                            <div className="statistic-stat-value">{stats.totalIngots.toLocaleString()}</div>
                                            <div className="statistic-stat-label">Всего проверено слитков</div>
                                            <div className="statistic-stat-change statistic-change-up">
                                                <i className="fas fa-arrow-up"></i> +5.2% к прошлой неделе
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-stat-card statistic-stat-defects">
                                            <div className="statistic-stat-value">{stats.totalDefects}</div>
                                            <div className="statistic-stat-label">Выявлено дефектов</div>
                                            <div className="statistic-stat-change statistic-change-down">
                                                <i className="fas fa-arrow-down"></i> -2.7% к прошлой неделе
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-stat-card statistic-stat-quality">
                                            <div className="statistic-stat-value">{stats.qualityRate.toFixed(2)}%</div>
                                            <div className="statistic-stat-label">Процент качественных</div>
                                            <div className="statistic-stat-change statistic-change-up">
                                                <i className="fas fa-arrow-up"></i> +0.3% к прошлой неделе
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-stat-card statistic-stat-cost">
                                            <div className="statistic-stat-value">₽{stats.costSavings.toLocaleString()}</div>
                                            <div className="statistic-stat-label">Экономия от системы</div>
                                            <div className="statistic-stat-change statistic-change-up">
                                                <i className="fas fa-arrow-up"></i> +8.5% к прошлой неделе
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* График динамики */}
                                    <div className="statistic-chart-container">
                                        <div className="statistic-chart-placeholder">
                                            <i className="fas fa-chart-line"></i>
                                            <div className="statistic-chart-title">Динамика обнаружения дефектов по дням</div>
                                            <div className="statistic-chart-description">
                                                График показывает изменение количества дефектов<br />
                                                и процента брака за выбранный период
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="statistic-legend">
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color" style={{ backgroundColor: '#f44336' }}></div>
                                            <span>Количество дефектов</span>
                                        </div>
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                                            <span>Процент качественных</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Распределение дефектов */}
                            <div className="statistic-stats-container">
                                <div className="statistic-panel-header">
                                    <h2 className="statistic-panel-header-title">
                                        <i className="fas fa-pie-chart"></i> Распределение дефектов по типам
                                    </h2>
                                    <div className="statistic-defects-total">
                                        Всего дефектов: {Object.values(defectsDistribution).reduce((sum, val) => sum + val, 0)}
                                    </div>
                                </div>
                                <div className="statistic-panel-content">
                                    <div className="statistic-defects-distribution">
                                        <div className="statistic-defect-type statistic-defect-crack">
                                            <div className="statistic-defect-header">
                                                <div className="statistic-defect-name">
                                                    <i className="fas fa-exclamation-circle"></i>
                                                    <span>Трещины</span>
                                                </div>
                                                <div className="statistic-defect-count">{defectsDistribution.cracks}</div>
                                            </div>
                                            <div className="statistic-progress-container">
                                                <div 
                                                    className="statistic-progress-fill" 
                                                    style={{ 
                                                        width: `${getDefectPercentage(defectsDistribution.cracks)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="statistic-defect-percentage">
                                                {getDefectPercentage(defectsDistribution.cracks)}% от всех дефектов
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-defect-type statistic-defect-porosity">
                                            <div className="statistic-defect-header">
                                                <div className="statistic-defect-name">
                                                    <i className="fas fa-circle"></i>
                                                    <span>Пористость</span>
                                                </div>
                                                <div className="statistic-defect-count">{defectsDistribution.porosity}</div>
                                            </div>
                                            <div className="statistic-progress-container">
                                                <div 
                                                    className="statistic-progress-fill" 
                                                    style={{ 
                                                        width: `${getDefectPercentage(defectsDistribution.porosity)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="statistic-defect-percentage">
                                                {getDefectPercentage(defectsDistribution.porosity)}% от всех дефектов
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-defect-type statistic-defect-inclusion">
                                            <div className="statistic-defect-header">
                                                <div className="statistic-defect-name">
                                                    <i className="fas fa-asterisk"></i>
                                                    <span>Включения</span>
                                                </div>
                                                <div className="statistic-defect-count">{defectsDistribution.inclusion}</div>
                                            </div>
                                            <div className="statistic-progress-container">
                                                <div 
                                                    className="statistic-progress-fill" 
                                                    style={{ 
                                                        width: `${getDefectPercentage(defectsDistribution.inclusion)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="statistic-defect-percentage">
                                                {getDefectPercentage(defectsDistribution.inclusion)}% от всех дефектов
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-defect-type statistic-defect-scratch">
                                            <div className="statistic-defect-header">
                                                <div className="statistic-defect-name">
                                                    <i className="fas fa-grip-lines"></i>
                                                    <span>Царапины</span>
                                                </div>
                                                <div className="statistic-defect-count">{defectsDistribution.scratch}</div>
                                            </div>
                                            <div className="statistic-progress-container">
                                                <div 
                                                    className="statistic-progress-fill" 
                                                    style={{ 
                                                        width: `${getDefectPercentage(defectsDistribution.scratch)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="statistic-defect-percentage">
                                                {getDefectPercentage(defectsDistribution.scratch)}% от всех дефектов
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="statistic-chart-container statistic-pie-chart-container">
                                        <div className="statistic-chart-placeholder">
                                            <i className="fas fa-chart-pie"></i>
                                            <div className="statistic-chart-title">Круговая диаграмма распределения дефектов</div>
                                            <div className="statistic-chart-description">
                                                Визуализация соотношения различных типов дефектов
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Правая часть - дополнительная статистика */}
                        <div className="statistic-sidebar-stats">
                            {/* Статистика по сменам */}
                            <div className="statistic-stats-container">
                                <div className="statistic-panel-header">
                                    <h2 className="statistic-panel-header-title">
                                        <i className="fas fa-user-clock"></i> Статистика по сменам
                                    </h2>
                                </div>
                                <div className="statistic-panel-content">
                                    <div className="statistic-shifts-stats">
                                        <div className="statistic-shift-row">
                                            <div className="statistic-shift-info">
                                                <div className="statistic-shift-name">Смена #1 (ночная)</div>
                                                <div className="statistic-shift-time">22:00 - 06:00</div>
                                            </div>
                                            <div className="statistic-shift-stats">
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-defects">
                                                        {shiftsStats.shift1.defects}
                                                    </div>
                                                    <div className="statistic-shift-label">Дефектов</div>
                                                </div>
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-ingots">
                                                        {shiftsStats.shift1.ingots}
                                                    </div>
                                                    <div className="statistic-shift-label">Слитков</div>
                                                </div>
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-quality">
                                                        {shiftsStats.shift1.quality > 0 ? `${shiftsStats.shift1.quality.toFixed(1)}%` : '—'}
                                                    </div>
                                                    <div className="statistic-shift-label">Качество</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-shift-row">
                                            <div className="statistic-shift-info">
                                                <div className="statistic-shift-name">Смена #2 (дневная)</div>
                                                <div className="statistic-shift-time">06:00 - 14:00</div>
                                            </div>
                                            <div className="statistic-shift-stats">
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-defects">
                                                        {shiftsStats.shift2.defects}
                                                    </div>
                                                    <div className="statistic-shift-label">Дефектов</div>
                                                </div>
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-ingots">
                                                        {shiftsStats.shift2.ingots}
                                                    </div>
                                                    <div className="statistic-shift-label">Слитков</div>
                                                </div>
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-quality">
                                                        {shiftsStats.shift2.quality > 0 ? `${shiftsStats.shift2.quality.toFixed(1)}%` : '—'}
                                                    </div>
                                                    <div className="statistic-shift-label">Качество</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-shift-row">
                                            <div className="statistic-shift-info">
                                                <div className="statistic-shift-name">Смена #3 (вечерняя)</div>
                                                <div className="statistic-shift-time">14:00 - 22:00</div>
                                            </div>
                                            <div className="statistic-shift-stats">
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-defects">
                                                        {shiftsStats.shift3.defects}
                                                    </div>
                                                    <div className="statistic-shift-label">Дефектов</div>
                                                </div>
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-ingots">
                                                        {shiftsStats.shift3.ingots}
                                                    </div>
                                                    <div className="statistic-shift-label">Слитков</div>
                                                </div>
                                                <div className="statistic-shift-stat">
                                                    <div className="statistic-shift-value statistic-shift-quality">
                                                        {shiftsStats.shift3.quality > 0 ? `${shiftsStats.shift3.quality.toFixed(1)}%` : '—'}
                                                    </div>
                                                    <div className="statistic-shift-label">Качество</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="statistic-legend statistic-shifts-legend">
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color" style={{ backgroundColor: '#f44336' }}></div>
                                            <span>Дефекты</span>
                                        </div>
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                                            <span>Слитки</span>
                                        </div>
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                                            <span>Качество</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Heat Map распределения дефектов */}
                            <div className="statistic-stats-container">
                                <div className="statistic-panel-header">
                                    <h2 className="statistic-panel-header-title">
                                        <i className="fas fa-map"></i> Heat Map дефектов на слитках
                                    </h2>
                                </div>
                                <div className="statistic-panel-content">
                                    <div className="statistic-heatmap-description">
                                        Распределение дефектов по зонам слитка (вид сверху)
                                    </div>
                                    
                                    <div className="statistic-heatmap-container">
                                        <div className="statistic-heatmap-grid">
                                            {heatMapData.map((defectCount, index) => (
                                                <div 
                                                    key={index}
                                                    className={`statistic-heatmap-cell ${getHeatMapColor(defectCount)} ${defectCount > 0 ? 'statistic-pulse-animation' : ''}`}
                                                    data-defects={`${defectCount} дефектов`}
                                                    title={`${defectCount} дефектов`}
                                                    style={{ animationDelay: `${(index % 10) * 0.1}s` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="statistic-legend statistic-heatmap-legend">
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color statistic-heatmap-low"></div>
                                            <span>0-1 дефектов</span>
                                        </div>
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color statistic-heatmap-medium"></div>
                                            <span>2-3 дефекта</span>
                                        </div>
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color statistic-heatmap-high"></div>
                                            <span>4-5 дефектов</span>
                                        </div>
                                        <div className="statistic-legend-item">
                                            <div className="statistic-legend-color statistic-heatmap-critical"></div>
                                            <span>6+ дефектов</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Экономические показатели */}
                            <div className="statistic-stats-container">
                                <div className="statistic-panel-header">
                                    <h2 className="statistic-panel-header-title">
                                        <i className="fas fa-coins"></i> Экономические показатели
                                    </h2>
                                </div>
                                <div className="statistic-panel-content">
                                    <div className="statistic-economic-stats">
                                        <div className="statistic-economic-card statistic-economic-savings">
                                            <div className="statistic-economic-value">₽{stats.costSavings.toLocaleString()}</div>
                                            <div className="statistic-economic-label">Экономия за неделю</div>
                                            <div className="statistic-stat-change statistic-change-up">
                                                <i className="fas fa-arrow-up"></i> +8.5%
                                            </div>
                                        </div>
                                        
                                        <div className="statistic-economic-card statistic-economic-roi">
                                            <div className="statistic-economic-value">214%</div>
                                            <div className="statistic-economic-label">ROI системы</div>
                                            <div className="statistic-stat-change statistic-change-up">
                                                <i className="fas fa-arrow-up"></i> +12%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="statistic-economic-details">
                                        <div className="statistic-economic-detail">
                                            <span>Средняя стоимость брака:</span>
                                            <span className="statistic-economic-detail-value statistic-economic-negative">₽6,500</span>
                                        </div>
                                        <div className="statistic-economic-detail">
                                            <span>Трудозатраты на контроль:</span>
                                            <span className="statistic-economic-detail-value statistic-economic-positive">-68%</span>
                                        </div>
                                        <div className="statistic-economic-detail">
                                            <span>Окупаемость системы:</span>
                                            <span className="statistic-economic-detail-value statistic-economic-positive">5.2 мес.</span>
                                        </div>
                                    </div>
                                    
                                    <div className="statistic-export-options">
                                        <button 
                                            className="statistic-export-btn statistic-export-excel"
                                            onClick={exportToExcel}
                                        >
                                            <i className="fas fa-file-excel"></i> Excel
                                        </button>
                                        <button 
                                            className="statistic-export-btn statistic-export-pdf"
                                            onClick={exportToPDF}
                                        >
                                            <i className="fas fa-file-pdf"></i> PDF отчет
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Statistic;