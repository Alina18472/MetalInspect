// AdminAccount.js
import React, { useState, useEffect } from 'react';
import TopNav from "../components/TopNav";
import "../styles/admin_account.css";

const AdminAccount = () => {
    // Состояние профиля админа
    const [profile, setProfile] = useState({
        name: 'Петров Дмитрий Иванович',
        shortName: 'Петров Д.И.',
        role: 'Администратор системы',
        status: 'В сети',
        employeeId: '#ADM-001',
        department: 'ИТ отдел',
        email: 'd.petrov@metalinspect.ru',
        phone: '+7 (912) 876-54-32',
        avatarStatus: 'online'
    });

    // Состояние пользователей
    const [users, setUsers] = useState([
        {
            id: 1,
            lastname: 'Иванов',
            name: 'Алексей',
            middlename: 'Сергеевич',
            email: 'a.ivanov@metalinspect.ru',
            phone: '+7 (912) 345-67-89',
            role: 'Инженер',
            is_active: true,
            created_at: '2023-01-15'
        },
        {
            id: 2,
            lastname: 'Смирнова',
            name: 'Ольга',
            middlename: 'Петровна',
            email: 'o.smirnova@metalinspect.ru',
            phone: '+7 (912) 234-56-78',
            role: 'Инженер',
            is_active: true,
            created_at: '2023-02-20'
        },
        {
            id: 3,
            lastname: 'Кузнецов',
            name: 'Михаил',
            middlename: 'Александрович',
            email: 'm.kuznetsov@metalinspect.ru',
            phone: '+7 (912) 456-78-90',
            role: 'Админ',
            is_active: false,
            created_at: '2023-03-10'
        },
        {
            id: 4,
            lastname: 'Соколова',
            name: 'Елена',
            middlename: 'Владимировна',
            email: 'e.sokolova@metalinspect.ru',
            phone: '+7 (912) 567-89-01',
            role: 'Инженер',
            is_active: true,
            created_at: '2023-04-05'
        }
    ]);

    // Состояние для формы создания/редактирования
    const [formData, setFormData] = useState({
        id: null,
        lastname: '',
        name: '',
        middlename: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'Инженер',
        is_active: true
    });

    // Состояние модальных окон
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' или 'edit'
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [notification, setNotification] = useState(null);

    // Статистика системы
    const [systemStats, setSystemStats] = useState({
        totalUsers: 4,
        activeUsers: 3,
        engineers: 3,
        admins: 1,
        newThisMonth: 1
    });

    // Поиск и фильтры
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Эффект для обновления статистики при изменении пользователей
    useEffect(() => {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.is_active).length;
        const engineers = users.filter(u => u.role === 'Инженер').length;
        const admins = users.filter(u => u.role === 'Админ').length;
        
        const thisMonth = new Date().getMonth();
        const newThisMonth = users.filter(u => {
            const createdMonth = new Date(u.created_at).getMonth();
            return createdMonth === thisMonth;
        }).length;

        setSystemStats({
            totalUsers,
            activeUsers,
            engineers,
            admins,
            newThisMonth
        });
    }, [users]);

    // Эффект для добавления класса странице
    useEffect(() => {
        document.body.classList.add("admin-account-page");
        return () => document.body.classList.remove("admin-account-page");
    }, []);

    // Функция отображения уведомлений
    const showNotification = (message, type) => {
        setNotification({ message, type, show: true });
        setTimeout(() => {
            setNotification(prev => prev ? { ...prev, show: false } : null);
            setTimeout(() => setNotification(null), 300);
        }, 3000);
    };

    // Открытие модального окна для создания пользователя
    const openCreateModal = () => {
        setFormData({
            id: null,
            lastname: '',
            name: '',
            middlename: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            role: 'Инженер',
            is_active: true
        });
        setModalMode('create');
        setModalOpen(true);
    };

    // Открытие модального окна для редактирования пользователя
    const openEditModal = (user) => {
        setFormData({
            id: user.id,
            lastname: user.lastname,
            name: user.name,
            middlename: user.middlename,
            email: user.email,
            phone: user.phone,
            password: '', // Пароль оставляем пустым для редактирования
            confirmPassword: '',
            role: user.role,
            is_active: user.is_active
        });
        setModalMode('edit');
        setModalOpen(true);
    };

    // Подтверждение удаления пользователя
    const confirmDeleteUser = (user) => {
        setUserToDelete(user);
        setDeleteConfirmOpen(true);
    };

    // Удаление пользователя
    const deleteUser = () => {
        if (userToDelete) {
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            showNotification(`Пользователь ${userToDelete.lastname} ${userToDelete.name} удален`, 'success');
            setDeleteConfirmOpen(false);
            setUserToDelete(null);
        }
    };

    // Обработка отправки формы
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Валидация
        if (modalMode === 'create' && formData.password !== formData.confirmPassword) {
            showNotification('Пароли не совпадают', 'error');
            return;
        }
        
        if (modalMode === 'create' && !formData.password) {
            showNotification('Введите пароль', 'error');
            return;
        }
        
        if (!formData.email || !formData.name || !formData.lastname) {
            showNotification('Заполните обязательные поля', 'error');
            return;
        }
        
        if (modalMode === 'create') {
            // Создание нового пользователя
            const newUser = {
                id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                lastname: formData.lastname,
                name: formData.name,
                middlename: formData.middlename,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                is_active: formData.is_active,
                created_at: new Date().toISOString().split('T')[0]
            };
            
            setUsers(prev => [...prev, newUser]);
            showNotification(`Пользователь ${formData.lastname} ${formData.name} создан`, 'success');
        } else {
            // Редактирование существующего пользователя
            setUsers(prev => prev.map(u => 
                u.id === formData.id ? {
                    ...u,
                    lastname: formData.lastname,
                    name: formData.name,
                    middlename: formData.middlename,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.role,
                    is_active: formData.is_active
                } : u
            ));
            showNotification(`Данные пользователя ${formData.lastname} ${formData.name} обновлены`, 'success');
        }
        
        setModalOpen(false);
    };

    // Переключение статуса пользователя
    const toggleUserStatus = (userId) => {
        setUsers(prev => prev.map(user => 
            user.id === userId ? { ...user, is_active: !user.is_active } : user
        ));
        
        const user = users.find(u => u.id === userId);
        const newStatus = !user.is_active ? 'активирован' : 'деактивирован';
        showNotification(`Пользователь ${user.lastname} ${user.name} ${newStatus}`, 'info');
    };

    // Копирование email в буфер обмена
    const copyEmail = (email) => {
        navigator.clipboard.writeText(email);
        showNotification('Email скопирован в буфер обмена', 'info');
    };

    // Фильтрация пользователей
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' || 
            user.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm);
        
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || 
            (statusFilter === 'active' && user.is_active) ||
            (statusFilter === 'inactive' && !user.is_active);
        
        return matchesSearch && matchesRole && matchesStatus;
    });

    // Обновление полей формы
    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Сброс фильтров
    const resetFilters = () => {
        setSearchTerm('');
        setRoleFilter('all');
        setStatusFilter('all');
    };

    return (
        <div className="admin-account-container">
            {/* Уведомление */}
            {notification && (
                <div className={`admin-notification ${notification.type} ${notification.show ? 'show' : ''}`}>
                    <i className={`fas ${
                        notification.type === 'success' ? 'fa-check-circle' : 
                        notification.type === 'error' ? 'fa-exclamation-circle' : 
                        'fa-info-circle'
                    }`}></i>
                    <div className="admin-notification-message">{notification.message}</div>
                </div>
            )}

            {/* Шапка */}
            <TopNav
                subtitle="Система распознавания трещин в слитках • Админ-панель"
                userName={profile.name}
                userRole="Администратор"
            />
                            
            {/* Основное содержимое */}
            <div className="admin-main-content">
                {/* Боковая панель профиля */}
                <div className="admin-profile-sidebar">
                    {/* Карточка профиля */}
                    <div className="admin-profile-card">
                        <div className="admin-profile-header">
                            <div className="admin-avatar-wrapper">
                                <div className="admin-profile-avatar">
                                    <i className="fas fa-user-shield"></i>
                                </div>
                                <div className={`admin-status-indicator admin-status-${profile.avatarStatus}`}></div>
                            </div>
                            <div className="admin-profile-name">{profile.shortName}</div>
                            <div className="admin-profile-role">{profile.role}</div>
                            <div className="admin-profile-status">Супер-администратор</div>
                        </div>
                        <div className="admin-profile-details">
                            <div className="admin-detail-row">
                                <div className="admin-detail-label">
                                    <i className="fas fa-id-badge"></i>
                                    <span>ID администратора:</span>
                                </div>
                                <div className="admin-detail-value">{profile.employeeId}</div>
                            </div>
                            <div className="admin-detail-row">
                                <div className="admin-detail-label">
                                    <i className="fas fa-building"></i>
                                    <span>Подразделение:</span>
                                </div>
                                <div className="admin-detail-value">{profile.department}</div>
                            </div>
                            <div className="admin-detail-row">
                                <div className="admin-detail-label">
                                    <i className="fas fa-envelope"></i>
                                    <span>Email:</span>
                                </div>
                                <div className="admin-detail-value">{profile.email}</div>
                            </div>
                            <div className="admin-detail-row">
                                <div className="admin-detail-label">
                                    <i className="fas fa-phone"></i>
                                    <span>Телефон:</span>
                                </div>
                                <div className="admin-detail-value">{profile.phone}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Статистика системы */}
                    <div className="admin-system-stats">
                        <div className="admin-stats-header">
                            <h2><i className="fas fa-chart-pie"></i> Статистика системы</h2>
                        </div>
                        <div className="admin-stats-grid">
                            <div className="admin-stat-item">
                                <div className="admin-stat-icon" style={{ background: 'linear-gradient(135deg, #4dabf7, #2a6bc0)' }}>
                                    <i className="fas fa-users"></i>
                                </div>
                                <div className="admin-stat-info">
                                    <div className="admin-stat-number">{systemStats.totalUsers}</div>
                                    <div className="admin-stat-label">Всего пользователей</div>
                                </div>
                            </div>
                            <div className="admin-stat-item">
                                <div className="admin-stat-icon" style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
                                    <i className="fas fa-user-check"></i>
                                </div>
                                <div className="admin-stat-info">
                                    <div className="admin-stat-number">{systemStats.activeUsers}</div>
                                    <div className="admin-stat-label">Активных</div>
                                </div>
                            </div>
                            <div className="admin-stat-item">
                                <div className="admin-stat-icon" style={{ background: 'linear-gradient(135deg, #9C27B0, #6A1B9A)' }}>
                                    <i className="fas fa-user-cog"></i>
                                </div>
                                <div className="admin-stat-info">
                                    <div className="admin-stat-number">{systemStats.engineers}</div>
                                    <div className="admin-stat-label">Инженеров</div>
                                </div>
                            </div>
                            <div className="admin-stat-item">
                                <div className="admin-stat-icon" style={{ background: 'linear-gradient(135deg, #FF9800, #EF6C00)' }}>
                                    <i className="fas fa-user-shield"></i>
                                </div>
                                <div className="admin-stat-info">
                                    <div className="admin-stat-number">{systemStats.admins}</div>
                                    <div className="admin-stat-label">Администраторов</div>
                                </div>
                            </div>
                            <div className="admin-stat-item">
                                <div className="admin-stat-icon" style={{ background: 'linear-gradient(135deg, #00BCD4, #00838F)' }}>
                                    <i className="fas fa-user-plus"></i>
                                </div>
                                <div className="admin-stat-info">
                                    <div className="admin-stat-number">{systemStats.newThisMonth}</div>
                                    <div className="admin-stat-label">Новых за месяц</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Основная панель управления */}
                <div className="admin-management-panel">
                    {/* Заголовок с кнопками */}
                    <div className="admin-management-header">
                        <div className="admin-header-title">
                            <h1><i className="fas fa-users-cog"></i> Управление пользователями</h1>
                            <p className="admin-header-subtitle">
                                Создание, редактирование и удаление учетных записей сотрудников
                            </p>
                        </div>
                        <div className="admin-header-actions">
                            <button 
                                className="admin-action-button admin-action-primary"
                                onClick={openCreateModal}
                            >
                                <i className="fas fa-user-plus"></i>
                                Добавить пользователя
                            </button>
                            <button 
                                className="admin-action-button admin-action-secondary"
                                onClick={resetFilters}
                            >
                                <i className="fas fa-filter"></i>
                                Сбросить фильтры
                            </button>
                        </div>
                    </div>
                    
                    {/* Панель поиска и фильтров */}
                    <div className="admin-filters-panel">
                        <div className="admin-search-container">
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                placeholder="Поиск по ФИО, email или телефону..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="admin-search-input"
                            />
                            {searchTerm && (
                                <button 
                                    className="admin-search-clear"
                                    onClick={() => setSearchTerm('')}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>
                        
                        <div className="admin-filters-container">
                            <div className="admin-filter-group">
                                <label className="admin-filter-label">
                                    <i className="fas fa-user-tag"></i>
                                    Роль:
                                </label>
                                <select 
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="admin-filter-select"
                                >
                                    <option value="all">Все роли</option>
                                    <option value="Инженер">Инженер</option>
                                    <option value="Админ">Администратор</option>
                                </select>
                            </div>
                            
                            <div className="admin-filter-group">
                                <label className="admin-filter-label">
                                    <i className="fas fa-user-clock"></i>
                                    Статус:
                                </label>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="admin-filter-select"
                                >
                                    <option value="all">Все статусы</option>
                                    <option value="active">Активные</option>
                                    <option value="inactive">Неактивные</option>
                                </select>
                            </div>
                            
                            <div className="admin-filter-stats">
                                <span className="admin-filter-stat">
                                    <i className="fas fa-file-alt"></i>
                                    Найдено: {filteredUsers.length} из {users.length}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Таблица пользователей */}
                    <div className="admin-users-table-container">
                        <div className="admin-users-table">
                            <div className="admin-table-header">
                                <div className="admin-table-cell admin-cell-small">ID</div>
                                <div className="admin-table-cell">ФИО</div>
                                <div className="admin-table-cell">Контакт</div>
                                <div className="admin-table-cell admin-cell-medium">Роль</div>
                                <div className="admin-table-cell admin-cell-medium">Статус</div>
                                <div className="admin-table-cell admin-cell-large">Дата создания</div>
                                <div className="admin-table-cell admin-cell-large">Действия</div>
                            </div>
                            
                            <div className="admin-table-body">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <div 
                                            key={user.id} 
                                            className={`admin-table-row ${!user.is_active ? 'admin-row-inactive' : ''}`}
                                        >
                                            <div className="admin-table-cell admin-cell-small">
                                                <span className="admin-user-id">#{user.id}</span>
                                            </div>
                                            <div className="admin-table-cell">
                                                <div className="admin-user-name">
                                                    <div className="admin-user-fullname">
                                                        {user.lastname} {user.name} {user.middlename}
                                                    </div>
                                                    <div className="admin-user-initials">
                                                        {user.lastname} {user.name.charAt(0)}.{user.middlename.charAt(0)}.
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="admin-table-cell">
                                                <div className="admin-user-contact">
                                                    <div 
                                                        className="admin-user-email"
                                                        onClick={() => copyEmail(user.email)}
                                                        title="Кликните для копирования"
                                                    >
                                                        <i className="fas fa-envelope"></i>
                                                        {user.email}
                                                    </div>
                                                    <div className="admin-user-phone">
                                                        <i className="fas fa-phone"></i>
                                                        {user.phone}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="admin-table-cell admin-cell-medium">
                                                <div className={`admin-user-role admin-role-${user.role === 'Админ' ? 'admin' : 'engineer'}`}>
                                                    <i className={user.role === 'Админ' ? 'fas fa-user-shield' : 'fas fa-user-cog'}></i>
                                                    {user.role}
                                                </div>
                                            </div>
                                            <div className="admin-table-cell admin-cell-medium">
                                                <div 
                                                    className={`admin-user-status ${user.is_active ? 'admin-status-active' : 'admin-status-inactive'}`}
                                                    onClick={() => toggleUserStatus(user.id)}
                                                >
                                                    <div className="admin-status-indicator-small"></div>
                                                    {user.is_active ? 'Активен' : 'Неактивен'}
                                                </div>
                                            </div>
                                            <div className="admin-table-cell admin-cell-large">
                                                <div className="admin-user-date">
                                                    <i className="fas fa-calendar-alt"></i>
                                                    {user.created_at}
                                                </div>
                                            </div>
                                            <div className="admin-table-cell admin-cell-large">
                                                <div className="admin-user-actions">
                                                    <button 
                                                        className="admin-action-icon admin-action-edit"
                                                        onClick={() => openEditModal(user)}
                                                        title="Редактировать"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        className="admin-action-icon admin-action-delete"
                                                        onClick={() => confirmDeleteUser(user)}
                                                        title="Удалить"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                    <button 
                                                        className="admin-action-icon admin-action-reset"
                                                        title="Сбросить пароль"
                                                    >
                                                        <i className="fas fa-key"></i>
                                                    </button>
                                                    <button 
                                                        className="admin-action-icon admin-action-view"
                                                        title="Просмотр"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="admin-table-empty">
                                        <div className="admin-empty-state">
                                            <i className="fas fa-users-slash"></i>
                                            <h3>Пользователи не найдены</h3>
                                            <p>Попробуйте изменить параметры поиска или добавьте нового пользователя</p>
                                            <button 
                                                className="admin-action-button admin-action-primary"
                                                onClick={openCreateModal}
                                            >
                                                <i className="fas fa-user-plus"></i>
                                                Добавить пользователя
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно создания/редактирования пользователя */}
            <div className={`admin-modal-overlay ${modalOpen ? 'show' : ''}`} onClick={() => setModalOpen(false)}>
                <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
                    <div className="admin-modal-header">
                        <h3>
                            <i className={`fas ${modalMode === 'create' ? 'fa-user-plus' : 'fa-user-edit'}`}></i>
                            {modalMode === 'create' ? 'Создание нового пользователя' : 'Редактирование пользователя'}
                        </h3>
                        <button 
                            className="admin-modal-close"
                            onClick={() => setModalOpen(false)}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="admin-modal-body">
                        <form onSubmit={handleSubmit} className="admin-user-form">
                            <div className="admin-form-section">
                                <h4 className="admin-form-section-title">
                                    <i className="fas fa-id-card"></i>
                                    Личные данные
                                </h4>
                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">
                                            Фамилия *
                                            <input
                                                type="text"
                                                value={formData.lastname}
                                                onChange={(e) => handleFormChange('lastname', e.target.value)}
                                                className="admin-form-input"
                                                placeholder="Иванов"
                                                required
                                            />
                                        </label>
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">
                                            Имя *
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleFormChange('name', e.target.value)}
                                                className="admin-form-input"
                                                placeholder="Алексей"
                                                required
                                            />
                                        </label>
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">
                                            Отчество
                                            <input
                                                type="text"
                                                value={formData.middlename}
                                                onChange={(e) => handleFormChange('middlename', e.target.value)}
                                                className="admin-form-input"
                                                placeholder="Сергеевич"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="admin-form-section">
                                <h4 className="admin-form-section-title">
                                    <i className="fas fa-address-book"></i>
                                    Контактная информация
                                </h4>
                                <div className="admin-form-row">
                                    <div className="admin-form-group admin-form-full">
                                        <label className="admin-form-label">
                                            Email *
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleFormChange('email', e.target.value)}
                                                className="admin-form-input"
                                                placeholder="user@metalinspect.ru"
                                                required
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="admin-form-row">
                                    <div className="admin-form-group admin-form-full">
                                        <label className="admin-form-label">
                                            Телефон
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleFormChange('phone', e.target.value)}
                                                className="admin-form-input"
                                                placeholder="+7 (XXX) XXX-XX-XX"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            {modalMode === 'create' && (
                                <div className="admin-form-section">
                                    <h4 className="admin-form-section-title">
                                        <i className="fas fa-key"></i>
                                        Безопасность
                                    </h4>
                                    <div className="admin-form-row">
                                        <div className="admin-form-group">
                                            <label className="admin-form-label">
                                                Пароль *
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => handleFormChange('password', e.target.value)}
                                                    className="admin-form-input"
                                                    placeholder="Минимум 8 символов"
                                                    minLength="8"
                                                    required={modalMode === 'create'}
                                                />
                                            </label>
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="admin-form-label">
                                                Подтверждение пароля *
                                                <input
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                                                    className="admin-form-input"
                                                    placeholder="Повторите пароль"
                                                    minLength="8"
                                                    required={modalMode === 'create'}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="admin-form-section">
                                <h4 className="admin-form-section-title">
                                    <i className="fas fa-cog"></i>
                                    Настройки доступа
                                </h4>
                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">
                                            Роль пользователя
                                            <select
                                                value={formData.role}
                                                onChange={(e) => handleFormChange('role', e.target.value)}
                                                className="admin-form-select"
                                            >
                                                <option value="Инженер">Инженер</option>
                                                <option value="Админ">Администратор</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">
                                            Статус аккаунта
                                            <div className="admin-form-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_active}
                                                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                                    id="is_active"
                                                />
                                                <label htmlFor="is_active" className="admin-checkbox-label">
                                                    <div className="admin-checkbox-custom"></div>
                                                    <span>Активный</span>
                                                </label>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="admin-form-note">
                                <i className="fas fa-info-circle"></i>
                                <span>Поля, отмеченные * являются обязательными для заполнения</span>
                            </div>
                        </form>
                    </div>
                    <div className="admin-modal-footer">
                        <button 
                            className="admin-modal-button admin-modal-secondary"
                            onClick={() => setModalOpen(false)}
                        >
                            <i className="fas fa-times"></i>
                            Отмена
                        </button>
                        <button 
                            className="admin-modal-button admin-modal-primary"
                            onClick={handleSubmit}
                        >
                            <i className={`fas ${modalMode === 'create' ? 'fa-save' : 'fa-check'}`}></i>
                            {modalMode === 'create' ? 'Создать пользователя' : 'Сохранить изменения'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Модальное окно подтверждения удаления */}
            <div className={`admin-modal-overlay ${deleteConfirmOpen ? 'show' : ''}`} onClick={() => setDeleteConfirmOpen(false)}>
                <div className="admin-modal-content admin-modal-small" onClick={e => e.stopPropagation()}>
                    <div className="admin-modal-header">
                        <h3>
                            <i className="fas fa-exclamation-triangle"></i>
                            Подтверждение удаления
                        </h3>
                        <button 
                            className="admin-modal-close"
                            onClick={() => setDeleteConfirmOpen(false)}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="admin-modal-body">
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <i className="fas fa-trash-alt" style={{ fontSize: '3rem', color: '#f44336', marginBottom: '20px' }}></i>
                            <h3 style={{ color: '#e0e0e0', marginBottom: '15px' }}>Вы уверены?</h3>
                            <p style={{ color: '#b0c4de', marginBottom: '25px', lineHeight: 1.5 }}>
                                Вы собираетесь удалить пользователя:<br />
                                <strong style={{ color: '#e0e0e0' }}>
                                    {userToDelete?.lastname} {userToDelete?.name} {userToDelete?.middlename}
                                </strong><br />
                                <span style={{ color: '#8fb4d9' }}>{userToDelete?.email}</span>
                            </p>
                            <p style={{ color: '#ff9800', fontSize: '0.9rem', padding: '15px', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px' }}>
                                <i className="fas fa-exclamation-circle"></i>
                                Это действие нельзя отменить. Все данные пользователя будут удалены без возможности восстановления.
                            </p>
                        </div>
                    </div>
                    <div className="admin-modal-footer">
                        <button 
                            className="admin-modal-button admin-modal-secondary"
                            onClick={() => setDeleteConfirmOpen(false)}
                        >
                            <i className="fas fa-times"></i>
                            Отмена
                        </button>
                        <button 
                            className="admin-modal-button admin-modal-danger"
                            onClick={deleteUser}
                        >
                            <i className="fas fa-trash-alt"></i>
                            Удалить пользователя
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAccount;