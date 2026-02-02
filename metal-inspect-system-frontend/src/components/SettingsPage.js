import React, { useState, useEffect } from 'react';
import TopNav from "../components/TopNav";
import "../styles/settings.css";
const Settings = () => {
    // Состояние для активного раздела
    const [activeSection, setActiveSection] = useState('camera');
    
    // Состояния для настроек камеры
    const [cameraSettings, setCameraSettings] = useState({
        brightness: 65,
        contrast: 70,
        exposure: 50,
        sharpness: 60,
        whiteBalance: '5000',
        resolution: '1080p',
        filters: {
            noise: true,
            gaussian: true,
            edge: true,
            contrast: false
        }
    });
    
    // Состояния для калибровки
    const [calibrationSettings, setCalibrationSettings] = useState({
        scaleFactor: 0.15,
        lensDistortion: 0.02,
        calibrationTarget: 'circleGrid',
        calibrationMode: 'semiauto',
        lastCalibration: '15.06.2023 14:30',
        calibrationStatus: 'warning'
    });
    
    // Состояния для нейросети
    const [aiSettings, setAiSettings] = useState({
        selectedModel: 'yolo',
        hardwareAcceleration: 'cuda',
        batchSize: 4,
        quantization: 'fp16',
        memoryLimit: 4096
    });
    
    // Состояние для модального окна тестирования
    const [testModalOpen, setTestModalOpen] = useState(false);
    
    // Состояние для уведомлений
    const [notification, setNotification] = useState(null);
    
    // Данные о моделях нейросети
    const models = [
        {
            id: 'yolo',
            name: 'YOLOv8 Сегментация',
            description: 'Real-time обнаружение и сегментация трещин',
            accuracy: 96.2,
            speed: 47,
            size: 245,
            active: true
        },
        {
            id: 'maskrcnn',
            name: 'Mask R-CNN',
            description: 'Точная сегментация с инстанс масками',
            accuracy: 97.1,
            speed: 320,
            size: 1200,
            active: false
        },
        {
            id: 'unet',
            name: 'U-Net',
            description: 'Семантическая сегментация трещин',
            accuracy: 95.8,
            speed: 85,
            size: 180,
            active: false
        },
        {
            id: 'ensemble',
            name: 'Ансамбль моделей',
            description: 'Комбинация YOLO и U-Net для повышения точности',
            accuracy: 98.3,
            speed: 520,
            size: 1800,
            active: false
        }
    ];

    // Данные для разделов настроек
    const sections = [
        {
            id: 'camera',
            title: 'Настройки камеры',
            description: 'Настройка параметров промышленной камеры для оптимального качества изображения.',
            icon: 'fas fa-video'
        },
        {
            id: 'calibration',
            title: 'Калибровка системы',
            description: 'Геометрическая и фотометрическая калибровка для точного обнаружения дефектов.',
            icon: 'fas fa-ruler-combined'
        },
        {
            id: 'ai-models',
            title: 'Настройки нейросетевых моделей',
            description: 'Выбор и настройка моделей глубокого обучения для обнаружения трещин.',
            icon: 'fas fa-robot'
        }
    ];

    // Функция отображения уведомлений
    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Функция сохранения настроек камеры
    const saveCameraSettings = () => {
        console.log('Сохранены настройки камеры:', cameraSettings);
        showNotification('Настройки камеры успешно сохранены', 'success');
    };

    // Функция сброса настроек камеры
    const resetCameraSettings = () => {
        if (window.confirm('Вы уверены, что хотите сбросить настройки камеры к значениям по умолчанию?')) {
            setCameraSettings({
                brightness: 50,
                contrast: 50,
                exposure: 50,
                sharpness: 50,
                whiteBalance: 'auto',
                resolution: '1080p',
                filters: {
                    noise: true,
                    gaussian: true,
                    edge: true,
                    contrast: false
                }
            });
            showNotification('Настройки камеры сброшены', 'info');
        }
    };

    // Функция изменения слайдера камеры
    const handleCameraSliderChange = (setting, value) => {
        setCameraSettings(prev => ({
            ...prev,
            [setting]: parseInt(value)
        }));
    };

    // Функция изменения фильтров камеры
    const handleFilterChange = (filter, checked) => {
        setCameraSettings(prev => ({
            ...prev,
            filters: {
                ...prev.filters,
                [filter]: checked
            }
        }));
    };

    // Функция изменения настроек калибровки
    const handleCalibrationChange = (setting, value) => {
        setCalibrationSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    // Функция запуска калибровки
    const startCalibration = () => {
        showNotification('Запущена процедура калибровки...', 'info');
        
        setTimeout(() => {
            setCalibrationSettings(prev => ({
                ...prev,
                calibrationStatus: 'active'
            }));
            showNotification('Калибровка успешно завершена', 'success');
        }, 2000);
    };

    // Функция автоматической калибровки
    const autoCalibrate = () => {
        showNotification('Запущена автоматическая калибровка...', 'info');
        
        setTimeout(() => {
            setCalibrationSettings(prev => ({
                ...prev,
                calibrationStatus: 'active'
            }));
            showNotification('Автоматическая калибровка успешно завершена', 'success');
        }, 3000);
    };

    // Функция выбора модели нейросети
    const selectModel = (modelId) => {
        setAiSettings(prev => ({
            ...prev,
            selectedModel: modelId
        }));
    };

    // Функция изменения настроек нейросети
    const handleAiSettingChange = (setting, value) => {
        setAiSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    // Функция тестирования модели
    const testModel = () => {
        setTestModalOpen(true);
    };

    // Функция обновления модели
    const updateModel = () => {
        showNotification('Запущено обновление модели нейросети...', 'info');
        
        setTimeout(() => {
            showNotification('Модель нейросети успешно обновлена', 'success');
        }, 1500);
    };

    // Получение активного раздела
    const getActiveSectionData = () => {
        return sections.find(section => section.id === activeSection) || sections[0];
    };

    // Получение статуса калибровки
    const getCalibrationStatus = () => {
        const status = calibrationSettings.calibrationStatus;
        const statusText = {
            'active': { text: 'Калибровка завершена', color: 'status-active' },
            'warning': { text: 'Требуется калибровка', color: 'status-warning' },
            'error': { text: 'Ошибка калибровки', color: 'status-error' }
        }[status] || { text: 'Неизвестный статус', color: 'status-warning' };
        
        return statusText;
    };

    // Получение выбранной модели
    const getSelectedModel = () => {
        return models.find(model => model.id === aiSettings.selectedModel) || models[0];
    };

    // Эффект для установки заголовка страницы
    useEffect(() => {
        const activeSectionData = getActiveSectionData();
        document.title = `Metal Inspect - ${activeSectionData.title}`;
    }, [activeSection]);
    return (
        <div className="settings-page">
            <div className="settings-container">
                {/* Уведомление */}
                {notification && (
                    <div className={`settings-notification ${notification.type}`}>
                        {notification.message}
                    </div>
                )}
    
                {/* Шапка */}
                <TopNav
                    subtitle="Система распознавания трещин в слитках • Журнал событий и отчетность"
                    userName="Оператор Иванов А.С."
                    userRole="Смена #3 • 08:00-20:00"
                />
    
                {/* Основное содержимое */}
                <div className="settings-main-content">
                    {/* Боковая панель навигации */}
                    <div className="settings-sidebar">
                        <div className="settings-sidebar-header">
                            <i className="fas fa-cogs"></i>
                            <h2>Настройки</h2>
                        </div>
                        
                        <div className="settings-nav">
                            <div className="settings-nav-section">
                                <div className="settings-nav-section-title">Оборудование</div>
                                <a 
                                    href="#" 
                                    className={`settings-nav-item ${activeSection === 'camera' ? 'active' : ''}`}
                                    onClick={(e) => { e.preventDefault(); setActiveSection('camera'); }}
                                >
                                    <i className="fas fa-video"></i>
                                    <span>Настройки камеры</span>
                                </a>
                                <a 
                                    href="#" 
                                    className={`settings-nav-item ${activeSection === 'calibration' ? 'active' : ''}`}
                                    onClick={(e) => { e.preventDefault(); setActiveSection('calibration'); }}
                                >
                                    <i className="fas fa-ruler-combined"></i>
                                    <span>Калибровка</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('lighting'); }}
                                >
                                    <i className="fas fa-lightbulb"></i>
                                    <span>Освещение</span>
                                </a>
                            </div>
                            
                            <div className="settings-nav-section">
                                <div className="settings-nav-section-title">ИИ-модели</div>
                                <a 
                                    href="#" 
                                    className={`settings-nav-item ${activeSection === 'ai-models' ? 'active' : ''}`}
                                    onClick={(e) => { e.preventDefault(); setActiveSection('ai-models'); }}
                                >
                                    <i className="fas fa-robot"></i>
                                    <span>Настройки нейросети</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('thresholds'); }}
                                >
                                    <i className="fas fa-chart-line"></i>
                                    <span>Пороги уверенности</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('performance'); }}
                                >
                                    <i className="fas fa-tachometer-alt"></i>
                                    <span>Производительность</span>
                                </a>
                            </div>
                            
                            <div className="settings-nav-section">
                                <div className="settings-nav-section-title">Интеграция</div>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('mes-integration'); }}
                                >
                                    <i className="fas fa-exchange-alt"></i>
                                    <span>Интеграция с MES</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('api'); }}
                                >
                                    <i className="fas fa-code"></i>
                                    <span>API и вебхуки</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('export'); }}
                                >
                                    <i className="fas fa-file-export"></i>
                                    <span>Экспорт данных</span>
                                </a>
                            </div>
                            
                            <div className="settings-nav-section">
                                <div className="settings-nav-section-title">Система</div>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('users'); }}
                                >
                                    <i className="fas fa-users"></i>
                                    <span>Пользователи и роли</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('notifications'); }}
                                >
                                    <i className="fas fa-bell"></i>
                                    <span>Уведомления</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('system'); }}
                                >
                                    <i className="fas fa-server"></i>
                                    <span>Системная информация</span>
                                </a>
                                <a 
                                    href="#" 
                                    className="settings-nav-item"
                                    onClick={(e) => { e.preventDefault(); setActiveSection('backup'); }}
                                >
                                    <i className="fas fa-database"></i>
                                    <span>Резервное копирование</span>
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    {/* Основная панель настроек */}
                    <div className="settings-main-panel">
                        {/* Заголовок раздела */}
                        <div className="settings-header">
                            <div className="settings-header-content">
                                <h2>
                                    <i className={getActiveSectionData().icon}></i>
                                    {getActiveSectionData().title}
                                </h2>
                                <div className="settings-description">
                                    {getActiveSectionData().description}
                                </div>
                            </div>
                        </div>
                        
                        {/* Контент настроек */}
                        <div className="settings-content">
                            {/* Панель настроек камеры */}
                            {activeSection === 'camera' && (
                                <div className="settings-panel">
                                    <div className="settings-panel-header">
                                        <h3>
                                            <i className="fas fa-video"></i>
                                            Параметры камеры #4
                                        </h3>
                                        <div className="settings-status-indicator">
                                            <span className="settings-status-dot settings-status-active"></span>
                                            <span>Камера активна</span>
                                        </div>
                                    </div>
                                    
                                    <div className="settings-panel-content">
                                        <div className="settings-grid">
                                            <div className="settings-row">
                                                <label className="settings-label">
                                                    <i className="fas fa-sun"></i>
                                                    <span>Яркость</span>
                                                </label>
                                                <div className="settings-slider-container">
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={cameraSettings.brightness}
                                                        className="settings-slider"
                                                        onChange={(e) => handleCameraSliderChange('brightness', e.target.value)}
                                                    />
                                                    <div className="settings-slider-value">{cameraSettings.brightness}%</div>
                                                </div>
                                                <div className="settings-hint">Регулировка общей яркости изображения</div>
                                            </div>
                                            
                                            <div className="settings-row">
                                                <label className="settings-label">
                                                    <i className="fas fa-adjust"></i>
                                                    <span>Контрастность</span>
                                                </label>
                                                <div className="settings-slider-container">
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={cameraSettings.contrast}
                                                        className="settings-slider"
                                                        onChange={(e) => handleCameraSliderChange('contrast', e.target.value)}
                                                    />
                                                    <div className="settings-slider-value">{cameraSettings.contrast}%</div>
                                                </div>
                                                <div className="settings-hint">Разница между светлыми и темными участками</div>
                                            </div>
                                            
                                            <div className="settings-row">
                                                <label className="settings-label">
                                                    <i className="fas fa-camera"></i>
                                                    <span>Экспозиция</span>
                                                </label>
                                                <div className="settings-slider-container">
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={cameraSettings.exposure}
                                                        className="settings-slider"
                                                        onChange={(e) => handleCameraSliderChange('exposure', e.target.value)}
                                                    />
                                                    <div className="settings-slider-value">{cameraSettings.exposure}%</div>
                                                </div>
                                                <div className="settings-hint">Количество света, попадающего на матрицу</div>
                                            </div>
                                            
                                            <div className="settings-row">
                                                <label className="settings-label">
                                                    <i className="fas fa-search"></i>
                                                    <span>Резкость</span>
                                                </label>
                                                <div className="settings-slider-container">
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={cameraSettings.sharpness}
                                                        className="settings-slider"
                                                        onChange={(e) => handleCameraSliderChange('sharpness', e.target.value)}
                                                    />
                                                    <div className="settings-slider-value">{cameraSettings.sharpness}%</div>
                                                </div>
                                                <div className="settings-hint">Четкость границ и деталей на изображении</div>
                                            </div>
                                            
                                            <div className="settings-row">
                                                <label className="settings-label">
                                                    <i className="fas fa-palette"></i>
                                                    <span>Баланс белого</span>
                                                </label>
                                                <select 
                                                    className="settings-select" 
                                                    value={cameraSettings.whiteBalance}
                                                    onChange={(e) => handleCameraSliderChange('whiteBalance', e.target.value)}
                                                >
                                                    <option value="auto">Автоматически</option>
                                                    <option value="3000">3000K (лампа накаливания)</option>
                                                    <option value="4000">4000K (флуоресцентная)</option>
                                                    <option value="5000">5000K (дневной свет)</option>
                                                    <option value="6000">6000K (облачное небо)</option>
                                                    <option value="7000">7000K (тень)</option>
                                                </select>
                                                <div className="settings-hint">Цветовая температура освещения</div>
                                            </div>
                                            
                                            <div className="settings-row">
                                                <label className="settings-label">
                                                    <i className="fas fa-expand-alt"></i>
                                                    <span>Разрешение</span>
                                                </label>
                                                <select 
                                                    className="settings-select" 
                                                    value={cameraSettings.resolution}
                                                    onChange={(e) => handleCameraSliderChange('resolution', e.target.value)}
                                                >
                                                    <option value="1080p">1920x1080 (Full HD)</option>
                                                    <option value="1440p">2560x1440 (2K)</option>
                                                    <option value="4k">3840x2160 (4K)</option>
                                                </select>
                                                <div className="settings-hint">Разрешение видеопотока</div>
                                            </div>
                                            
                                            <div className="settings-row settings-row-full-width">
                                                <label className="settings-label">
                                                    <i className="fas fa-filter"></i>
                                                    <span>Фильтры изображения</span>
                                                </label>
                                                <div className="settings-checkbox-group">
                                                    <div className="settings-checkbox-item">
                                                        <input 
                                                            type="checkbox" 
                                                            id="filterNoise" 
                                                            checked={cameraSettings.filters.noise}
                                                            onChange={(e) => handleFilterChange('noise', e.target.checked)}
                                                        />
                                                        <label htmlFor="filterNoise" className="settings-checkbox-label">
                                                            Подавление шума
                                                        </label>
                                                    </div>
                                                    <div className="settings-checkbox-item">
                                                        <input 
                                                            type="checkbox" 
                                                            id="filterGaussian" 
                                                            checked={cameraSettings.filters.gaussian}
                                                            onChange={(e) => handleFilterChange('gaussian', e.target.checked)}
                                                        />
                                                        <label htmlFor="filterGaussian" className="settings-checkbox-label">
                                                            Гауссово размытие
                                                        </label>
                                                    </div>
                                                    <div className="settings-checkbox-item">
                                                        <input 
                                                            type="checkbox" 
                                                            id="filterEdge" 
                                                            checked={cameraSettings.filters.edge}
                                                            onChange={(e) => handleFilterChange('edge', e.target.checked)}
                                                        />
                                                        <label htmlFor="filterEdge" className="settings-checkbox-label">
                                                            Выделение границ
                                                        </label>
                                                    </div>
                                                    <div className="settings-checkbox-item">
                                                        <input 
                                                            type="checkbox" 
                                                            id="filterContrast" 
                                                            checked={cameraSettings.filters.contrast}
                                                            onChange={(e) => handleFilterChange('contrast', e.target.checked)}
                                                        />
                                                        <label htmlFor="filterContrast" className="settings-checkbox-label">
                                                            Автоконтраст
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="settings-hint">Цифровая обработка изображения перед анализом</div>
                                            </div>
                                        </div>
                                        
                                        <div className="settings-buttons">
                                            <button 
                                                className="settings-btn settings-btn-secondary"
                                                onClick={resetCameraSettings}
                                            >
                                                <i className="fas fa-redo"></i>
                                                <span>Сбросить настройки</span>
                                            </button>
                                            <button 
                                                className="settings-btn settings-btn-primary"
                                                onClick={saveCameraSettings}
                                            >
                                                <i className="fas fa-save"></i>
                                                <span>Сохранить настройки</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Панель калибровки */}
                            {activeSection === 'calibration' && (
                                <div className="settings-panel">
                                    <div className="settings-panel-header">
                                        <h3>
                                            <i className="fas fa-ruler-combined"></i>
                                            Калибровка системы
                                        </h3>
                                        <div className="settings-status-indicator">
                                            <span className={`settings-status-dot ${getCalibrationStatus().color}`}></span>
                                            <span>{getCalibrationStatus().text}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="settings-panel-content">
                                        <div className="settings-calibration-container">
                                            <div className="settings-calibration-preview">
                                                <div className="settings-calibration-target">
                                                    <div className="settings-target-circle"></div>
                                                </div>
                                            </div>
                                            
                                            <div className="settings-calibration-controls">
                                                <div className="settings-group">
                                                    <div className="settings-group-title">
                                                        <i className="fas fa-crosshairs"></i>
                                                        <span>Геометрическая калибровка</span>
                                                    </div>
                                                    
                                                    <div className="settings-calibration-grid">
                                                        <div className="settings-row">
                                                            <label className="settings-label">
                                                                <i className="fas fa-ruler-horizontal"></i>
                                                                <span>Масштаб (мм/пиксель)</span>
                                                            </label>
                                                            <input 
                                                                type="number" 
                                                                className="settings-input" 
                                                                value={calibrationSettings.scaleFactor}
                                                                step="0.01"
                                                                onChange={(e) => handleCalibrationChange('scaleFactor', parseFloat(e.target.value))}
                                                            />
                                                            <div className="settings-hint">Коэффициент преобразования пикселей в миллиметры</div>
                                                        </div>
                                                        
                                                        <div className="settings-row">
                                                            <label className="settings-label">
                                                                <i className="fas fa-expand-arrows-alt"></i>
                                                                <span>Искажение объектива</span>
                                                            </label>
                                                            <input 
                                                                type="number" 
                                                                className="settings-input" 
                                                                value={calibrationSettings.lensDistortion}
                                                                step="0.01"
                                                                onChange={(e) => handleCalibrationChange('lensDistortion', parseFloat(e.target.value))}
                                                            />
                                                            <div className="settings-hint">Коэффициент коррекции дисторсии</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="settings-row settings-row-full-width">
                                                        <label className="settings-label">
                                                            <i className="fas fa-bullseye"></i>
                                                            <span>Калибровочная мишень</span>
                                                        </label>
                                                        <select 
                                                            className="settings-select" 
                                                            value={calibrationSettings.calibrationTarget}
                                                            onChange={(e) => handleCalibrationChange('calibrationTarget', e.target.value)}
                                                        >
                                                            <option value="checkerboard">Шахматная доска 10x7</option>
                                                            <option value="circleGrid">Круговая мишень 15x10</option>
                                                            <option value="charuco">Мишень Charuco</option>
                                                        </select>
                                                        <div className="settings-hint">Тип калибровочной мишени</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="settings-group">
                                                    <div className="settings-group-title">
                                                        <i className="fas fa-tachometer-alt"></i>
                                                        <span>Автоматическая калибровка</span>
                                                    </div>
                                                    
                                                    <div className="settings-row settings-row-full-width">
                                                        <label className="settings-label">
                                                            <i className="fas fa-robot"></i>
                                                            <span>Режим калибровки</span>
                                                        </label>
                                                        <select 
                                                            className="settings-select" 
                                                            value={calibrationSettings.calibrationMode}
                                                            onChange={(e) => handleCalibrationChange('calibrationMode', e.target.value)}
                                                        >
                                                            <option value="manual">Ручная калибровка</option>
                                                            <option value="semiauto">Полуавтоматическая</option>
                                                            <option value="auto">Автоматическая</option>
                                                        </select>
                                                        <div className="settings-hint">Способ проведения калибровки</div>
                                                    </div>
                                                    
                                                    <div className="settings-buttons" style={{ marginTop: '15px', borderTop: 'none', paddingTop: 0 }}>
                                                        <button 
                                                            className="settings-btn settings-btn-secondary"
                                                            onClick={startCalibration}
                                                        >
                                                            <i className="fas fa-play-circle"></i>
                                                            <span>Начать калибровку</span>
                                                        </button>
                                                        <button 
                                                            className="settings-btn settings-btn-primary"
                                                            onClick={autoCalibrate}
                                                        >
                                                            <i className="fas fa-robot"></i>
                                                            <span>Автоматическая калибровка</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="settings-group">
                                                    <div className="settings-group-title">
                                                        <i className="fas fa-history"></i>
                                                        <span>История калибровок</span>
                                                    </div>
                                                    
                                                    <div className="settings-row settings-row-full-width">
                                                        <div style={{ backgroundColor: 'rgba(30, 45, 65, 0.6)', borderRadius: '8px', padding: '15px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                                <div style={{ color: '#e0e0e0', fontWeight: '500' }}>Последняя калибровка</div>
                                                                <div style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>
                                                                    {calibrationSettings.lastCalibration}
                                                                </div>
                                                            </div>
                                                            <div style={{ color: '#b0c4de', fontSize: '0.95rem' }}>
                                                                Точность: 98.7% • Смещение: 0.2 пикселя • Время: 2 мин 15 сек
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Панель настроек нейросети */}
                            {activeSection === 'ai-models' && (
                                <div className="settings-panel">
                                    <div className="settings-panel-header">
                                        <h3>
                                            <i className="fas fa-robot"></i>
                                            Настройки нейросетевых моделей
                                        </h3>
                                        <div className="settings-status-indicator">
                                            <span className="settings-status-dot settings-status-active"></span>
                                            <span>Модель активна</span>
                                        </div>
                                    </div>
                                    
                                    <div className="settings-panel-content">
                                        <div className="settings-group">
                                            <div className="settings-group-title">
                                                <i className="fas fa-project-diagram"></i>
                                                <span>Выбор модели</span>
                                            </div>
                                            
                                            <div className="settings-grid">
                                                {models.map(model => (
                                                    <div 
                                                        key={model.id}
                                                        className={`settings-model-card ${aiSettings.selectedModel === model.id ? 'selected' : ''}`}
                                                        onClick={() => selectModel(model.id)}
                                                    >
                                                        <div className="settings-model-header">
                                                            <div className="settings-model-name">{model.name}</div>
                                                            <div className={`settings-model-badge ${aiSettings.selectedModel === model.id ? '' : 'inactive'}`}>
                                                                {aiSettings.selectedModel === model.id ? 'Активна' : 'Неактивна'}
                                                            </div>
                                                        </div>
                                                        <div className="settings-model-description">
                                                            {model.description}
                                                        </div>
                                                        <div className="settings-model-stats">
                                                            <div className="settings-model-stat">
                                                                <div className="settings-stat-value">{model.accuracy}%</div>
                                                                <div className="settings-stat-label">Точность</div>
                                                            </div>
                                                            <div className="settings-model-stat">
                                                                <div className="settings-stat-value">{model.speed} мс</div>
                                                                <div className="settings-stat-label">Время</div>
                                                            </div>
                                                            <div className="settings-model-stat">
                                                                <div className="settings-stat-value">
                                                                    {model.size < 1000 ? `${model.size} МБ` : `${(model.size / 1000).toFixed(1)} ГБ`}
                                                                </div>
                                                                <div className="settings-stat-label">Размер</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="settings-group">
                                            <div className="settings-group-title">
                                                <i className="fas fa-microchip"></i>
                                                <span>Оптимизация</span>
                                            </div>
                                            
                                            <div className="settings-grid">
                                                <div className="settings-row">
                                                    <label className="settings-label">
                                                        <i className="fas fa-bolt"></i>
                                                        <span>Ускорение аппаратное</span>
                                                    </label>
                                                    <select 
                                                        className="settings-select" 
                                                        value={aiSettings.hardwareAcceleration}
                                                        onChange={(e) => handleAiSettingChange('hardwareAcceleration', e.target.value)}
                                                    >
                                                        <option value="cpu">Только CPU</option>
                                                        <option value="cuda">NVIDIA CUDA</option>
                                                        <option value="openvino">Intel OpenVINO</option>
                                                        <option value="tensorrt">NVIDIA TensorRT</option>
                                                    </select>
                                                    <div className="settings-hint">Аппаратное ускорение для нейросети</div>
                                                </div>
                                                
                                                <div className="settings-row">
                                                    <label className="settings-label">
                                                        <i className="fas fa-tachometer-alt"></i>
                                                        <span>Batch size</span>
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        className="settings-input" 
                                                        value={aiSettings.batchSize}
                                                        min="1" 
                                                        max="16"
                                                        onChange={(e) => handleAiSettingChange('batchSize', parseInt(e.target.value))}
                                                    />
                                                    <div className="settings-hint">Количество изображений за один проход</div>
                                                </div>
                                                
                                                <div className="settings-row">
                                                    <label className="settings-label">
                                                        <i className="fas fa-compress-arrows-alt"></i>
                                                        <span>Квантование модели</span>
                                                    </label>
                                                    <select 
                                                        className="settings-select" 
                                                        value={aiSettings.quantization}
                                                        onChange={(e) => handleAiSettingChange('quantization', e.target.value)}
                                                    >
                                                        <option value="none">Без квантования</option>
                                                        <option value="fp16">FP16 (половинная точность)</option>
                                                        <option value="int8">INT8 (8-битное)</option>
                                                    </select>
                                                    <div className="settings-hint">Сжатие модели для ускорения</div>
                                                </div>
                                                
                                                <div className="settings-row">
                                                    <label className="settings-label">
                                                        <i className="fas fa-memory"></i>
                                                        <span>Использование памяти</span>
                                                    </label>
                                                    <div className="settings-slider-container">
                                                        <input 
                                                            type="range" 
                                                            min="512" 
                                                            max="8192" 
                                                            value={aiSettings.memoryLimit}
                                                            className="settings-slider"
                                                            step="256"
                                                            onChange={(e) => handleAiSettingChange('memoryLimit', parseInt(e.target.value))}
                                                        />
                                                        <div className="settings-slider-value">{aiSettings.memoryLimit} МБ</div>
                                                    </div>
                                                    <div className="settings-hint">Лимит памяти для нейросети</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="settings-buttons">
                                            <button 
                                                className="settings-btn settings-btn-secondary"
                                                onClick={testModel}
                                            >
                                                <i className="fas fa-vial"></i>
                                                <span>Тестирование модели</span>
                                            </button>
                                            <button 
                                                className="settings-btn settings-btn-primary"
                                                onClick={updateModel}
                                            >
                                                <i className="fas fa-sync-alt"></i>
                                                <span>Обновить модель</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
    
                {/* Модальное окно для тестирования модели */}
                {testModalOpen && (
                    <div className="settings-modal-overlay" onClick={() => setTestModalOpen(false)}>
                        <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
                            <div className="settings-modal-header">
                                <h3>
                                    <i className="fas fa-vial"></i>
                                    Тестирование модели
                                </h3>
                                <button 
                                    className="settings-close-modal"
                                    onClick={() => setTestModalOpen(false)}
                                >
                                    &times;
                                </button>
                            </div>
                            <div className="settings-modal-body">
                                <div style={{ textAlign: 'center', padding: '30px' }}>
                                    <i className="fas fa-cogs" style={{ fontSize: '3rem', color: '#4dabf7', marginBottom: '20px' }}></i>
                                    <h3 style={{ color: '#e0e0e0', marginBottom: '15px' }}>
                                        Тестирование модели {getSelectedModel().name}
                                    </h3>
                                    <p style={{ color: '#b0c4de', marginBottom: '25px' }}>
                                        Проводится оценка производительности модели на тестовом наборе данных...
                                    </p>
                                    <div style={{ backgroundColor: 'rgba(30, 45, 65, 0.6)', borderRadius: '8px', padding: '20px', marginBottom: '25px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ color: '#b0c4de' }}>Точность (Precision):</span>
                                            <span style={{ color: '#4dabf7', fontWeight: '600' }}>
                                                {getSelectedModel().accuracy}%
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ color: '#b0c4de' }}>Полнота (Recall):</span>
                                            <span style={{ color: '#4dabf7', fontWeight: '600' }}>94.8%</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ color: '#b0c4de' }}>F1-Score:</span>
                                            <span style={{ color: '#4dabf7', fontWeight: '600' }}>95.5%</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#b0c4de' }}>Время обработки:</span>
                                            <span style={{ color: '#4dabf7', fontWeight: '600' }}>
                                                {getSelectedModel().speed} мс
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>
                                        Тестирование завершено успешно. Модель готова к работе в production.
                                    </div>
                                </div>
                            </div>
                            <div className="settings-modal-footer">
                                <button 
                                    className="settings-btn settings-btn-primary"
                                    onClick={() => setTestModalOpen(false)}
                                >
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

//     return (
//         <div className="container">
//             {/* Уведомление */}
//             {notification && (
//                 <div className={`notification ${notification.type}`}>
//                     {notification.message}
//                 </div>
//             )}

//             {/* Шапка */}
//             <TopNav
//   subtitle="Система распознавания трещин в слитках • Журнал событий и отчетность"
//   userName="Оператор Иванов А.С."
//   userRole="Смена #3 • 08:00-20:00"
// />


                            
//             {/* Основное содержимое */}
//             <div className="main-content">
//                 {/* Боковая панель навигации */}
//                 <div className="settings-sidebar">
//                     <div className="sidebar-header">
//                         <h2><i className="fas fa-cogs"></i> Настройки</h2>
//                     </div>
                    
//                     <div className="settings-nav">
//                         <div className="nav-section">
//                             <div className="nav-section-title">Оборудование</div>
//                             <a 
//                                 href="#" 
//                                 className={`nav-item ${activeSection === 'camera' ? 'active' : ''}`}
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('camera'); }}
//                             >
//                                 <i className="fas fa-video"></i> Настройки камеры
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className={`nav-item ${activeSection === 'calibration' ? 'active' : ''}`}
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('calibration'); }}
//                             >
//                                 <i className="fas fa-ruler-combined"></i> Калибровка
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('lighting'); }}
//                             >
//                                 <i className="fas fa-lightbulb"></i> Освещение
//                             </a>
//                         </div>
                        
//                         <div className="nav-section">
//                             <div className="nav-section-title">ИИ-модели</div>
//                             <a 
//                                 href="#" 
//                                 className={`nav-item ${activeSection === 'ai-models' ? 'active' : ''}`}
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('ai-models'); }}
//                             >
//                                 <i className="fas fa-robot"></i> Настройки нейросети
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('thresholds'); }}
//                             >
//                                 <i className="fas fa-chart-line"></i> Пороги уверенности
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('performance'); }}
//                             >
//                                 <i className="fas fa-tachometer-alt"></i> Производительность
//                             </a>
//                         </div>
                        
