// Генерация графика рабочего времени
function generateSchedule() {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';
    
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const hours = [8, 6, 8, 8, 8, 4, 0]; // Часы работы по дням
    
    days.forEach((day, index) => {
        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column';
        barContainer.style.alignItems = 'center';
        barContainer.style.flex = '1';
        
        const bar = document.createElement('div');
        bar.className = 'schedule-bar';
        
        // Высота бара в зависимости от рабочих часов
        const height = hours[index] * 20; // 20px за час
        bar.style.height = `${height}px`;
        
        // Подсветка текущего дня
        const today = new Date().getDay();
        const adjustedToday = today === 0 ? 6 : today - 1; // Преобразование воскресенья
        
        if (index === adjustedToday) {
            bar.style.backgroundColor = 'rgba(77, 171, 247, 0.7)';
            bar.style.boxShadow = '0 0 10px rgba(77, 171, 247, 0.5)';
        }
        
        const label = document.createElement('div');
        label.className = 'schedule-label';
        label.textContent = day;
        
        // Добавляем количество часов
        const hoursLabel = document.createElement('div');
        hoursLabel.style.position = 'absolute';
        hoursLabel.style.top = '-20px';
        hoursLabel.style.left = '0';
        hoursLabel.style.width = '100%';
        hoursLabel.style.textAlign = 'center';
        hoursLabel.style.color = hours[index] > 0 ? '#4dabf7' : '#8fb4d9';
        hoursLabel.style.fontSize = '0.8rem';
        hoursLabel.style.fontWeight = '600';
        hoursLabel.textContent = hours[index] > 0 ? `${hours[index]}ч` : 'Вых';
        
        bar.appendChild(hoursLabel);
        barContainer.appendChild(bar);
        barContainer.appendChild(label);
        grid.appendChild(barContainer);
        
        // Добавляем обработчик клика
        bar.addEventListener('click', function() {
            showDayDetails(index, day, hours[index]);
        });
    });
}

// Показать детали дня
function showDayDetails(dayIndex, dayName, hours) {
    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    const fullDayName = dayNames[dayIndex];
    
    let message = '';
    if (hours > 0) {
        message = `${fullDayName}: рабочая смена ${hours} часов (14:00-22:00)`;
    } else {
        message = `${fullDayName}: выходной день`;
    }
    
    showNotification(message, 'info');
}

// Инициализация быстрых действий
function initQuickActions() {
    // Начало смены
    document.getElementById('startShift').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('shiftModal').style.display = 'flex';
    });
    
    // Сообщить о проблеме
    document.getElementById('reportIssue').addEventListener('click', function(e) {
        e.preventDefault();
        showNotification('Открыта форма сообщения о проблеме', 'info');
        // В реальной системе здесь будет открытие формы
    });
    
    // Заявка на отпуск
    document.getElementById('requestLeave').addEventListener('click', function(e) {
        e.preventDefault();
        showNotification('Открыта форма заявки на отпуск', 'info');
    });
    
    // Обучение
    document.getElementById('trainingMaterials').addEventListener('click', function(e) {
        e.preventDefault();
        showNotification('Открыты материалы обучения', 'info');
    });
    
    // Настройки
    document.getElementById('settings').addEventListener('click', function(e) {
        e.preventDefault();
        showNotification('Открыты настройки профиля', 'info');
    });
    
    // Помощь
    document.getElementById('help').addEventListener('click', function(e) {
        e.preventDefault();
        showNotification('Открыт раздел помощи', 'info');
    });
}

// Обработка задач
function completeTask(taskId) {
    const taskElement = document.querySelector(`.task-item:nth-child(${taskId})`);
    if (taskElement) {
        taskElement.style.opacity = '0.5';
        taskElement.style.transform = 'translateX(-10px)';
        
        setTimeout(() => {
            taskElement.style.display = 'none';
            showNotification('Задача отмечена как выполненная', 'success');
            
            // Обновляем статистику
            updatePersonalStats();
        }, 300);
    }
}

function deferTask(taskId) {
    showNotification('Задача отложена на завтра', 'info');
}

function startTraining() {
    showNotification('Обучение начато. Удачи!', 'success');
}

// Обновление персональной статистики
function updatePersonalStats() {
    // Имитация обновления статистики
    const stats = document.querySelectorAll('.personal-value');
    if (stats.length >= 4) {
        // Увеличиваем количество проверенных слитков
        const checkedValue = stats[1];
        let currentChecked = parseInt(checkedValue.textContent.replace(/,/g, ''));
        checkedValue.textContent = (currentChecked + 1).toLocaleString();
        
        // Обновляем точность (немного случайное изменение)
        const accuracyValue = stats[0];
        let currentAccuracy = parseFloat(accuracyValue.textContent.replace('%', ''));
        const newAccuracy = Math.min(99.9, currentAccuracy + (Math.random() - 0.5) * 0.1);
        accuracyValue.textContent = newAccuracy.toFixed(1) + '%';
        
        // Обновляем текст приветствия
        const welcomeMessage = document.querySelector('.welcome-message');
        const todayChecked = document.querySelector('.stat-number');
        
        if (welcomeMessage && todayChecked) {
            let todayCount = parseInt(todayChecked.textContent) + 1;
            todayChecked.textContent = todayCount;
            
            welcomeMessage.textContent = 
                `Ваша текущая смена началась в 14:00. За сегодня вы проверили ${todayCount} слитков и обнаружили 1 дефект. Продолжайте в том же духе!`;
        }
    }
}

