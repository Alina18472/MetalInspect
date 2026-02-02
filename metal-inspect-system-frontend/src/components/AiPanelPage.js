import React, { useState, useEffect } from 'react';
import '../styles/ai_panel.css';
import TopNav from "../components/TopNav";

const AiPanel = () => {
    // Состояние для метрик
    const [metrics, setMetrics] = useState({
        accuracy: 96.2,
        precision: 97.5,
        recall: 94.8,
        f1: 95.5
    });

    // Состояние для временного диапазона
    const [timeRange, setTimeRange] = useState('week');
    
    // Состояние для выбранной модели
    const [selectedModel, setSelectedModel] = useState('yolo');
    
    // Состояние для модального окна сравнения моделей
    const [compareModalOpen, setCompareModalOpen] = useState(false);
    
    // Состояние для данных ROC кривой
    const [rocPoints, setRocPoints] = useState([
        { fpr: 0.03, tpr: 0.95, x: 30, y: 25 },
        { fpr: 0.05, tpr: 0.97, x: 50, y: 50 },
        { fpr: 0.10, tpr: 0.99, x: 70, y: 85 }
    ]);

    // Данные для матрицы ошибок
    const confusionMatrix = {
        tp: 18,
        fn: 1,
        fp: 3,
        tn: 1225
    };

    // Данные для сравнения моделей
    const models = [
        { 
            id: 'yolo', 
            name: 'YOLOv8 Сегментация', 
            accuracy: 96.2, 
            precision: 97.5, 
            recall: 94.8, 
            f1: 95.5, 
            speed: 47, 
            memory: 245,
            acceleration: 'CUDA/TensorRT',
            icon: 'fas fa-bolt',
            active: true
        },
        { 
            id: 'maskrcnn', 
            name: 'Mask R-CNN', 
            accuracy: 97.1, 
            precision: 98.2, 
            recall: 96.0, 
            f1: 97.1, 
            speed: 320, 
            memory: 1200,
            acceleration: 'CUDA',
            icon: 'fas fa-crop-alt',
            active: false
        },
        { 
            id: 'unet', 
            name: 'U-Net', 
            accuracy: 95.8, 
            precision: 96.8, 
            recall: 94.9, 
            f1: 95.8, 
            speed: 85, 
            memory: 180,
            acceleration: 'OpenVINO',
            icon: 'fas fa-project-diagram',
            active: false
        },
        { 
            id: 'ensemble', 
            name: 'Ансамбль', 
            accuracy: 98.3, 
            precision: 99.1, 
            recall: 97.5, 
            f1: 98.3, 
            speed: 520, 
            memory: 1800,
            acceleration: 'CUDA',
            icon: 'fas fa-layer-group',
            active: false
        }
    ];

    // Данные для временных диапазонов
    const rangeData = {
        week: { accuracy: 96.2, precision: 97.5, recall: 94.8, f1: 95.5 },
        month: { accuracy: 95.8, precision: 97.1, recall: 94.5, f1: 95.3 },
        quarter: { accuracy: 95.0, precision: 96.5, recall: 93.8, f1: 94.6 }
    };

    // Эффект для обновления метрик при смене временного диапазона
    useEffect(() => {
        const data = rangeData[timeRange] || rangeData.week;
        setMetrics(data);
    }, [timeRange]);
    useEffect(() => {
        document.body.classList.add("ai-panel-page");
        return () => document.body.classList.remove("ai-panel-page");
      }, []);
      
    // Эффект для имитации обновления метрик в реальном времени
    useEffect(() => {
        const interval = setInterval(() => {
            // Небольшие случайные колебания (±0.1%)
            setMetrics(prev => ({
                accuracy: Math.max(95.0, Math.min(98.0, prev.accuracy + (Math.random() - 0.5) * 0.2)),
                precision: Math.max(96.0, Math.min(99.0, prev.precision + (Math.random() - 0.5) * 0.2)),
                recall: Math.max(93.0, Math.min(97.0, prev.recall + (Math.random() - 0.5) * 0.2)),
                f1: Math.max(94.0, Math.min(97.0, prev.f1 + (Math.random() - 0.5) * 0.2))
            }));
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    // Функция для переключения временного диапазона
    const handleTimeRangeChange = (range) => {
        setTimeRange(range);
    };

    // Функция для выбора модели
    const handleModelSelect = (modelId) => {
        setSelectedModel(modelId);
        
        // Обновляем метрики для выбранной модели
        const model = models.find(m => m.id === modelId);
        if (model) {
            setMetrics({
                accuracy: model.accuracy,
                precision: model.precision,
                recall: model.recall,
                f1: model.f1
            });
        }
    };

    // Функция для переключения модели
    const handleSwitchModel = () => {
        const model = models.find(m => m.id === selectedModel);
        if (model) {
            if (window.confirm(`Вы уверены, что хотите переключить активную модель на "${model.name}"?`)) {
                showNotification(`Модель переключена на ${model.name}`, 'success');
                
                // Здесь можно добавить логику реального переключения модели
                console.log('Модель переключена на:', model.id);
            }
        }
    };

    // Функция для отображения уведомлений
    const showNotification = (message, type) => {
        // Здесь можно интегрировать систему уведомлений
        alert(`${type === 'success' ? '✓' : '⚠'} ${message}`);
    };

    // Функция для вычисления процентов матрицы ошибок
    const calculateMatrixPercentages = () => {
        const total = confusionMatrix.tp + confusionMatrix.fn + confusionMatrix.fp + confusionMatrix.tn;
        const falseNegativeRate = (confusionMatrix.fn / (confusionMatrix.tp + confusionMatrix.fn) * 100).toFixed(1);
        const falsePositiveRate = (confusionMatrix.fp / (confusionMatrix.fp + confusionMatrix.tn) * 100).toFixed(2);
        
        return { falseNegativeRate, falsePositiveRate };
    };

    const { falseNegativeRate, falsePositiveRate } = calculateMatrixPercentages();

    // Рендер ROC кривой
    const renderROCCurve = () => {
        return (
            <div className="roc-diagram">
                {/* Диагональная линия (случайный классификатор) */}
                <div className="roc-diagonal"></div>
                
                {/* ROC кривая */}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <path
                        d="M0,100 L30,75 L50,50 L70,15 L100,0"
                        stroke="#4dabf7"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="5,5"
                    />
                    
                    {/* Точки на кривой */}
                    {rocPoints.map((point, index) => (
                        <g key={index}>
                            <circle
                                cx={`${point.x}%`}
                                cy={`${100 - point.y}%`}
                                r="4"
                                fill="#4dabf7"
                                stroke="#fff"
                                strokeWidth="2"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => showROCTooltip(e, point)}
                                onMouseLeave={hideROCTooltip}
                            />
                        </g>
                    ))}
                </svg>
                
                {/* Подписи осей */}
                <div className="roc-label x" style={{ left: '0%' }}>0.0</div>
                <div className="roc-label x" style={{ left: '25%' }}>0.25</div>
                <div className="roc-label x" style={{ left: '50%' }}>0.5</div>
                <div className="roc-label x" style={{ left: '75%' }}>0.75</div>
                <div className="roc-label x" style={{ left: '100%' }}>1.0</div>
                
                <div className="roc-label y" style={{ bottom: '0%' }}>0.0</div>
                <div className="roc-label y" style={{ bottom: '25%' }}>0.25</div>
                <div className="roc-label y" style={{ bottom: '50%' }}>0.5</div>
                <div className="roc-label y" style={{ bottom: '75%' }}>0.75</div>
                <div className="roc-label y" style={{ bottom: '100%' }}>1.0</div>
                
                {/* Всплывающая подсказка */}
                <div id="rocTooltip" className="roc-tooltip"></div>
            </div>
        );
    };

    // Функции для работы с ROC подсказкой
    const showROCTooltip = (e, point) => {
        const tooltip = document.getElementById('rocTooltip');
        if (tooltip) {
            tooltip.innerHTML = `FPR: ${point.fpr}<br>TPR: ${point.tpr}`;
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY - 40}px`;
            tooltip.style.display = 'block';
        }
    };

    const hideROCTooltip = () => {
        const tooltip = document.getElementById('rocTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    };

    // Рендер матрицы ошибок
    const renderConfusionMatrix = () => {
        return (
            <div className="confusion-matrix">
                <div className="matrix-cell matrix-header">Дефект есть</div>
                <div className="matrix-cell matrix-header">Дефекта нет</div>
                <div className="matrix-cell matrix-header"></div>
                
                <div className="matrix-cell matrix-header" style={{ gridColumn: 1 }}>Дефект есть</div>
                <div className="matrix-cell matrix-tp">
                    <div className="matrix-value">{confusionMatrix.tp}</div>
                    <div className="matrix-label">True Positive</div>
                </div>
                <div className="matrix-cell matrix-fn">
                    <div className="matrix-value">{confusionMatrix.fn}</div>
                    <div className="matrix-label">False Negative</div>
                </div>
                
                <div className="matrix-cell matrix-header" style={{ gridColumn: 1 }}>Дефекта нет</div>
                <div className="matrix-cell matrix-fp">
                    <div className="matrix-value">{confusionMatrix.fp}</div>
                    <div className="matrix-label">False Positive</div>
                </div>
                <div className="matrix-cell matrix-tn">
                    <div className="matrix-value">{confusionMatrix.tn.toLocaleString()}</div>
                    <div className="matrix-label">True Negative</div>
                </div>
            </div>
        );
    };

    return (
        <div className="container">
            {/* Шапка */}
            <TopNav
  subtitle="Система распознавания трещин в слитках • Журнал событий и отчетность"
  userName="Оператор Иванов А.С."
  userRole="Смена #3 • 08:00-20:00"
/>


                            
            {/* Основное содержимое */}
            <div className="main-content">
                {/* Верхняя панель с ключевыми метриками */}
                <div className="metrics-header">
                    <div className="metric-card metric-accuracy">
                        <div className="metric-icon">
                            <i className="fas fa-bullseye"></i>
                        </div>
                        <div className="metric-content">
                            <div className="metric-value">{metrics.accuracy.toFixed(1)}%</div>
                            <div className="metric-label">Точность (Accuracy)</div>
                            <div className="metric-trend trend-up">
                                <i className="fas fa-arrow-up"></i> +0.8% за неделю
                            </div>
                        </div>
                    </div>
                    
                    <div className="metric-card metric-precision">
                        <div className="metric-icon">
                            <i className="fas fa-check-double"></i>
                        </div>
                        <div className="metric-content">
                            <div className="metric-value">{metrics.precision.toFixed(1)}%</div>
                            <div className="metric-label">Точность (Precision)</div>
                            <div className="metric-trend trend-up">
                                <i className="fas fa-arrow-up"></i> +1.2% за месяц
                            </div>
                        </div>
                    </div>
                    
                    <div className="metric-card metric-recall">
                        <div className="metric-icon">
                            <i className="fas fa-search"></i>
                        </div>
                        <div className="metric-content">
                            <div className="metric-value">{metrics.recall.toFixed(1)}%</div>
                            <div className="metric-label">Полнота (Recall)</div>
                            <div className="metric-trend trend-up">
                                <i className="fas fa-arrow-up"></i> +0.5% за неделю
                            </div>
                        </div>
                    </div>
                    
                    <div className="metric-card metric-f1">
                        <div className="metric-icon">
                            <i className="fas fa-percentage"></i>
                        </div>
                        <div className="metric-content">
                            <div className="metric-value">{metrics.f1.toFixed(1)}%</div>
                            <div className="metric-label">F1-Score</div>
                            <div className="metric-trend trend-up">
                                <i className="fas fa-arrow-up"></i> +0.7% за месяц
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Основная панель мониторинга */}
                <div className="ai-monitoring-panel">
                    {/* Левая панель с графиками */}
                    <div className="charts-panel">
                        {/* График динамики метрик */}
                        <div className="monitoring-panel">
                            <div className="panel-header">
                                <h2><i className="fas fa-chart-line"></i> Динамика метрик эффективности</h2>
                                <div className="controls">
                                    <div className="time-range">
                                        <button 
                                            className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
                                            onClick={() => handleTimeRangeChange('week')}
                                        >
                                            Неделя
                                        </button>
                                        <button 
                                            className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
                                            onClick={() => handleTimeRangeChange('month')}
                                        >
                                            Месяц
                                        </button>
                                        <button 
                                            className={`time-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                                            onClick={() => handleTimeRangeChange('quarter')}
                                        >
                                            Квартал
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="panel-content">
                                <div className="chart-container">
                                    <div className="chart-placeholder">
                                        <i className="fas fa-chart-line"></i>
                                        <div className="chart-title">
                                            Динамика метрик за последнюю {timeRange === 'week' ? 'неделю' : timeRange === 'month' ? 'месяц' : 'квартал'}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '10px', textAlign: 'center' }}>
                                            График показывает изменение точности, полноты и F1-Score модели<br />
                                            в реальном времени по мере обработки новых данных
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="chart-legend">
                                    <div className="legend-item">
                                        <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                                        <span>Точность (Accuracy)</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                                        <span>Precision</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-color" style={{ backgroundColor: '#ff9800' }}></div>
                                        <span>Recall</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-color" style={{ backgroundColor: '#9C27B0' }}></div>
                                        <span>F1-Score</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Матрица ошибок */}
                        <div className="monitoring-panel">
                            <div className="panel-header">
                                <h2><i className="fas fa-th"></i> Матрица ошибок (Confusion Matrix)</h2>
                                <div className="controls">
                                    <span style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>Всего проверок: 1,247</span>
                                </div>
                            </div>
                            <div className="panel-content">
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#8fb4d9', marginBottom: '5px' }}>
                                            Предсказано моделью
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{ width: '120px', textAlign: 'right', paddingRight: '15px', fontSize: '0.9rem', color: '#8fb4d9' }}>
                                                Дефект есть
                                            </div>
                                            <div style={{ width: '120px', textAlign: 'center', fontSize: '0.9rem', color: '#8fb4d9' }}>
                                                Дефекта нет
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {renderConfusionMatrix()}
                                
                                <div style={{ marginTop: '25px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                                    <div style={{ backgroundColor: 'rgba(30, 45, 65, 0.6)', padding: '15px', borderRadius: '8px' }}>
                                        <div style={{ color: '#b0c4de', fontSize: '0.9rem', marginBottom: '5px' }}>
                                            False Negative Rate
                                        </div>
                                        <div style={{ color: '#f44336', fontSize: '1.5rem', fontWeight: '600' }}>
                                            {falseNegativeRate}%
                                        </div>
                                        <div style={{ color: '#8fb4d9', fontSize: '0.85rem', marginTop: '5px' }}>
                                            Пропущенные дефекты
                                        </div>
                                    </div>
                                    
                                    <div style={{ backgroundColor: 'rgba(30, 45, 65, 0.6)', padding: '15px', borderRadius: '8px' }}>
                                        <div style={{ color: '#b0c4de', fontSize: '0.9rem', marginBottom: '5px' }}>
                                            False Positive Rate
                                        </div>
                                        <div style={{ color: '#ff9800', fontSize: '1.5rem', fontWeight: '600' }}>
                                            {falsePositiveRate}%
                                        </div>
                                        <div style={{ color: '#8fb4d9', fontSize: '0.85rem', marginTop: '5px' }}>
                                            Ложные срабатывания
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Правая панель с анализом */}
                    <div className="analysis-panel">
                        {/* Сравнение моделей */}
                        <div className="monitoring-panel">
                            <div className="panel-header">
                                <h2><i className="fas fa-balance-scale"></i> Сравнение моделей</h2>
                            </div>
                            <div className="panel-content">
                                <div className="models-list">
                                    {models.map(model => (
                                        <div 
                                            key={model.id}
                                            className={`model-comparison ${selectedModel === model.id ? 'active' : ''}`}
                                            onClick={() => handleModelSelect(model.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="model-icon">
                                                <i className={model.icon}></i>
                                            </div>
                                            <div className="model-info">
                                                <div className="model-name">{model.name}</div>
                                                <div className="model-stats">
                                                    <div className="model-stat">
                                                        Точность: <span className="model-stat-value">{model.accuracy}%</span>
                                                    </div>
                                                    <div className="model-stat">
                                                        Время: <span className="model-stat-value">{model.speed} мс</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedModel === model.id && (
                                                <div style={{ color: '#4CAF50', fontWeight: '600' }}>Активна</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="action-buttons">
                                    <button 
                                        className="action-btn secondary"
                                        onClick={() => setCompareModalOpen(true)}
                                    >
                                        <i className="fas fa-chart-bar"></i> Детальное сравнение
                                    </button>
                                    <button 
                                        className="action-btn primary"
                                        onClick={handleSwitchModel}
                                    >
                                        <i className="fas fa-sync-alt"></i> Переключить модель
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Анализ ложных срабатываний */}
                        <div className="monitoring-panel">
                            <div className="panel-header">
                                <h2><i className="fas fa-exclamation-triangle"></i> Анализ ошибок</h2>
                            </div>
                            <div className="panel-content">
                                <div className="false-detections">
                                    <div className="false-item false-fn">
                                        <div className="false-header">
                                            <div className="false-title">False Negatives (пропущенные дефекты)</div>
                                            <div className="false-count">1 случай</div>
                                        </div>
                                        <div className="false-description">
                                            Модель пропустила мелкую поверхностную трещину при слабом освещении. 
                                            Рекомендуется увеличить чувствительность или улучшить освещение.
                                        </div>
                                    </div>
                                    
                                    <div className="false-item false-fp">
                                        <div className="false-header">
                                            <div className="false-title">False Positives (ложные срабатывания)</div>
                                            <div className="false-count">3 случая</div>
                                        </div>
                                        <div className="false-description">
                                            2 случая - царапины на поверхности были приняты за трещины.
                                            1 случай - артефакт освещения был классифицирован как дефект.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="metric-bars" style={{ marginTop: '25px' }}>
                                    <div className="metric-bar">
                                        <div className="bar-header">
                                            <div className="bar-label">
                                                <i className="fas fa-bullseye" style={{ color: '#2196F3' }}></i>
                                                <span>Точность (Accuracy)</span>
                                            </div>
                                            <div className="bar-value">{metrics.accuracy.toFixed(1)}%</div>
                                        </div>
                                        <div className="bar-container">
                                            <div 
                                                className="bar-fill bar-accuracy" 
                                                style={{ width: `${metrics.accuracy}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div className="metric-bar">
                                        <div className="bar-header">
                                            <div className="bar-label">
                                                <i className="fas fa-check-double" style={{ color: '#4CAF50' }}></i>
                                                <span>Precision</span>
                                            </div>
                                            <div className="bar-value">{metrics.precision.toFixed(1)}%</div>
                                        </div>
                                        <div className="bar-container">
                                            <div 
                                                className="bar-fill bar-precision" 
                                                style={{ width: `${metrics.precision}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div className="metric-bar">
                                        <div className="bar-header">
                                            <div className="bar-label">
                                                <i className="fas fa-search" style={{ color: '#ff9800' }}></i>
                                                <span>Recall</span>
                                            </div>
                                            <div className="bar-value">{metrics.recall.toFixed(1)}%</div>
                                        </div>
                                        <div className="bar-container">
                                            <div 
                                                className="bar-fill bar-recall" 
                                                style={{ width: `${metrics.recall}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div className="metric-bar">
                                        <div className="bar-header">
                                            <div className="bar-label">
                                                <i className="fas fa-percentage" style={{ color: '#9C27B0' }}></i>
                                                <span>F1-Score</span>
                                            </div>
                                            <div className="bar-value">{metrics.f1.toFixed(1)}%</div>
                                        </div>
                                        <div className="bar-container">
                                            <div 
                                                className="bar-fill bar-f1" 
                                                style={{ width: `${metrics.f1}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* ROC кривая */}
                        <div className="monitoring-panel">
                            <div className="panel-header">
                                <h2><i className="fas fa-chart-area"></i> ROC кривая</h2>
                                <div className="controls">
                                    <span style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>AUC: 0.982</span>
                                </div>
                            </div>
                            <div className="panel-content">
                                <div className="roc-container">
                                    {renderROCCurve()}
                                </div>
                                
                                <div style={{ marginTop: '15px', color: '#8fb4d9', fontSize: '0.9rem', textAlign: 'center' }}>
                                    ROC кривая показывает качество бинарного классификатора.<br />
                                    AUC = 0.982 указывает на отличное качество модели.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
     

        {compareModalOpen && (
            <div className="modal-overlay" onClick={() => setCompareModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3><i className="fas fa-balance-scale"></i> Детальное сравнение моделей</h3>
                        <button 
                            className="close-modal"
                            onClick={() => setCompareModalOpen(false)}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="modal-body">
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'rgba(25, 40, 60, 0.8)' }}>
                                        <th style={{ padding: '15px', textAlign: 'left', color: '#b0c4de' }}>Метрика</th>
                                        {models.map(model => (
                                            <th key={model.id} style={{ padding: '15px', textAlign: 'center', color: '#b0c4de' }}>
                                                {model.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid rgba(60, 120, 180, 0.1)' }}>
                                        <td style={{ padding: '15px', color: '#e0e0e0', fontWeight: '500' }}>Точность (Accuracy)</td>
                                        {models.map(model => (
                                            <td 
                                                key={model.id} 
                                                style={{ 
                                                    padding: '15px', 
                                                    textAlign: 'center', 
                                                    color: selectedModel === model.id ? '#4dabf7' : '#8fb4d9',
                                                    fontWeight: selectedModel === model.id ? '600' : 'normal'
                                                }}
                                            >
                                                {model.accuracy}%
                                            </td>
                                        ))}
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(60, 120, 180, 0.1)' }}>
                                        <td style={{ padding: '15px', color: '#e0e0e0', fontWeight: '500' }}>Precision</td>
                                        {models.map(model => (
                                            <td 
                                                key={model.id} 
                                                style={{ 
                                                    padding: '15px', 
                                                    textAlign: 'center', 
                                                    color: selectedModel === model.id ? '#4dabf7' : '#8fb4d9',
                                                    fontWeight: selectedModel === model.id ? '600' : 'normal'
                                                }}
                                            >
                                                {model.precision}%
                                            </td>
                                        ))}
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(60, 120, 180, 0.1)' }}>
                                        <td style={{ padding: '15px', color: '#e0e0e0', fontWeight: '500' }}>Recall</td>
                                        {models.map(model => (
                                            <td 
                                                key={model.id} 
                                                style={{ 
                                                    padding: '15px', 
                                                    textAlign: 'center', 
                                                    color: selectedModel === model.id ? '#4dabf7' : '#8fb4d9',
                                                    fontWeight: selectedModel === model.id ? '600' : 'normal'
                                                }}
                                            >
                                                {model.recall}%
                                            </td>
                                        ))}
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(60, 120, 180, 0.1)' }}>
                                        <td style={{ padding: '15px', color: '#e0e0e0', fontWeight: '500' }}>F1-Score</td>
                                        {models.map(model => (
                                            <td 
                                                key={model.id} 
                                                style={{ 
                                                    padding: '15px', 
                                                    textAlign: 'center', 
                                                    color: selectedModel === model.id ? '#4dabf7' : '#8fb4d9',
                                                    fontWeight: selectedModel === model.id ? '600' : 'normal'
                                                }}
                                            >
                                                {model.f1}%
                                            </td>
                                        ))}
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(60, 120, 180, 0.1)' }}>
                                        <td style={{ padding: '15px', color: '#e0e0e0', fontWeight: '500' }}>Время обработки (мс)</td>
                                        {models.map(model => (
                                            <td 
                                                key={model.id} 
                                                style={{ 
                                                    padding: '15px', 
                                                    textAlign: 'center', 
                                                    color: selectedModel === model.id ? '#4dabf7' : '#8fb4d9',
                                                    fontWeight: selectedModel === model.id ? '600' : 'normal'
                                                }}
                                            >
                                                {model.speed}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(60, 120, 180, 0.1)' }}>
                                        <td style={{ padding: '15px', color: '#e0e0e0', fontWeight: '500' }}>Использование памяти</td>
                                        {models.map(model => (
                                            <td 
                                                key={model.id} 
                                                style={{ 
                                                    padding: '15px', 
                                                    textAlign: 'center', 
                                                    color: selectedModel === model.id ? '#4dabf7' : '#8fb4d9',
                                                    fontWeight: selectedModel === model.id ? '600' : 'normal'
                                                }}
                                            >
                                                {model.memory < 1000 ? `${model.memory} МБ` : `${(model.memory / 1000).toFixed(1)} ГБ`}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '15px', color: '#e0e0e0', fontWeight: '500' }}>Аппаратное ускорение</td>
                                        {models.map(model => (
                                            <td 
                                                key={model.id} 
                                                style={{ 
                                                    padding: '15px', 
                                                    textAlign: 'center', 
                                                    color: selectedModel === model.id ? '#4dabf7' : '#8fb4d9',
                                                    fontWeight: selectedModel === model.id ? '600' : 'normal'
                                                }}
                                            >
                                                {model.acceleration}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div style={{ marginTop: '25px', padding: '20px', backgroundColor: 'rgba(30, 45, 65, 0.6)', borderRadius: '8px' }}>
                            <h4 style={{ color: '#e0e0e0', marginBottom: '10px' }}>Рекомендации по выбору модели:</h4>
                            <ul style={{ color: '#b0c4de', paddingLeft: '20px' }}>
                                <li><strong>YOLOv8</strong> - оптимальный баланс скорости и точности для real-time обработки</li>
                                <li><strong>Mask R-CNN</strong> - максимальная точность, но требует больше ресурсов</li>
                                <li><strong>U-Net</strong> - хорошая альтернатива для edge-устройств с ограниченными ресурсами</li>
                                <li><strong>Ансамбль</strong> - максимальная надежность для критически важных применений</li>
                            </ul>
                        </div>
                    </div>
                    <div style={{ padding: '20px', borderTop: '1px solid rgba(60, 120, 180, 0.2)', textAlign: 'center' }}>
                        <button 
                            className="action-btn primary"
                            onClick={() => setCompareModalOpen(false)}
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

export default AiPanel;