//                         <div className="nav-section">
//                             <div className="nav-section-title">Интеграция</div>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('mes-integration'); }}
//                             >
//                                 <i className="fas fa-exchange-alt"></i> Интеграция с MES
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('api'); }}
//                             >
//                                 <i className="fas fa-code"></i> API и вебхуки
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('export'); }}
//                             >
//                                 <i className="fas fa-file-export"></i> Экспорт данных
//                             </a>
//                         </div>
                        
//                         <div className="nav-section">
//                             <div className="nav-section-title">Система</div>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('users'); }}
//                             >
//                                 <i className="fas fa-users"></i> Пользователи и роли
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('notifications'); }}
//                             >
//                                 <i className="fas fa-bell"></i> Уведомления
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('system'); }}
//                             >
//                                 <i className="fas fa-server"></i> Системная информация
//                             </a>
//                             <a 
//                                 href="#" 
//                                 className="nav-item"
//                                 onClick={(e) => { e.preventDefault(); setActiveSection('backup'); }}
//                             >
//                                 <i className="fas fa-database"></i> Резервное копирование
//                             </a>
//                         </div>
//                     </div>
//                 </div>
                
//                 {/* Основная панель настроек */}
//                 <div className="settings-main">
//                     {/* Заголовок раздела */}
//                     <div className="settings-header">
//                         <h2>
//                             <i className={getActiveSectionData().icon}></i> {getActiveSectionData().title}
//                         </h2>
//                         <div className="settings-description">
//                             {getActiveSectionData().description}
//                         </div>
//                     </div>
                    
