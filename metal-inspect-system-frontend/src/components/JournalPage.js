import React, { useState, useEffect, useRef } from 'react';
import '../styles/journal.css';
import TopNav from "../components/TopNav";
import { api, API_BASE_URL } from "../services/Api";
const Journal = () => {
    // Начальные данные
    
    // Состояния
    const [activeTab, setActiveTab] = useState("inspections");

    const [inspectionData, setInspectionData] = useState([]);
    const [defectData, setDefectData] = useState([]);

    const [journalData, setJournalData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(""); 
    const [filters, setFilters] = useState({
        defectType: '',
        status: '',
        operator: '',
        confidence: ''
    });
    const [expandedComments, setExpandedComments] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage] = useState(10);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState('');
    const [reportData, setReportData] = useState(null);
    const loadingRef = useRef(false);
    const loadJournal = async ({ silent = false } = {}) => {
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
                operator: item.has_defect ? "Автоматически" : "ИИ-контроль",
                comment: item.comment || (item.has_defect ? "Требуется проверка оператором" : "Дефект не обнаружен"),
    
                defectType: item.defect_type || (item.has_defect ? "crack" : "ok"),
    
                bestFrameUrl: item.best_frame_url
                    ? `${API_BASE_URL}${item.best_frame_url}`
                    : null,
                aiModelId: item.ai_model_id,
                aiModelKey: item.ai_model_key,
                aiModelName: item.ai_model_name,
                aiModelType: item.ai_model_type,
                aiModelArchitecture: item.ai_model_architecture,
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
                comment: item.comment || "Требуется проверка оператором",
    
                defectType: item.defect_type || "crack",
    
                bestFrameUrl: item.best_frame_url
                    ? `${API_BASE_URL}${item.best_frame_url}`
                    : null,
                aiModelId: item.ai_model_id,
                aiModelKey: item.ai_model_key,
                aiModelName: item.ai_model_name,
                aiModelType: item.ai_model_type,
                aiModelArchitecture: item.ai_model_architecture,
            }));
    
            setInspectionData(mappedInspections);
            setDefectData(mappedDefects);
        } catch (e) {
            setError(e?.message || "Не удалось загрузить журнал");
        } finally {
            loadingRef.current = false;
    
            if (!silent) {
                setIsLoading(false);
            }
        }
    };
    const filterJournalData = (data) => {
        let result = [...data];
    
        if (filters.defectType) {
            result = result.filter((event) => event.defectType === filters.defectType);
        }
    
        if (filters.status) {
            result = result.filter((event) => event.status === filters.status);
        }
    
        if (filters.operator) {
            if (filters.operator === "ai") {
                result = result.filter((event) => event.operator === "Автоматически" || event.operator === "ИИ-контроль");
            } else if (filters.operator === "user") {
                result = result.filter((event) => event.operator !== "Автоматически" && event.operator !== "ИИ-контроль");
            }
        }
    
        if (filters.confidence) {
            if (filters.confidence === "high") {
                result = result.filter((event) => event.confidence > 0.9);
            } else if (filters.confidence === "medium") {
                result = result.filter((event) => event.confidence >= 0.75 && event.confidence <= 0.9);
            } else if (filters.confidence === "low") {
                result = result.filter((event) => event.confidence < 0.75);
            }
        }
    
        return result;
    };
    // Функции для фильтрации
    const applyFilters = () => {
        const data = activeTab === "inspections" ? inspectionData : defectData;
    
        setJournalData(data);
        setFilteredData(filterJournalData(data));
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setFilters({
            defectType: "",
            status: "",
            operator: "",
            confidence: ""
        });
    
        setCurrentPage(1);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };
    const confirmEvent = async (event) => {
        const comment = window.prompt("Комментарий к подтверждению:", "Трещина подтверждена");
    
        if (comment === null) return;
    
        try {
            await api.confirmDefect(event.defectDbId, comment);
            await loadJournal();
        } catch (e) {
            alert(e?.message || "Не удалось подтвердить дефект");
        }
    };
    
    const rejectEvent = async (event) => {
        const comment = window.prompt("Комментарий к отклонению:", "Ложное срабатывание");
    
        if (comment === null) return;
    
        try {
            await api.rejectDefect(event.defectDbId, comment);
            await loadJournal();
        } catch (e) {
            alert(e?.message || "Не удалось отклонить дефект");
        }
    };

    // Функции для работы с комментариями
    const toggleComment = (index) => {
        setExpandedComments(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const viewEventDetails = (event) => {
        const defectTypeText = {
            'crack': 'Трещина'
           
        }[event.defectType] || event.defectType;
    
        const statusText = {
            'confirmed': 'Подтверждено',
            'rejected': 'Отклонено',
            'pending': 'Ожидает'
        }[event.status] || event.status;
    
        alert(
            `Детали события:\n\n` +
            `ID записи: ${event.defectDbId}\n` +
            `ID слитка: ${event.id}\n` +
            `Время: ${event.time}\n` +
            `Тип дефекта: ${defectTypeText}\n` +
            `Статус: ${statusText}\n` +
            `Оператор: ${event.operator}\n` +
            `Комментарий: ${event.comment}\n\n` +
            `max_p_crack: ${Number(event.maxPCrack || 0).toFixed(3)}\n` +
            `threshold: ${Number(event.threshold || 0).toFixed(3)}\n` +
            `Режим: ${event.mode}\n` +
            `Кадров в слитке: ${event.framesCount}\n` +
            `Вердикт: ${event.verdict}`+
            `Модель: ${event.aiModelName || event.aiModelKey || "—"}\n` +
            `Архитектура: ${event.aiModelArchitecture || "—"}\n` 
        );
    };

    // Пагинация
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToPage = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Функции для отчетов
    const generateReport = (type) => {
        setReportType(type);
        
        // Генерация данных отчета
        let reportTitle = '';
        let reportContent = null;

        if (type === 'defectReport') {
            reportTitle = 'Сводный отчет по браку';
            const stats = calculateDefectStats();
            reportContent = {
                title: reportTitle,
                period: '01.06.2023 - 30.06.2023',
                stats: stats,
                defectDistribution: calculateDefectDistribution()
            };
        } else if (type === 'trendReport') {
            reportTitle = 'Динамика дефектов по сменам';
            reportContent = {
                title: reportTitle,
                period: '01.06.2023 - 30.06.2023',
                trendStats: calculateTrendStats(),
                shiftStats: calculateShiftStats()
            };
        }

        setReportData(reportContent);
        setReportModalOpen(true);
    };

    const calculateDefectStats = () => {
        const totalIngots = 1247;
        const defectsFound = filteredData.filter(d => d.status === 'confirmed').length;
        const defectRate = ((defectsFound / totalIngots) * 100).toFixed(2);
        
        return {
            totalIngots,
            defectsFound,
            defectRate
        };
    };

    const calculateDefectDistribution = () => {
        const distribution = {
            'crack': 0,
            'porosity': 0,
            'inclusion': 0,
            'scratch': 0
        };

        filteredData.forEach(event => {
            if (distribution[event.defectType] !== undefined) {
                distribution[event.defectType]++;
            }
        });

        return distribution;
    };

    const calculateTrendStats = () => {
        return {
            change: -2,
            avgDefectRate: '1.44%',
            peakValues: 3
        };
    };

    const calculateShiftStats = () => {
        return [
            { shift: 'Смена #1 (ночная)', defects: 7, defectRate: '1.8%' },
            { shift: 'Смена #2 (дневная)', defects: 5, defectRate: '1.2%' },
            { shift: 'Смена #3 (вечерняя)', defects: 6, defectRate: '1.3%' }
        ];
    };

    // Вспомогательные функции для рендеринга
    const getConfidenceClass = (confidence) => {
        if (confidence > 0.9) return 'high-confidence';
        if (confidence > 0.8) return 'medium-confidence';
        return 'low-confidence';
    };

    const getOperatorAvatar = (operator) => {
        if (operator === 'Иванов А.С.') {
            return <div className="operator-avatar">И</div>;
        } else if (operator === 'Петров В.И.') {
            return <div className="operator-avatar">П</div>;
        } else if (operator === 'Сидорова Е.П.') {
            return <div className="operator-avatar">С</div>;
        } else {
            return <div className="operator-avatar"><i className="fas fa-robot"></i></div>;
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'ok') {
            return <span className="status-badge status-confirmed">OK</span>;
        }
    
        if (status === 'confirmed') {
            return <span className="status-badge status-confirmed">Подтверждено</span>;
        }
    
        if (status === 'rejected') {
            return <span className="status-badge status-rejected">Отклонено</span>;
        }
    
        if (status === 'sent_to_mes') {
            return <span className="status-badge status-confirmed">Передано в MES</span>;
        }
    
        return <span className="status-badge status-pending">Ожидает</span>;
    };

    // Эффекты
  
    useEffect(() => {
        loadJournal();
    
        const interval = setInterval(() => {
            loadJournal();
        }, 3000);
    
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const data = activeTab === "inspections" ? inspectionData : defectData;
        const filtered = filterJournalData(data);
    
        setJournalData(data);
        setFilteredData(filtered);
    }, [activeTab, inspectionData, defectData, filters]);
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filters]);

