import React, { useState, useEffect } from 'react';
import '../styles/journal.css';

const Journal = () => {
    // Начальные данные
    const initialJournalData = [
        { time: "2023-06-15 14:23:17", id: "SL-4829", confidence: 0.96, status: "confirmed", operator: "Иванов А.С.", comment: "Глубокая продольная трещина, требуется переплавка", defectType: "crack" },
        { time: "2023-06-15 14:21:05", id: "SL-4827", confidence: 0.87, status: "confirmed", operator: "Иванов А.С.", comment: "Небольшая поверхностная трещина", defectType: "crack" },
        { time: "2023-06-15 14:18:42", id: "SL-4824", confidence: 0.92, status: "pending", operator: "Автоматически", comment: "Требуется проверка оператором", defectType: "crack" },
        { time: "2023-06-15 14:15:33", id: "SL-4821", confidence: 0.78, status: "rejected", operator: "Петров В.И.", comment: "Ложное срабатывание, дефект не подтвержден", defectType: "scratch" },
        { time: "2023-06-15 14:12:19", id: "SL-4818", confidence: 0.95, status: "confirmed", operator: "Иванов А.С.", comment: "Критичный дефект, брак", defectType: "crack" },
        { time: "2023-06-15 14:09:05", id: "SL-4815", confidence: 0.81, status: "confirmed", operator: "Сидорова Е.П.", comment: "Незначительная пористость, допустимо", defectType: "porosity" },
        { time: "2023-06-15 14:05:47", id: "SL-4812", confidence: 0.89, status: "confirmed", operator: "Иванов А.С.", comment: "Продольная трещина средней глубины", defectType: "crack" },
        { time: "2023-06-15 14:02:31", id: "SL-4809", confidence: 0.93, status: "confirmed", operator: "Автоматически", comment: "Автоматически подтверждено ИИ", defectType: "inclusion" },
        { time: "2023-06-15 13:58:22", id: "SL-4805", confidence: 0.84, status: "rejected", operator: "Петров В.И.", comment: "Артефакт изображения, не дефект", defectType: "scratch" },
        { time: "2023-06-15 13:54:10", id: "SL-4801", confidence: 0.91, status: "confirmed", operator: "Сидорова Е.П.", comment: "Глубокая трещина, полный брак", defectType: "crack" },
        { time: "2023-06-15 13:50:33", id: "SL-4798", confidence: 0.76, status: "pending", operator: "Автоматически", comment: "Требуется дополнительная проверка", defectType: "porosity" },
        { time: "2023-06-15 13:47:21", id: "SL-4795", confidence: 0.88, status: "confirmed", operator: "Иванов А.С.", comment: "Мелкие включения, допустимый уровень", defectType: "inclusion" },
        { time: "2023-06-15 13:43:59", id: "SL-4792", confidence: 0.94, status: "confirmed", operator: "Иванов А.С.", comment: "Критичная трещина по всей длине", defectType: "crack" },
        { time: "2023-06-15 13:40:17", id: "SL-4789", confidence: 0.79, status: "rejected", operator: "Петров В.И.", comment: "Отражение света, не является дефектом", defectType: "scratch" },
        { time: "2023-06-15 13:36:44", id: "SL-4786", confidence: 0.85, status: "confirmed", operator: "Сидорова Е.П.", comment: "Поверхностная трещина, подлежит шлифовке", defectType: "crack" },
        { time: "2023-06-15 13:33:12", id: "SL-4783", confidence: 0.90, status: "confirmed", operator: "Автоматически", comment: "Автоматически подтверждено ИИ", defectType: "crack" },
        { time: "2023-06-15 13:29:38", id: "SL-4780", confidence: 0.82, status: "pending", operator: "Автоматически", comment: "Требуется проверка оператором", defectType: "porosity" },
        { time: "2023-06-15 13:26:05", id: "SL-4777", confidence: 0.91, status: "confirmed", operator: "Иванов А.С.", comment: "Серьезный дефект, немедленный брак", defectType: "crack" },
        { time: "2023-06-15 13:22:41", id: "SL-4774", confidence: 0.77, status: "rejected", operator: "Петров В.И.", comment: "Загрязнение на камере, не дефект слитка", defectType: "scratch" },
        { time: "2023-06-15 13:19:27", id: "SL-4771", confidence: 0.89, status: "confirmed", operator: "Сидорова Е.П.", comment: "Включения шлака, требует переплавки", defectType: "inclusion" }
    ];

    // Состояния
    const [journalData, setJournalData] = useState(initialJournalData);
    const [filteredData, setFilteredData] = useState(initialJournalData);
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

    // Функции для фильтрации
    const applyFilters = () => {
        let result = [...journalData];

        if (filters.defectType) {
            result = result.filter(event => event.defectType === filters.defectType);
        }

        if (filters.status) {
            result = result.filter(event => event.status === filters.status);
        }

        if (filters.operator) {
            if (filters.operator === 'ai') {
                result = result.filter(event => event.operator === 'Автоматически');
            } else if (filters.operator === 'op1') {
                result = result.filter(event => event.operator === 'Иванов А.С.');
            } else if (filters.operator === 'op2') {
                result = result.filter(event => event.operator === 'Петров В.И.');
            } else if (filters.operator === 'op3') {
                result = result.filter(event => event.operator === 'Сидорова Е.П.');
            }
        }

        if (filters.confidence) {
            if (filters.confidence === 'high') {
                result = result.filter(event => event.confidence > 0.9);
            } else if (filters.confidence === 'medium') {
                result = result.filter(event => event.confidence >= 0.75 && event.confidence <= 0.9);
            } else if (filters.confidence === 'low') {
                result = result.filter(event => event.confidence < 0.75);
            }
        }

        setFilteredData(result);
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setFilters({
            defectType: '',
            status: '',
            operator: '',
            confidence: ''
        });
        setFilteredData(journalData);
        setCurrentPage(1);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
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
            'crack': 'Трещина',
            'porosity': 'Пористость',
            'inclusion': 'Включения',
            'scratch': 'Царапина'
        }[event.defectType] || event.defectType;

        const statusText = {
            'confirmed': 'Подтверждено',
            'rejected': 'Отклонено',
            'pending': 'Ожидает'
        }[event.status] || event.status;

        alert(`Детали события:\n\nID слитка: ${event.id}\nВремя: ${event.time}\nУверенность ИИ: ${Math.round(event.confidence * 100)}%\nСтатус: ${statusText}\nОператор: ${event.operator}\nКомментарий: ${event.comment}\nТип дефекта: ${defectTypeText}`);
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
        if (status === 'confirmed') {
            return <span className="status-badge status-confirmed">Подтверждено</span>;
        } else if (status === 'rejected') {
            return <span className="status-badge status-rejected">Отклонено</span>;
        } else {
            return <span className="status-badge status-pending">Ожидает</span>;
        }
    };

    // Эффекты
    useEffect(() => {
        applyFilters();
    }, [filters]);

    return (
        <div className="container">
            {/* Шапка */}
            <div className="header">
                <div className="logo-section">
                    <div className="logo-icon">
                        <i className="fas fa-industry"></i>
                    </div>
                    <div className="logo-text">
                        <h1>Metal Inspect</h1>
                        <div className="subtitle">Система распознавания трещин в слитках • Журнал событий и отчетность</div>
                    </div>
                </div>
                
                <div className="nav-buttons">
                    <a href="/dashboard" className="nav-btn">
                        <i className="fas fa-tachometer-alt"></i> Главный экран
                    </a>
                    <a href="/journal" className="nav-btn active">
                        <i className="fas fa-history"></i> Журнал событий
                    </a>
                    <a href="/settings" className="nav-btn">
                        <i className="fas fa-sliders-h"></i> Настройки
                    </a>
                </div>
                
                <div className="user-info">
                    <div className="user-avatar">
                        <i className="fas fa-user"></i>
                    </div>
                    <div>
                        <div className="user-name">Оператор Иванов А.С.</div>
                        <div className="user-role">Смена #3 • 08:00-20:00</div>
                    </div>
                </div>
            </div>
            
            {/* Основное содержимое */}
            <div className="main-content">
                {/* Левая панель - фильтры и отчеты */}
                <div className="sidebar">
                    {/* Панель фильтров */}
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
                                    <option value="op1">Иванов А.С.</option>
                                    <option value="op2">Петров В.И.</option>
                                    <option value="op3">Сидорова Е.П.</option>
                                    <option value="ai">Автоматически (ИИ)</option>
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
                    <div className="reports-panel">
                        <div className="panel-header">
                            <h2><i className="fas fa-chart-pie"></i> Генерация отчетов</h2>
                        </div>
                        
                        <div className="reports-content">
                            <div 
                                className="report-option" 
                                onClick={() => generateReport('defectReport')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h3><i className="fas fa-exclamation-circle"></i> Отчет по браку</h3>
                                <p>Сводный отчет о выявленных дефектах с анализом по типам, сменам и причинам возникновения.</p>
                            </div>
                            
                            <div 
                                className="report-option" 
                                onClick={() => generateReport('trendReport')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h3><i className="fas fa-chart-line"></i> Динамика дефектов</h3>
                                <p>График изменения количества дефектов по сменам за выбранный период времени.</p>
                            </div>
                            
                            <div 
                                className="report-option" 
                                onClick={() => generateReport('defectReport')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h3><i className="fas fa-users"></i> Отчет по операторам</h3>
                                <p>Статистика работы операторов: количество проверенных слитков, точность подтверждения дефектов.</p>
                            </div>
                            
                            <div 
                                className="report-option" 
                                onClick={() => generateReport('defectReport')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h3><i className="fas fa-robot"></i> Эффективность ИИ</h3>
                                <p>Анализ работы нейросети: точность обнаружения, ложные срабатывания, достоверность прогнозов.</p>
                            </div>
                            
                            <button 
                                className="generate-btn"
                                onClick={() => generateReport('defectReport')}
                            >
                                <i className="fas fa-file-export"></i> Сформировать отчет
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Правая панель - журнал событий */}
                <div className="journal-panel">
                    <div className="panel-header">
                        <h2><i className="fas fa-history"></i> Журнал событий контроля</h2>
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