//                     {/* Контент настроек */}
//                     <div className="settings-content">
//                         {/* Панель настроек камеры */}
//                         {activeSection === 'camera' && (
//                             <div className="settings-panel">
//                                 <div className="panel-header">
//                                     <h3><i className="fas fa-video"></i> Параметры камеры #4</h3>
//                                     <div className="status-indicator">
//                                         <span className="status-dot status-active"></span>
//                                         <span>Камера активна</span>
//                                     </div>
//                                 </div>
                                
//                                 <div className="panel-content">
//                                     <div className="settings-grid">
//                                         <div className="settings-row">
//                                             <label className="settings-label">
//                                                 <i className="fas fa-sun"></i> Яркость
//                                             </label>
//                                             <div className="slider-container">
//                                                 <input 
//                                                     type="range" 
//                                                     min="0" 
//                                                     max="100" 
//                                                     value={cameraSettings.brightness}
//                                                     className="slider"
//                                                     onChange={(e) => handleCameraSliderChange('brightness', e.target.value)}
//                                                 />
//                                                 <div className="slider-value">{cameraSettings.brightness}%</div>
//                                             </div>
//                                             <div className="settings-hint">Регулировка общей яркости изображения</div>
//                                         </div>
                                        
//                                         <div className="settings-row">
//                                             <label className="settings-label">
//                                                 <i className="fas fa-adjust"></i> Контрастность
//                                             </label>
//                                             <div className="slider-container">
//                                                 <input 
//                                                     type="range" 
//                                                     min="0" 
//                                                     max="100" 
//                                                     value={cameraSettings.contrast}
//                                                     className="slider"
//                                                     onChange={(e) => handleCameraSliderChange('contrast', e.target.value)}
//                                                 />
//                                                 <div className="slider-value">{cameraSettings.contrast}%</div>
//                                             </div>
//                                             <div className="settings-hint">Разница между светлыми и темными участками</div>
//                                         </div>
                                        