//    
return (
    <div className="journal-page">
        {/* Шапка */}
        <TopNav
            subtitle="Система распознавания трещин в слитках • Журнал событий и отчетность"
            userName="Оператор Иванов А.С."
            userRole="Смена #3 • 08:00-20:00"
            />
        {error && (
            <div style={{ color: "#f44336", padding: "12px 20px", fontWeight: "600" }}>
                {error}
            </div>
        )}

        
        {/* Основное содержимое */}
        <div className="journal-main-content">
            {/* Левая панель - фильтры и отчеты */}
            <div className="journal-sidebar">
                {/* Панель фильтров */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <button
                        className={`filter-btn ${activeTab === "inspections" ? "primary" : "secondary"}`}
                        onClick={() => setActiveTab("inspections")}
                    >
                        Все проверки
                    </button>

                    <button
                        className={`filter-btn ${activeTab === "defects" ? "primary" : "secondary"}`}
                        onClick={() => setActiveTab("defects")}
                    >
                        Дефектные события
                    </button>
                </div>
                <div className="filters-panel">
                    <div className="panel-header">
                        <h2><i className="fas fa-filter"></i> Фильтрация событий</h2>
                    </div>
                    
                    <div className="filters-content">
                        <div className="filter-group">
                            <label htmlFor="dateRange">
                                <i className="far fa-calendar-alt"></i> Диапазон дат
                            </label>
                            <input 
                                type="text" 
                                id="dateRange" 
                                className="filter-input" 
                                placeholder="Выберите период" 
                                defaultValue="01.06.2023 - 30.06.2023"
                                onClick={() => alert('В реальной системе здесь будет календарь для выбора диапазона дат')}
                            />
                        </div>
                        
                        <div className="filter-group">
                            <label htmlFor="defectType">
                                <i className="fas fa-exclamation-triangle"></i> Тип дефекта
                            </label>
                            <select 
                                id="defectType" 
                                className="filter-select"
                                value={filters.defectType}
                                onChange={(e) => handleFilterChange('defectType', e.target.value)}
                            >
                                <option value="">Все типы</option>
                                <option value="crack">Трещина</option>
                                <option value="porosity">Пористость</option>
                                <option value="inclusion">Включения</option>
                                <option value="scratch">Царапина</option>
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label htmlFor="status">
                                <i className="fas fa-check-circle"></i> Финальный статус
                            </label>
                            <select 
                                id="status" 
                                className="filter-select"
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">Все статусы</option>
                                <option value="confirmed">Подтверждено</option>
                                <option value="rejected">Отклонено</option>
                                <option value="pending">Ожидает проверки</option>
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label htmlFor="operator">
                                <i className="fas fa-user"></i> Исполнитель
                            </label>
                            <select 
                                id="operator" 
                                className="filter-select"
                                value={filters.operator}
                                onChange={(e) => handleFilterChange('operator', e.target.value)}
                            >
                                <option value="">Все операторы</option>
                                <option value="ai">Автоматически (ИИ)</option>
                                <option value="user">Инженер / пользователь</option>
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label htmlFor="confidence">
                                <i className="fas fa-chart-line"></i> Уверенность ИИ
                            </label>
                            <select 
                                id="confidence" 
                                className="filter-select"
                                value={filters.confidence}
                                onChange={(e) => handleFilterChange('confidence', e.target.value)}
                            >
                                <option value="">Любая уверенность</option>
                                <option value="high">Высокая (&gt;90%)</option>
                                <option value="medium">Средняя (75-90%)</option>
                                <option value="low">Низкая (&lt;75%)</option>
                            </select>
                        </div>
                        
                        <div className="filter-buttons">
                            <button 
                                className="filter-btn primary"
                                onClick={applyFilters}
                            >
                                <i className="fas fa-search"></i> Применить фильтры
                            </button>
                            <button 
                                className="filter-btn secondary"
                                onClick={resetFilters}
                            >
                                <i className="fas fa-redo"></i> Сбросить
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Панель отчетов */}
                
            </div>
            
            {/* Правая панель - журнал событий */}
            <div className="journal-main-panel">
                <div className="panel-header">
                <h2>
                    <i className="fas fa-history"></i>{" "}
                    {activeTab === "inspections" ? "Журнал проверок слитков" : "Журнал дефектных событий"}
                </h2>
                    <div className="controls">
                        <div className="record-count">
                            Найдено {filteredData.length} записей
                        </div>
                        <button 
                            className="filter-btn secondary"
                            onClick={() => alert('В реальной системе здесь будет экспорт данных в CSV/Excel формат')}
                        >
                            <i className="fas fa-file-export"></i> Экспорт
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
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8fb4d9' }}>
                                            <i className="fas fa-search" style={{ fontSize: '2rem', marginBottom: '15px', display: 'block' }}></i>
                                            <div>По заданным фильтрам записей не найдено</div>
                                        </td>
                                    </tr>
                                ) : (
                                    currentRecords.map((event, index) => {
                                        const globalIndex = indexOfFirstRecord + index;
                                        const confidencePercent = Math.round(event.confidence * 100);
                                        
                                        return (
                                            <tr key={globalIndex}>
                                                <td className="time-cell">{event.time}</td>
                                                <td className="id-cell">{event.id}</td>
                                                <td>
                                                    <div className="confidence-cell">
                                                        <div className="confidence-bar">
                                                            <div 
                                                                className={`confidence-fill ${getConfidenceClass(event.confidence)}`}
                                                                style={{ width: `${confidencePercent}%` }}
                                                            ></div>
                                                        </div>
                                                        <span>{confidencePercent}%</span>
                                                    </div>
                                                </td>
                                                <td>{getStatusBadge(event.status)}</td>
                                                <td>
                                                    <div className="operator-cell">
                                                        {getOperatorAvatar(event.operator)}
                                                        <span>{event.operator}</span>
                                                    </div>
                                                </td>
                                                <td 
                                                    className={`comment-cell ${expandedComments[globalIndex] ? 'expanded' : ''}`}
                                                >
                                                    {event.comment}
                                                </td>
                                                <td className="action-cell">
                                                    <button 
                                                        className="action-btn" 
                                                        title="Просмотреть детали"
                                                        onClick={() => viewEventDetails(event)}
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>

                                                    <button 
                                                        className="action-btn" 
                                                        title={expandedComments[globalIndex] ? 'Свернуть комментарий' : 'Развернуть комментарий'}
                                                        onClick={() => toggleComment(globalIndex)}
                                                    >
                                                        <i className={`fas fa-${expandedComments[globalIndex] ? 'compress-alt' : 'expand-alt'}`}></i>
                                                    </button>

                                                    {event.type === "defect" && (
                                                    <>
                                                        <button 
                                                            className="action-btn" 
                                                            title="Подтвердить дефект"
                                                            onClick={() => confirmEvent(event)}
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>

                                                        <button 
                                                            className="action-btn" 
                                                            title="Отклонить срабатывание"
                                                            onClick={() => rejectEvent(event)}
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </>
)}
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
                            Показаны записи {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredData.length)} из {filteredData.length}
                        </div>
                        <div className="pagination-controls">
                            <div 
                                className={`page-btn ${currentPage === 1 ? 'disabled' : ''}`}
                                onClick={prevPage}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </div>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <div 
                                        key={pageNum}
                                        className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                                        onClick={() => goToPage(pageNum)}
                                    >
                                        {pageNum}
                                    </div>
                                );
                            })}
                            
                            <div 
                                className={`page-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                                onClick={nextPage}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Модальное окно с отчетом */}
        {reportModalOpen && reportData && (
            <div className="modal-overlay" onClick={() => setReportModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3><i className="fas fa-chart-pie"></i> {reportData.title}</h3>
                        <button 
                            className="close-modal"
                            onClick={() => setReportModalOpen(false)}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="modal-body">
                        {reportType === 'defectReport' && reportData && (
                            <div className="report-preview">
                                <div className="report-title">{reportData.title}</div>
                                <div className="report-period">Период: {reportData.period}</div>
                                
                                <div className="report-stats">
                                    <div className="report-stat">
                                        <div className="report-stat-value">{reportData.stats.totalIngots.toLocaleString()}</div>
                                        <div className="report-stat-label">Проверено слитков</div>
                                    </div>
                                    <div className="report-stat">
                                        <div className="report-stat-value">{reportData.stats.defectsFound}</div>
                                        <div className="report-stat-label">Выявлено дефектов</div>
                                    </div>
                                    <div className="report-stat">
                                        <div className="report-stat-value">{reportData.stats.defectRate}%</div>
                                        <div className="report-stat-label">Процент брака</div>
                                    </div>
                                </div>
                                
                                <div className="report-chart">
                                    <div className="chart-placeholder">
                                        <i className="fas fa-chart-bar"></i>
                                        <div>Диаграмма распределения дефектов по типам</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                                            (В реальной системе здесь будет график)
                                        </div>
                                    </div>
                                </div>
                                
                                <h3 style={{ color: '#e0e0e0', marginBottom: '15px' }}>Распределение по типам дефектов:</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                                    {Object.entries(reportData.defectDistribution).map(([type, count]) => {
                                        const typeNames = {
                                            'crack': 'Трещины',
                                            'porosity': 'Пористость',
                                            'inclusion': 'Включения',
                                            'scratch': 'Царапины'
                                        };
                                        
                                        const percentage = ((count / reportData.stats.defectsFound) * 100).toFixed(1);
                                        
                                        return (
                                            <div key={type} style={{ backgroundColor: 'rgba(40, 60, 85, 0.8)', padding: '15px', borderRadius: '6px' }}>
                                                <div style={{ fontWeight: '600', color: '#4dabf7' }}>
                                                    {typeNames[type] || type}
                                                </div>
                                                <div style={{ fontSize: '1.2rem', marginTop: '5px' }}>
                                                    {count} ({percentage}%)
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {reportType === 'trendReport' && reportData && (
                            <div className="report-preview">
                                <div className="report-title">{reportData.title}</div>
                                <div className="report-period">Период: {reportData.period}</div>
                                
                                <div className="report-stats">
                                    <div className="report-stat">
                                        <div className="report-stat-value">{reportData.trendStats.change}</div>
                                        <div className="report-stat-label">Изменение за месяц</div>
                                    </div>
                                    <div className="report-stat">
                                        <div className="report-stat-value">{reportData.trendStats.avgDefectRate}</div>
                                        <div className="report-stat-label">Средний % брака</div>
                                    </div>
                                    <div className="report-stat">
                                        <div className="report-stat-value">{reportData.trendStats.peakValues}</div>
                                        <div className="report-stat-label">Пиковых значений</div>
                                    </div>
                                </div>
                                
                                <div className="report-chart">
                                    <div className="chart-placeholder">
                                        <i className="fas fa-chart-line"></i>
                                        <div>График изменения количества дефектов по сменам</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                                            (В реальной системе здесь будет график трендов)
                                        </div>
                                    </div>
                                </div>
                                
                                <h3 style={{ color: '#e0e0e0', marginBottom: '15px' }}>Статистика по сменам:</h3>
                                <div style={{ backgroundColor: 'rgba(40, 60, 85, 0.8)', padding: '20px', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(60, 120, 180, 0.2)' }}>
                                        <div style={{ fontWeight: '600', color: '#b0c4de' }}>Смена</div>
                                        <div style={{ fontWeight: '600', color: '#b0c4de' }}>Дефектов</div>
                                        <div style={{ fontWeight: '600', color: '#b0c4de' }}>% брака</div>
                                    </div>
                                    {reportData.shiftStats.map((shift, index) => (
                                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div>{shift.shift}</div>
                                            <div>{shift.defects}</div>
                                            <div>{shift.defectRate}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-actions">
                        <button 
                            className="modal-btn secondary"
                            onClick={() => alert('В реальной системе здесь будет печать отчета')}
                        >
                            <i className="fas fa-print"></i> Печать
                        </button>
                        <button 
                            className="modal-btn secondary"
                            onClick={() => alert('В реальной системе здесь будет экспорт отчета в Excel')}
                        >
                            <i className="fas fa-file-excel"></i> Экспорт в Excel
                        </button>
                        <button 
                            className="modal-btn primary"
                            onClick={() => setReportModalOpen(false)}
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
};


export default Journal;