import React, { useState, useEffect } from 'react';

const Account = () => {
    // Состояние профиля пользователя
    const [profile, setProfile] = useState({
        name: 'Иванов Алексей Сергеевич',
        shortName: 'Иванов А.С.',
        role: 'Старший оператор',
        status: 'На смене',
        employeeId: '#OP-0427',
        department: 'Контроль качества',
        shift: '#3 (14:00-22:00)',
        tenure: '3 года 8 мес.',
        email: 'a.ivanov@metalinspect.ru',
        phone: '+7 (912) 345-67-89',
        avatarStatus: 'online'
    });

    // Состояние приветственной панели
    const [welcomeStats, setWelcomeStats] = useState({
        checkedToday: 42,
        defectsToday: 1,
        timeLeft: '4ч 12м'
    });

    // Состояние задач
    const [tasks, setTasks] = useState([
        {
            id: 1,
            title: 'Проверить критическую партию SL-4850',
            description: 'Требуется дополнительная проверка партии слитков с повышенным риском дефектов.',
            priority: 'high',
            dueDate: 'До 18:00 сегодня',
            completed: false
        },
        {
            id: 2,
            title: 'Обновить калибровку камеры #4',
            description: 'Плановое обслуживание и калибровка камеры контроля качества.',
            priority: 'medium',
            dueDate: 'До конца смены',
            completed: false
        },
        {
            id: 3,
            title: 'Пройти обучение по новой модели ИИ',
            description: 'Обучение работе с обновленной нейросетевой моделью YOLOv8.',
            priority: 'low',
            dueDate: 'До 25 июня',
            completed: false
        }
    ]);

    // Состояние графика работы
    const [schedule, setSchedule] = useState([
        { day: 'Пн', hours: 8, current: false },
        { day: 'Вт', hours: 6, current: false },
        { day: 'Ср', hours: 8, current: false },
        { day: 'Чт', hours: 8, current: false },
        { day: 'Пт', hours: 8, current: false },
        { day: 'Сб', hours: 4, current: false },
        { day: 'Вс', hours: 0, current: true }
    ]);

    // Состояние персональной статистики
    const [personalStats, setPersonalStats] = useState({
        accuracy: 98.7,
        checkedTotal: 1842,
        defectsFound: 24,
        rating: 4.2
    });

    // Состояние уведомлений
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            title: 'Обновление системы',
            message: 'Запланировано обновление программного обеспечения на 20 июня в 02:00.',
            time: '10 минут назад',
            read: false,
            icon: 'fas fa-exclamation-circle'
        },
        {
            id: 2,
            title: 'Новый курс обучения',
            message: 'Доступен новый курс "Работа с моделью YOLOv8". Пройдите до 25 июня.',
            time: '2 часа назад',
            read: true,
            icon: 'fas fa-graduation-cap'
        }
    ]);

    // Состояние сертификатов
    const [certificates, setCertificates] = useState([
        {
            id: 1,
            name: 'Оператор ИИ-систем контроля качества',
            icon: 'fas fa-robot',
            issued: '15.03.2023',
            validUntil: '15.03.2024',
            status: 'completed'
        },
        {
            id: 2,
            name: 'Промышленная безопасность',
            icon: 'fas fa-shield-alt',
            issued: '10.01.2023',
            validUntil: '10.01.2024',
            status: 'in-progress'
        }
    ]);

    // Состояние модального окна начала смены
    const [shiftModalOpen, setShiftModalOpen] = useState(false);

    // Состояние уведомлений
    const [notification, setNotification] = useState(null);

    // Быстрые действия
    const quickActions = [
        { id: 'startShift', label: 'Начать смену', icon: 'fas fa-play-circle' },
        { id: 'reportIssue', label: 'Сообщить о проблеме', icon: 'fas fa-exclamation-triangle' },
        { id: 'requestLeave', label: 'Заявка на отпуск', icon: 'fas fa-calendar-plus' },
        { id: 'trainingMaterials', label: 'Обучение', icon: 'fas fa-graduation-cap' },
        { id: 'settings', label: 'Настройки', icon: 'fas fa-cog' },
        { id: 'help', label: 'Помощь', icon: 'fas fa-question-circle' }
    ];

    // Достижения
    const achievements = [
        { name: 'Точность', icon: 'fas fa-bullseye', type: 'gold' },
        { name: 'Темп', icon: 'fas fa-tachometer-alt', type: 'silver' },
        { name: 'Качество', icon: 'fas fa-star', type: 'bronze' },
        { name: 'Эксперт', icon: 'fas fa-graduation-cap', type: 'blue' }
    ];

    // Эффект для установки текущего дня в графике
    useEffect(() => {
        const today = new Date().getDay();
        const adjustedToday = today === 0 ? 6 : today - 1;
        
        setSchedule(prev => prev.map((day, index) => ({
            ...day,
            current: index === adjustedToday
        })));
    }, []);

    // Функция отображения уведомлений
    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Обработка быстрых действий
    const handleQuickAction = (actionId) => {
        switch(actionId) {
            case 'startShift':
                setShiftModalOpen(true);
                break;
            case 'reportIssue':
                showNotification('Открыта форма сообщения о проблеме', 'info');
                break;
            case 'requestLeave':
                showNotification('Открыта форма заявки на отпуск', 'info');
                break;
            case 'trainingMaterials':
                showNotification('Открыты материалы обучения', 'info');
                break;
            case 'settings':
                showNotification('Открыты настройки профиля', 'info');
                break;
            case 'help':
                showNotification('Открыт раздел помощи', 'info');
                break;
            default:
                break;
        }
    };

    // Завершение задачи
    const completeTask = (taskId) => {
        setTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, completed: true } : task
        ));
        
        // Обновляем статистику
        setWelcomeStats(prev => ({
            ...prev,
            checkedToday: prev.checkedToday + 1
        }));
        
        setPersonalStats(prev => ({
            ...prev,
            checkedTotal: prev.checkedTotal + 1
        }));
        
        showNotification('Задача отмечена как выполненная', 'success');
    };

    // Отложить задачу
    const deferTask = (taskId) => {
        showNotification('Задача отложена на завтра', 'info');
    };

    // Начать обучение
    const startTraining = () => {
        showNotification('Обучение начато. Удачи!', 'success');
    };

    // Подтверждение начала смены
    const confirmShift = () => {
        setProfile(prev => ({
            ...prev,
            status: 'На смене',
            avatarStatus: 'online'
        }));
        
        setShiftModalOpen(false);
        showNotification('Смена успешно начата!', 'success');
    };

    // Переключение статуса
    const toggleStatus = () => {
        const newStatus = profile.avatarStatus === 'online' ? 'away' : 'online';
        const newStatusText = newStatus === 'online' ? 'На смене' : 'Отошел';
        
        setProfile(prev => ({
            ...prev,
            status: newStatusText,
            avatarStatus: newStatus
        }));
        
        showNotification(`Статус изменен на "${newStatusText}"`, 'info');
    };

    // Обновление данных профиля
    const updateProfileField = (field, value) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }));
        
        if (field === 'email' || field === 'phone') {
            showNotification('Контактные данные обновлены', 'success');
        }
    };

    // Показать детали дня
    const showDayDetails = (dayIndex, dayName, hours) => {
        const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const fullDayName = dayNames[dayIndex];
        
        let message = '';
        if (hours > 0) {
            message = `${fullDayName}: рабочая смена ${hours} часов (14:00-22:00)`;
        } else {
            message = `${fullDayName}: выходной день`;
        }
        
        showNotification(message, 'info');
    };

    // Получение цвета приоритета задачи
    const getTaskPriorityColor = (priority) => {
        switch(priority) {
            case 'high': return '#f44336';
            case 'medium': return '#ff9800';
            case 'low': return '#4CAF50';
            default: return '#8fb4d9';
        }
    };

    // Получение текста приоритета
    const getTaskPriorityText = (priority) => {
        switch(priority) {
            case 'high': return 'Высокий';
            case 'medium': return 'Средний';
            case 'low': return 'Низкий';
            default: return 'Не указан';
        }
    };

    // Получение цвета статуса сертификата
    const getCertificateStatusColor = (status) => {
        switch(status) {
            case 'completed': return '#4CAF50';
            case 'in-progress': return '#ff9800';
            case 'expired': return '#f44336';
            default: return '#8fb4d9';
        }
    };

    // Получение текста статуса сертификата
    const getCertificateStatusText = (status) => {
        switch(status) {
            case 'completed': return 'Активен';
            case 'in-progress': return 'Требует продления';
            case 'expired': return 'Истек';
            default: return 'Неизвестно';
        }
    };

    // Получение цвета достижения
    const getAchievementClass = (type) => {
        switch(type) {
            case 'gold': return 'badge-gold';
            case 'silver': return 'badge-silver';
            case 'bronze': return 'badge-bronze';
            case 'blue': return 'badge-blue';
            default: return '';
        }
    };

    return (
        <div className="container">
            {/* Уведомление */}
            {notification && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            {/* Шапка */}
            <div className="header">
                <div className="logo-section">
                    <div className="logo-icon">
                        <i className="fas fa-industry"></i>
                    </div>
                    <div className="logo-text">
                        <h1>Metal Inspect</h1>
                        <div className="subtitle">Система распознавания трещин в слитках • Личный кабинет</div>
                    </div>
                </div>
                
                <div className="nav-buttons">
                    <a href="/dashboard" className="nav-btn">
                        <i className="fas fa-tachometer-alt"></i> Главный экран
                    </a>
                    <a href="/ai-panel" className="nav-btn">
                        <i className="fas fa-chart-pie"></i> Статистика
                    </a>
                    <a href="/journal" className="nav-btn">
                        <i className="fas fa-history"></i> Мои действия
                    </a>
                    <a href="/account" className="nav-btn active">
                        <i className="fas fa-user"></i> Личный кабинет
                    </a>
                </div>
                
                <div className="user-info">
                    <div className="user-avatar">
                        <i className="fas fa-user"></i>
                    </div>
                    <div>
                        <div className="user-name">{profile.name}</div>
                        <div className="user-role">Оператор контроля качества • Смена #3</div>
                    </div>
                </div>
            </div>
            
            {/* Основное содержимое */}
            <div className="main-content">
                {/* Боковая панель профиля */}
                <div className="profile-sidebar">
                    {/* Карточка профиля */}
                    <div className="profile-card">
                        <div className="profile-header">
                            <div className="avatar-status">
                                <div 
                                    className="profile-avatar"
                                    onClick={toggleStatus}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="fas fa-user-tie"></i>
                                </div>
                                <div className={`status-indicator status-${profile.avatarStatus}`}></div>
                            </div>
                            <div className="profile-name">{profile.shortName}</div>
                            <div className="profile-role">{profile.role}</div>
                            <div className="profile-status">{profile.status}</div>
                        </div>
                        <div className="profile-details">
                            <div className="detail-row">
                                <div className="detail-label">
                                    <i className="fas fa-id-badge"></i>
                                    <span>Табельный номер:</span>
                                </div>
                                <div className="detail-value">{profile.employeeId}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">
                                    <i className="fas fa-building"></i>
                                    <span>Подразделение:</span>
                                </div>
                                <div className="detail-value">{profile.department}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">
                                    <i className="fas fa-user-clock"></i>
                                    <span>Смена:</span>
                                </div>
                                <div className="detail-value">{profile.shift}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">
                                    <i className="fas fa-calendar-alt"></i>
                                    <span>В компании:</span>
                                </div>
                                <div className="detail-value">{profile.tenure}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">
                                    <i className="fas fa-envelope"></i>
                                    <span>Email:</span>
                                </div>
                                <div 
                                    className="detail-value editable"
                                    onDoubleClick={(e) => {
                                        e.currentTarget.contentEditable = true;
                                        e.currentTarget.focus();
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.contentEditable = false;
                                        updateProfileField('email', e.currentTarget.textContent);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                        }
                                    }}
                                >
                                    {profile.email}
                                </div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">
                                    <i className="fas fa-phone"></i>
                                    <span>Телефон:</span>
                                </div>
                                <div 
                                    className="detail-value editable"
                                    onDoubleClick={(e) => {
                                        e.currentTarget.contentEditable = true;
                                        e.currentTarget.focus();
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.contentEditable = false;
                                        updateProfileField('phone', e.currentTarget.textContent);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                        }
                                    }}
                                >
                                    {profile.phone}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Быстрые действия */}
                    <div className="quick-actions">
                        <div className="actions-header">
                            <h2><i className="fas fa-bolt"></i> Быстрые действия</h2>
                        </div>
                        <div className="actions-content">
                            {quickActions.map(action => (
                                <a 
                                    key={action.id}
                                    href="#" 
                                    className="action-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleQuickAction(action.id);
                                    }}
                                >
                                    <div className="action-icon">
                                        <i className={action.icon}></i>
                                    </div>
                                    <div className="action-label">{action.label}</div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Основная панель кабинета */}
                <div className="dashboard-main">
                    {/* Приветственная панель */}
                    <div className="welcome-panel">
                        <div className="welcome-header">
                            <div className="welcome-title">
                                <i className="fas fa-hand-sparkles"></i>
                                Добро пожаловать, Алексей!
                            </div>
                            <div className="welcome-message">
                                Ваша текущая смена началась в 14:00. За сегодня вы проверили {welcomeStats.checkedToday} слитков и обнаружили {welcomeStats.defectsToday} дефект. 
                                Продолжайте в том же духе!
                            </div>
                        </div>
                        <div className="welcome-stats">
                            <div className="welcome-stat">
                                <div className="stat-number">{welcomeStats.checkedToday}</div>
                                <div className="stat-text">Проверено сегодня</div>
                            </div>
                            <div className="welcome-stat">
                                <div className="stat-number">{welcomeStats.defectsToday}</div>
                                <div className="stat-text">Дефектов обнаружено</div>
                            </div>
                            <div className="welcome-stat">
                                <div className="stat-number">{welcomeStats.timeLeft}</div>
                                <div className="stat-text">Осталось до конца смены</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Основные разделы кабинета */}
                    <div className="dashboard-sections">
                        {/* Мои задачи */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2><i className="fas fa-tasks"></i> Мои задачи</h2>
                                <a href="#" className="section-link">Все задачи →</a>
                            </div>
                            <div className="section-content">
                                <div className="tasks-list">
                                    {tasks.filter(task => !task.completed).map(task => (
                                        <div 
                                            key={task.id}
                                            className={`task-item task-${task.priority}`}
                                            style={{ 
                                                opacity: task.completed ? 0.5 : 1,
                                                display: task.completed ? 'none' : 'block'
                                            }}
                                        >
                                            <div className="task-header">
                                                <div className="task-title">{task.title}</div>
                                                <div 
                                                    className="task-priority"
                                                    style={{ color: getTaskPriorityColor(task.priority) }}
                                                >
                                                    {getTaskPriorityText(task.priority)}
                                                </div>
                                            </div>
                                            <div className="task-description">
                                                {task.description}
                                            </div>
                                            <div className="task-footer">
                                                <div className="task-date">{task.dueDate}</div>
                                                <div className="task-actions">
                                                    <button 
                                                        className="task-btn"
                                                        onClick={() => completeTask(task.id)}
                                                    >
                                                        Выполнено
                                                    </button>
                                                    <button 
                                                        className="task-btn"
                                                        onClick={() => deferTask(task.id)}
                                                    >
                                                        Отложить
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {tasks.every(task => task.completed) && (
                                        <div style={{ 
                                            textAlign: 'center', 
                                            padding: '30px', 
                                            color: '#8fb4d9',
                                            fontStyle: 'italic' 
                                        }}>
                                            <i className="fas fa-check-circle" style={{ fontSize: '2rem', marginBottom: '15px', display: 'block', color: '#4CAF50' }}></i>
                                            Все задачи выполнены! Отличная работа!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* График работы */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2><i className="fas fa-calendar-alt"></i> Мой график</h2>
                                <a href="#" className="section-link">Полный график →</a>
                            </div>
                            <div className="section-content">
                                <div style={{ color: '#b0c4de', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                        <i className="fas fa-user-clock" style={{ color: '#4dabf7' }}></i>
                                        <span>Текущая неделя (12-18 июня)</span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem' }}>
                                        Смена #3 (14:00-22:00), выходной: воскресенье
                                    </div>
                                </div>
                                
                                <div className="schedule-container">
                                    <div className="schedule-grid">
                                        {schedule.map((day, index) => (
                                            <div 
                                                key={index}
                                                style={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    alignItems: 'center',
                                                    flex: '1'
                                                }}
                                                onClick={() => showDayDetails(index, day.day, day.hours)}
                                            >
                                                <div 
                                                    className="schedule-bar"
                                                    style={{ 
                                                        height: `${day.hours * 20}px`,
                                                        backgroundColor: day.current 
                                                            ? 'rgba(77, 171, 247, 0.7)' 
                                                            : day.hours > 0 
                                                                ? 'rgba(60, 120, 180, 0.5)' 
                                                                : 'rgba(40, 60, 85, 0.5)',
                                                        boxShadow: day.current ? '0 0 10px rgba(77, 171, 247, 0.5)' : 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-20px',
                                                        left: 0,
                                                        width: '100%',
                                                        textAlign: 'center',
                                                        color: day.hours > 0 ? '#4dabf7' : '#8fb4d9',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {day.hours > 0 ? `${day.hours}ч` : 'Вых'}
                                                    </div>
                                                </div>
                                                <div className="schedule-label">
                                                    {day.day}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div style={{ marginTop: '25px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ color: '#b0c4de' }}>Отработано в этом месяце:</span>
                                        <span style={{ color: '#4dabf7', fontWeight: '600' }}>112 часов</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ color: '#b0c4de' }}>Осталось отпускных дней:</span>
                                        <span style={{ color: '#4CAF50', fontWeight: '600' }}>14 дней</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#b0c4de' }}>Следующий выходной:</span>
                                        <span style={{ color: '#ff9800', fontWeight: '600' }}>18 июня (воскресенье)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Моя статистика */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2><i className="fas fa-chart-line"></i> Моя статистика</h2>
                                <a href="#" className="section-link">Подробнее →</a>
                            </div>
                            <div className="section-content">
                                <div className="personal-stats">
                                    <div className="personal-stat">
                                        <div className="personal-value">{personalStats.accuracy.toFixed(1)}%</div>
                                        <div className="personal-label">Точность обнаружения</div>
                                        <div style={{ color: '#4CAF50', fontSize: '0.85rem', marginTop: '5px' }}>
                                            <i className="fas fa-arrow-up"></i> +0.5% за месяц
                                        </div>
                                    </div>
                                    
                                    <div className="personal-stat">
                                        <div className="personal-value">{personalStats.checkedTotal.toLocaleString()}</div>
                                        <div className="personal-label">Проверено слитков</div>
                                        <div style={{ color: '#4CAF50', fontSize: '0.85rem', marginTop: '5px' }}>
                                            <i className="fas fa-arrow-up"></i> +127 за неделю
                                        </div>
                                    </div>
                                    
                                    <div className="personal-stat">
                                        <div className="personal-value">{personalStats.defectsFound}</div>
                                        <div className="personal-label">Обнаружено дефектов</div>
                                        <div style={{ color: '#f44336', fontSize: '0.85rem', marginTop: '5px' }}>
                                            <i className="fas fa-arrow-down"></i> -3 за месяц
                                        </div>
                                    </div>
                                    
                                    <div className="personal-stat">
                                        <div className="personal-value">{personalStats.rating.toFixed(1)}</div>
                                        <div className="personal-label">Средний рейтинг</div>
                                        <div style={{ color: '#ff9800', fontSize: '0.85rem', marginTop: '5px' }}>
                                            <i className="fas fa-star"></i> из 5
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ marginTop: '25px' }}>
                                    <div style={{ color: '#b0c4de', marginBottom: '10px' }}>
                                        <i className="fas fa-award" style={{ color: '#FFD700', marginRight: '8px' }}></i>
                                        <span>Достижения за этот месяц:</span>
                                    </div>
                                    <div className="badges-container">
                                        {achievements.map((achievement, index) => (
                                            <div 
                                                key={index}
                                                className={`badge ${getAchievementClass(achievement.type)}`}
                                                title={`${achievement.type.charAt(0).toUpperCase() + achievement.type.slice(1)} ${achievement.name}`}
                                            >
                                                <i 
                                                    className={achievement.icon} 
                                                    style={{ fontSize: '1.2rem', marginBottom: '5px' }}
                                                ></i>
                                                <span>{achievement.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Обучение и уведомления */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2><i className="fas fa-bell"></i> Уведомления и обучение</h2>
                                <a href="#" className="section-link">Все уведомления →</a>
                            </div>
                            <div className="section-content">
                                <div className="notifications-list">
                                    {notifications.map(notif => (
                                        <div 
                                            key={notif.id}
                                            className={`notification-item ${!notif.read ? 'unread' : ''}`}
                                            onClick={() => {
                                                setNotifications(prev => prev.map(n => 
                                                    n.id === notif.id ? { ...n, read: true } : n
                                                ));
                                            }}
                                        >
                                            <div className="notification-icon">
                                                <i className={notif.icon}></i>
                                            </div>
                                            <div className="notification-info">
                                                <div className="notification-title">{notif.title}</div>
                                                <div className="notification-message">
                                                    {notif.message}
                                                </div>
                                                <div className="notification-time">{notif.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div style={{ marginTop: '25px' }}>
                                    <div className="section-header" style={{ background: 'none', padding: 0, borderBottom: '1px solid rgba(60, 120, 180, 0.2)', marginBottom: '15px' }}>
                                        <h2 style={{ fontSize: '1.1rem' }}><i className="fas fa-certificate"></i> Мои сертификаты</h2>
                                    </div>
                                    
                                    <div className="certificates-list">
                                        {certificates.map(cert => (
                                            <div key={cert.id} className="certificate-item">
                                                <div className="certificate-icon">
                                                    <i className={cert.icon}></i>
                                                </div>
                                                <div className="certificate-info">
                                                    <div className="certificate-name">{cert.name}</div>
                                                    <div className="certificate-details">
                                                        Выдан: {cert.issued} • Действует до: {cert.validUntil}
                                                    </div>
                                                    <div 
                                                        className={`certificate-status status-${cert.status}`}
                                                        style={{ color: getCertificateStatusColor(cert.status) }}
                                                    >
                                                        {getCertificateStatusText(cert.status)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
     

        {/* Модальное окно начала смены */}
        {shiftModalOpen && (
            <div className="modal-overlay" onClick={() => setShiftModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3><i className="fas fa-play-circle"></i> Начало смены</h3>
                        <button 
                            className="close-modal"
                            onClick={() => setShiftModalOpen(false)}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="modal-body">
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <i className="fas fa-user-check" style={{ fontSize: '3rem', color: '#4dabf7', marginBottom: '20px' }}></i>
                            <h3 style={{ color: '#e0e0e0', marginBottom: '15px' }}>Подтверждение начала смены</h3>
                            <p style={{ color: '#b0c4de', marginBottom: '25px' }}>
                                Вы собираетесь начать смену #3 (14:00-22:00).<br />
                                Пожалуйста, проверьте готовность оборудования.
                            </p>
                            
                            <div style={{ backgroundColor: 'rgba(30, 45, 65, 0.6)', borderRadius: '8px', padding: '20px', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#b0c4de' }}>Смена:</span>
                                    <span style={{ color: '#4dabf7', fontWeight: '600' }}>#3 (вечерняя)</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#b0c4de' }}>Время:</span>
                                    <span style={{ color: '#4dabf7', fontWeight: '600' }}>14:00 - 22:00</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#b0c4de' }}>Дата:</span>
                                    <span style={{ color: '#4dabf7', fontWeight: '600' }}>15 июня 2023</span>
                                </div>
                            </div>
                            
                            <div style={{ color: '#8fb4d9', fontSize: '0.9rem', marginBottom: '25px' }}>
                                После начала смены система начнет отсчет рабочего времени.
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '20px', borderTop: '1px solid rgba(60, 120, 180, 0.2)', display: 'flex', gap: '15px' }}>
                        <button 
                            className="settings-btn secondary"
                            onClick={() => setShiftModalOpen(false)}
                        >
                            Отмена
                        </button>
                        <button 
                            className="settings-btn primary"
                            onClick={confirmShift}
                        >
                            Начать смену
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};

export default Account;