//                                         <div className="settings-row">
//                                             <label className="settings-label">
//                                                 <i className="fas fa-camera"></i> Экспозиция
//                                             </label>
//                                             <div className="slider-container">
//                                                 <input 
//                                                     type="range" 
//                                                     min="0" 
//                                                     max="100" 
//                                                     value={cameraSettings.exposure}
//                                                     className="slider"
//                                                     onChange={(e) => handleCameraSliderChange('exposure', e.target.value)}
//                                                 />
//                                                 <div className="slider-value">{cameraSettings.exposure}%</div>
//                                             </div>
//                                             <div className="settings-hint">Количество света, попадающего на матрицу</div>
//                                         </div>
                                        
//                                         <div className="settings-row">
//                                             <label className="settings-label">
//                                                 <i className="fas fa-search"></i> Резкость
//                                             </label>
//                                             <div className="slider-container">
//                                                 <input 
//                                                     type="range" 
//                                                     min="0" 
//                                                     max="100" 
//                                                     value={cameraSettings.sharpness}
//                                                     className="slider"
//                                                     onChange={(e) => handleCameraSliderChange('sharpness', e.target.value)}
//                                                 />
//                                                 <div className="slider-value">{cameraSettings.sharpness}%</div>
//                                             </div>
//                                             <div className="settings-hint">Четкость границ и деталей на изображении</div>
//                                         </div>
                                        