// Управление модальным окном смены
function initShiftModal() {
    // Закрытие модального окна
    document.getElementById('closeShiftModal').addEventListener('click', function() {
        document.getElementById('shiftModal').style.display = 'none';
    });
    
    document.getElementById('cancelShift').addEventListener('click', function() {
        document.getElementById('shiftModal').style.display = 'none';
    });
    
    document.getElementById('confirmShift').addEventListener('click', function() {
        // Обновляем статус в профиле
        const statusElement = document.querySelector('.profile-status');
        const statusIndicator = document.querySelector('.status-indicator');
        
        if (statusElement && statusIndicator) {
            statusElement.textContent = 'На смене';
            statusElement.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
            statusElement.style.color = '#4CAF50';
            statusElement.style.borderColor = 'rgba(76, 175, 80, 0.4)';
            
            statusIndicator.className = 'status-indicator status-online';
        }
        
        document.getElementById('shiftModal').style.display = 'none';
        showNotification('Смена успешно начата!', 'success');
        
        // Деактивируем кнопку начала смены
        const startShiftBtn = document.getElementById('startShift');
        startShiftBtn.style.opacity = '0.5';
        startShiftBtn.style.pointerEvents = 'none';
        startShiftBtn.querySelector('.action-label').textContent = 'Смена начата';
    });
    
    // Закрытие при клике вне окна
    document.getElementById('shiftModal').addEventListener('click', function(event) {
        if (event.target === this) {
            this.style.display = 'none';
        }
    });
}

// Всплывающие уведомления
function showNotification(message, type) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'error' ? 'rgba(244, 67, 54, 0.9)' : 'rgba(33, 150, 243, 0.9)'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        z-index: 1001;
        font-weight: 500;
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Имитация уведомлений в реальном времени
function simulateNotifications() {
    const notifications = [
        "Новая партия слитков ожидает проверки",
        "Коллега Петров В.И. начал свою смену",
        "Система ИИ обновлена до версии 2.1",
        "Напоминание: плановая калибровка камеры через 2 часа"
    ];
    
    // Случайное уведомление каждые 2-5 минут
    const randomTime = Math.random() * 180000 + 120000; // 2-5 минут
    setTimeout(() => {
        if (Math.random() > 0.3) { // 70% вероятность уведомления
            const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
            showNotification(randomNotification, 'info');
        }
        simulateNotifications(); // Рекурсивный вызов
    }, randomTime);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    generateSchedule();
    initQuickActions();
    initShiftModal();
    
    // Запускаем имитацию уведомлений
    simulateNotifications();
    
    // Инициализация аватара с индикатором статуса
    const avatar = document.querySelector('.profile-avatar');
    const statusIndicator = document.querySelector('.status-indicator');
    
    if (avatar && statusIndicator) {
        avatar.addEventListener('click', function() {
            // Переключение статуса при клике на аватар
            if (statusIndicator.classList.contains('status-online')) {
                statusIndicator.className = 'status-indicator status-away';
                document.querySelector('.profile-status').textContent = 'Отошел';
                document.querySelector('.profile-status').style.backgroundColor = 'rgba(255, 152, 0, 0.2)';
                document.querySelector('.profile-status').style.color = '#ff9800';
                document.querySelector('.profile-status').style.borderColor = 'rgba(255, 152, 0, 0.4)';
            } else if (statusIndicator.classList.contains('status-away')) {
                statusIndicator.className = 'status-indicator status-online';
                document.querySelector('.profile-status').textContent = 'На смене';
                document.querySelector('.profile-status').style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
                document.querySelector('.profile-status').style.color = '#4CAF50';
                document.querySelector('.profile-status').style.borderColor = 'rgba(76, 175, 80, 0.4)';
            }
        });
    }
    
    // Добавляем возможность редактирования профиля
    const profileDetails = document.querySelectorAll('.detail-value');
    profileDetails.forEach(detail => {
        detail.addEventListener('dblclick', function() {
            if (this.getAttribute('contenteditable') !== 'true') {
                this.setAttribute('contenteditable', 'true');
                this.style.backgroundColor = 'rgba(30, 45, 65, 0.8)';
                this.style.padding = '2px 5px';
                this.style.borderRadius = '4px';
                this.style.outline = '1px solid #4dabf7';
                this.focus();
                
                // Сохраняем исходное значение
                this.dataset.originalValue = this.textContent;
            }
        });
        
        detail.addEventListener('blur', function() {
            if (this.getAttribute('contenteditable') === 'true') {
                this.removeAttribute('contenteditable');
                this.style.backgroundColor = '';
                this.style.padding = '';
                this.style.borderRadius = '';
                this.style.outline = '';
                
                // Если значение изменилось, показываем уведомление
                if (this.textContent !== this.dataset.originalValue) {
                    showNotification('Изменение сохранено', 'success');
                }
            }
        });
        
        detail.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.getAttribute('contenteditable') === 'true') {
                e.preventDefault();
                this.blur();
            }
        });
    });
});