//                                         <div className="settings-row">
//                                             <label className="settings-label">
//                                                 <i className="fas fa-palette"></i> Баланс белого
//                                             </label>
//                                             <select 
//                                                 className="settings-select" 
//                                                 value={cameraSettings.whiteBalance}
//                                                 onChange={(e) => handleCameraSliderChange('whiteBalance', e.target.value)}
//                                             >
//                                                 <option value="auto">Автоматически</option>
//                                                 <option value="3000">3000K (лампа накаливания)</option>
//                                                 <option value="4000">4000K (флуоресцентная)</option>
//                                                 <option value="5000">5000K (дневной свет)</option>
//                                                 <option value="6000">6000K (облачное небо)</option>
//                                                 <option value="7000">7000K (тень)</option>
//                                             </select>
//                                             <div className="settings-hint">Цветовая температура освещения</div>
//                                         </div>
                                        
//                                         <div className="settings-row">
//                                             <label className="settings-label">
//                                                 <i className="fas fa-expand-alt"></i> Разрешение
//                                             </label>
//                                             <select 
//                                                 className="settings-select" 
//                                                 value={cameraSettings.resolution}
//                                                 onChange={(e) => handleCameraSliderChange('resolution', e.target.value)}
//                                             >
//                                                 <option value="1080p">1920x1080 (Full HD)</option>
//                                                 <option value="1440p">2560x1440 (2K)</option>
//                                                 <option value="4k">3840x2160 (4K)</option>
//                                             </select>
//                                             <div className="settings-hint">Разрешение видеопотока</div>
//                                         </div>
                                        
//                                         <div className="settings-row full-width">
//                                             <label className="settings-label">
//                                                 <i className="fas fa-filter"></i> Фильтры изображения
//                                             </label>
//                                             <div className="checkbox-group">
//                                                 <div className="checkbox-item">
//                                                     <input 
//                                                         type="checkbox" 
//                                                         id="filterNoise" 
//                                                         checked={cameraSettings.filters.noise}
//                                                         onChange={(e) => handleFilterChange('noise', e.target.checked)}
//                                                     />
//                                                     <label htmlFor="filterNoise" className="checkbox-label">
//                                                         Подавление шума
//                                                     </label>
//                                                 </div>
//                                                 <div className="checkbox-item">
//                                                     <input 
//                                                         type="checkbox" 
//                                                         id="filterGaussian" 
//                                                         checked={cameraSettings.filters.gaussian}
//                                                         onChange={(e) => handleFilterChange('gaussian', e.target.checked)}
//                                                     />
//                                                     <label htmlFor="filterGaussian" className="checkbox-label">
//                                                         Гауссово размытие
//                                                     </label>
//                                                 </div>
//                                                 <div className="checkbox-item">
//                                                     <input 
//                                                         type="checkbox" 
//                                                         id="filterEdge" 
//                                                         checked={cameraSettings.filters.edge}
//                                                         onChange={(e) => handleFilterChange('edge', e.target.checked)}
//                                                     />
//                                                     <label htmlFor="filterEdge" className="checkbox-label">
//                                                         Выделение границ
//                                                     </label>
//                                                 </div>
//                                                 <div className="checkbox-item">
//                                                     <input 
//                                                         type="checkbox" 
//                                                         id="filterContrast" 
//                                                         checked={cameraSettings.filters.contrast}
//                                                         onChange={(e) => handleFilterChange('contrast', e.target.checked)}
//                                                     />
//                                                     <label htmlFor="filterContrast" className="checkbox-label">
//                                                         Автоконтраст
//                                                     </label>
//                                                 </div>
//                                             </div>
//                                             <div className="settings-hint">Цифровая обработка изображения перед анализом</div>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="settings-buttons">
//                                         <button 
//                                             className="settings-btn secondary"
//                                             onClick={resetCameraSettings}
//                                         >
//                                             <i className="fas fa-redo"></i> Сбросить настройки
//                                         </button>
//                                         <button 
//                                             className="settings-btn primary"
//                                             onClick={saveCameraSettings}
//                                         >
//                                             <i className="fas fa-save"></i> Сохранить настройки
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}
                        
//                         {/* Панель калибровки */}
//                         {activeSection === 'calibration' && (
//                             <div className="settings-panel">
//                                 <div className="panel-header">
//                                     <h3><i className="fas fa-ruler-combined"></i> Калибровка системы</h3>
//                                     <div className="status-indicator">
//                                         <span className={`status-dot ${getCalibrationStatus().color}`}></span>
//                                         <span>{getCalibrationStatus().text}</span>
//                                     </div>
//                                 </div>
                                
//                                 <div className="panel-content">
//                                     <div className="calibration-container">
//                                         <div className="calibration-preview">
//                                             <div className="calibration-target">
//                                                 <div className="target-circle"></div>
//                                             </div>
//                                         </div>
                                        
//                                         <div className="calibration-controls">
//                                             <div className="settings-group">
//                                                 <div className="group-title">
//                                                     <i className="fas fa-crosshairs"></i> Геометрическая калибровка
//                                                 </div>
                                                
//                                                 <div className="calibration-grid">
//                                                     <div className="settings-row">
//                                                         <label className="settings-label">
//                                                             <i className="fas fa-ruler-horizontal"></i> Масштаб (мм/пиксель)
//                                                         </label>
//                                                         <input 
//                                                             type="number" 
//                                                             className="settings-input" 
//                                                             value={calibrationSettings.scaleFactor}
//                                                             step="0.01"
//                                                             onChange={(e) => handleCalibrationChange('scaleFactor', parseFloat(e.target.value))}
//                                                         />
//                                                         <div className="settings-hint">Коэффициент преобразования пикселей в миллиметры</div>
//                                                     </div>
                                                    
//                                                     <div className="settings-row">
//                                                         <label className="settings-label">
//                                                             <i className="fas fa-expand-arrows-alt"></i> Искажение объектива
//                                                         </label>
//                                                         <input 
//                                                             type="number" 
//                                                             className="settings-input" 
//                                                             value={calibrationSettings.lensDistortion}
//                                                             step="0.01"
//                                                             onChange={(e) => handleCalibrationChange('lensDistortion', parseFloat(e.target.value))}
//                                                         />
//                                                         <div className="settings-hint">Коэффициент коррекции дисторсии</div>
//                                                     </div>
//                                                 </div>
                                                
//                                                 <div className="settings-row full-width">
//                                                     <label className="settings-label">
//                                                         <i className="fas fa-bullseye"></i> Калибровочная мишень
//                                                     </label>
//                                                     <select 
//                                                         className="settings-select" 
//                                                         value={calibrationSettings.calibrationTarget}
//                                                         onChange={(e) => handleCalibrationChange('calibrationTarget', e.target.value)}
//                                                     >
//                                                         <option value="checkerboard">Шахматная доска 10x7</option>
//                                                         <option value="circleGrid">Круговая мишень 15x10</option>
//                                                         <option value="charuco">Мишень Charuco</option>
//                                                     </select>
//                                                     <div className="settings-hint">Тип калибровочной мишени</div>
//                                                 </div>
//                                             </div>
                                            
//                                             <div className="settings-group">
//                                                 <div className="group-title">
//                                                     <i className="fas fa-tachometer-alt"></i> Автоматическая калибровка
//                                                 </div>
                                                
//                                                 <div className="settings-row full-width">
//                                                     <label className="settings-label">
//                                                         <i className="fas fa-robot"></i> Режим калибровки
//                                                     </label>
//                                                     <select 
//                                                         className="settings-select" 
//                                                         value={calibrationSettings.calibrationMode}
//                                                         onChange={(e) => handleCalibrationChange('calibrationMode', e.target.value)}
//                                                     >
//                                                         <option value="manual">Ручная калибровка</option>
//                                                         <option value="semiauto">Полуавтоматическая</option>
//                                                         <option value="auto">Автоматическая</option>
//                                                     </select>
//                                                     <div className="settings-hint">Способ проведения калибровки</div>
//                                                 </div>
                                                
//                                                 <div className="settings-buttons" style={{ marginTop: '15px', borderTop: 'none', paddingTop: 0 }}>
//                                                     <button 
//                                                         className="settings-btn secondary"
//                                                         onClick={startCalibration}
//                                                     >
//                                                         <i className="fas fa-play-circle"></i> Начать калибровку
//                                                     </button>
//                                                     <button 
//                                                         className="settings-btn primary"
//                                                         onClick={autoCalibrate}
//                                                     >
//                                                         <i className="fas fa-robot"></i> Автоматическая калибровка
//                                                     </button>
//                                                 </div>
//                                             </div>
                                            
//                                             <div className="settings-group">
//                                                 <div className="group-title">
//                                                     <i className="fas fa-history"></i> История калибровок
//                                                 </div>
                                                
//                                                 <div className="settings-row full-width">
//                                                     <div style={{ backgroundColor: 'rgba(30, 45, 65, 0.6)', borderRadius: '8px', padding: '15px' }}>
//                                                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
//                                                             <div style={{ color: '#e0e0e0', fontWeight: '500' }}>Последняя калибровка</div>
//                                                             <div style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>
//                                                                 {calibrationSettings.lastCalibration}
//                                                             </div>
//                                                         </div>
//                                                         <div style={{ color: '#b0c4de', fontSize: '0.95rem' }}>
//                                                             Точность: 98.7% • Смещение: 0.2 пикселя • Время: 2 мин 15 сек
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}
                        
//                         {/* Панель настроек нейросети */}
//                         {activeSection === 'ai-models' && (
//                             <div className="settings-panel">
//                                 <div className="panel-header">
//                                     <h3><i className="fas fa-robot"></i> Настройки нейросетевых моделей</h3>
//                                     <div className="status-indicator">
//                                         <span className="status-dot status-active"></span>
//                                         <span>Модель активна</span>
//                                     </div>
//                                 </div>
                                
//                                 <div className="panel-content">
//                                     <div className="settings-group">
//                                         <div className="group-title">
//                                             <i className="fas fa-project-diagram"></i> Выбор модели
//                                         </div>
                                        
//                                         <div className="settings-grid">
//                                             {models.map(model => (
//                                                 <div 
//                                                     key={model.id}
//                                                     className={`model-card ${aiSettings.selectedModel === model.id ? 'selected' : ''}`}
//                                                     onClick={() => selectModel(model.id)}
//                                                     style={{ cursor: 'pointer' }}
//                                                 >
//                                                     <div className="model-header">
//                                                         <div className="model-name">{model.name}</div>
//                                                         <div className={`model-badge ${aiSettings.selectedModel === model.id ? '' : 'inactive'}`}>
//                                                             {aiSettings.selectedModel === model.id ? 'Активна' : 'Неактивна'}
//                                                         </div>
//                                                     </div>
//                                                     <div style={{ color: '#b0c4de', fontSize: '0.95rem', marginTop: '5px' }}>
//                                                         {model.description}
//                                                     </div>
//                                                     <div className="model-stats">
//                                                         <div className="model-stat">
//                                                             <div className="stat-value">{model.accuracy}%</div>
//                                                             <div className="stat-label">Точность</div>
//                                                         </div>
//                                                         <div className="model-stat">
//                                                             <div className="stat-value">{model.speed} мс</div>
//                                                             <div className="stat-label">Время</div>
//                                                         </div>
//                                                         <div className="model-stat">
//                                                             <div className="stat-value">
//                                                                 {model.size < 1000 ? `${model.size} МБ` : `${(model.size / 1000).toFixed(1)} ГБ`}
//                                                             </div>
//                                                             <div className="stat-label">Размер</div>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
                                    
//                                     <div className="settings-group">
//                                         <div className="group-title">
//                                             <i className="fas fa-microchip"></i> Оптимизация
//                                         </div>
                                        
//                                         <div className="settings-grid">
//                                             <div className="settings-row">
//                                                 <label className="settings-label">
//                                                     <i className="fas fa-bolt"></i> Ускорение аппаратное
//                                                 </label>
//                                                 <select 
//                                                     className="settings-select" 
//                                                     value={aiSettings.hardwareAcceleration}
//                                                     onChange={(e) => handleAiSettingChange('hardwareAcceleration', e.target.value)}
//                                                 >
//                                                     <option value="cpu">Только CPU</option>
//                                                     <option value="cuda">NVIDIA CUDA</option>
//                                                     <option value="openvino">Intel OpenVINO</option>
//                                                     <option value="tensorrt">NVIDIA TensorRT</option>
//                                                 </select>
//                                                 <div className="settings-hint">Аппаратное ускорение для нейросети</div>
//                                             </div>
                                            
//                                             <div className="settings-row">
//                                                 <label className="settings-label">
//                                                     <i className="fas fa-tachometer-alt"></i> Batch size
//                                                 </label>
//                                                 <input 
//                                                     type="number" 
//                                                     className="settings-input" 
//                                                     value={aiSettings.batchSize}
//                                                     min="1" 
//                                                     max="16"
//                                                     onChange={(e) => handleAiSettingChange('batchSize', parseInt(e.target.value))}
//                                                 />
//                                                 <div className="settings-hint">Количество изображений за один проход</div>
//                                             </div>
                                            
//                                             <div className="settings-row">
//                                                 <label className="settings-label">
//                                                     <i className="fas fa-compress-arrows-alt"></i> Квантование модели
//                                                 </label>
//                                                 <select 
//                                                     className="settings-select" 
//                                                     value={aiSettings.quantization}
//                                                     onChange={(e) => handleAiSettingChange('quantization', e.target.value)}
//                                                 >
//                                                     <option value="none">Без квантования</option>
//                                                     <option value="fp16">FP16 (половинная точность)</option>
//                                                     <option value="int8">INT8 (8-битное)</option>
//                                                 </select>
//                                                 <div className="settings-hint">Сжатие модели для ускорения</div>
//                                             </div>
                                            
//                                             <div className="settings-row">
//                                                 <label className="settings-label">
//                                                     <i className="fas fa-memory"></i> Использование памяти
//                                                 </label>
//                                                 <div className="slider-container">
//                                                     <input 
//                                                         type="range" 
//                                                         min="512" 
//                                                         max="8192" 
//                                                         value={aiSettings.memoryLimit}
//                                                         className="slider"
//                                                         step="256"
//                                                         onChange={(e) => handleAiSettingChange('memoryLimit', parseInt(e.target.value))}
//                                                     />
//                                                     <div className="slider-value">{aiSettings.memoryLimit} МБ</div>
//                                                 </div>
//                                                 <div className="settings-hint">Лимит памяти для нейросети</div>
//                                             </div>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="settings-buttons">
//                                         <button 
//                                             className="settings-btn secondary"
//                                             onClick={testModel}
//                                         >
//                                             <i className="fas fa-vial"></i> Тестирование модели
//                                         </button>
//                                         <button 
//                                             className="settings-btn primary"
//                                             onClick={updateModel}
//                                         >
//                                             <i className="fas fa-sync-alt"></i> Обновить модель
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>
        

//         {/* Модальное окно для тестирования модели */}
//         {testModalOpen && (
//             <div className="modal-overlay" onClick={() => setTestModalOpen(false)}>
//                 <div className="modal-content" onClick={e => e.stopPropagation()}>
//                     <div className="modal-header">
//                         <h3><i className="fas fa-vial"></i> Тестирование модели</h3>
//                         <button 
//                             className="close-modal"
//                             onClick={() => setTestModalOpen(false)}
//                         >
//                             &times;
//                         </button>
//                     </div>
//                     <div className="modal-body">
//                         <div style={{ textAlign: 'center', padding: '30px' }}>
//                             <i className="fas fa-cogs" style={{ fontSize: '3rem', color: '#4dabf7', marginBottom: '20px' }}></i>
//                             <h3 style={{ color: '#e0e0e0', marginBottom: '15px' }}>
//                                 Тестирование модели {getSelectedModel().name}
//                             </h3>
//                             <p style={{ color: '#b0c4de', marginBottom: '25px' }}>
//                                 Проводится оценка производительности модели на тестовом наборе данных...
//                             </p>
//                             <div style={{ backgroundColor: 'rgba(30, 45, 65, 0.6)', borderRadius: '8px', padding: '20px', marginBottom: '25px' }}>
//                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
//                                     <span style={{ color: '#b0c4de' }}>Точность (Precision):</span>
//                                     <span style={{ color: '#4dabf7', fontWeight: '600' }}>
//                                         {getSelectedModel().accuracy}%
//                                     </span>
//                                 </div>
//                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
//                                     <span style={{ color: '#b0c4de' }}>Полнота (Recall):</span>
//                                     <span style={{ color: '#4dabf7', fontWeight: '600' }}>94.8%</span>
//                                 </div>
//                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
//                                     <span style={{ color: '#b0c4de' }}>F1-Score:</span>
//                                     <span style={{ color: '#4dabf7', fontWeight: '600' }}>95.5%</span>
//                                 </div>
//                                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//                                     <span style={{ color: '#b0c4de' }}>Время обработки:</span>
//                                     <span style={{ color: '#4dabf7', fontWeight: '600' }}>
//                                         {getSelectedModel().speed} мс
//                                     </span>
//                                 </div>
//                             </div>
//                             <div style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>
//                                 Тестирование завершено успешно. Модель готова к работе в production.
//                             </div>
//                         </div>
//                     </div>
//                     <div style={{ padding: '20px', borderTop: '1px solid rgba(60, 120, 180, 0.2)', textAlign: 'center' }}>
//                         <button 
//                             className="settings-btn primary"
//                             onClick={() => setTestModalOpen(false)}
//                         >
//                             Закрыть
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         )}
//     </div>
//     );
};

export default Settings;