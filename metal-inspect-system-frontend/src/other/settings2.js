// Инициализация слайдеров
function initSliders() {
    const sliders = document.querySelectorAll('.slider');
    
    sliders.forEach(slider => {
        const valueElement = document.getElementById(slider.id.replace('Slider', 'Value'));
        
        // Установка начального значения
        valueElement.textContent = slider.value + (slider.id === 'memorySlider' ? ' МБ' : '%');
        
        // Обработчик изменения
        slider.addEventListener('input', function() {
            valueElement.textContent = this.value + (this.id === 'memorySlider' ? ' МБ' : '%');
        });
    });
}

// Переключение между разделами настроек
function initSettingsNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-panel');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Удаляем активный класс у всех элементов
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Добавляем активный класс текущему элементу
            this.classList.add('active');
            
            // Получаем целевой раздел
            const targetSection = this.getAttribute('data-section');
            
            // Скрываем все разделы
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Показываем целевой раздел
            const targetElement = document.getElementById(targetSection + '-section');
            if (targetElement) {
                targetElement.style.display = 'block';
                
                // Обновляем заголовок
                const headerTitle = document.querySelector('.settings-header h2');
                const headerDesc = document.querySelector('.settings-description');
                
                switch(targetSection) {
                    case 'camera':
                        headerTitle.innerHTML = '<i class="fas fa-video"></i> Настройки камеры';
                        headerDesc.textContent = 'Настройка параметров промышленной камеры для оптимального качества изображения.';
                        break;
                    case 'calibration':
                        headerTitle.innerHTML = '<i class="fas fa-ruler-combined"></i> Калибровка системы';
                        headerDesc.textContent = 'Геометрическая и фотометрическая калибровка для точного обнаружения дефектов.';
                        break;
                    case 'ai-models':
                        headerTitle.innerHTML = '<i class="fas fa-robot"></i> Настройки нейросетевых моделей';
                        headerDesc.textContent = 'Выбор и настройка моделей глубокого обучения для обнаружения трещин.';
                        break;
                    default:
                        headerTitle.innerHTML = '<i class="fas fa-sliders-h"></i> Настройки системы';
                        headerDesc.textContent = 'Конфигурация параметров системы контроля качества.';
                }
            }
        });
    });
}

// Выбор модели нейросети
function initModelSelection() {
    const modelCards = document.querySelectorAll('.model-card');
    
    modelCards.forEach(card => {
        card.addEventListener('click', function() {
            // Удаляем выделение у всех карточек
            modelCards.forEach(c => {
                c.classList.remove('selected');
                c.querySelector('.model-badge').textContent = 'Неактивна';
                c.querySelector('.model-badge').className = 'model-badge inactive';
            });
            
            // Добавляем выделение текущей карточке
            this.classList.add('selected');
            this.querySelector('.model-badge').textContent = 'Активна';
            this.querySelector('.model-badge').className = 'model-badge';
            
            // Получаем выбранную модель
            const selectedModel = this.getAttribute('data-model');
            console.log(`Выбрана модель: ${selectedModel}`);
        });
    });
}

// Обработка кнопок сохранения
function initActionButtons() {
    // Сохранение настроек камеры
    document.getElementById('saveCamera').addEventListener('click', function() {
        const brightness = document.getElementById('brightnessSlider').value;
        const contrast = document.getElementById('contrastSlider').value;
        const exposure = document.getElementById('exposureSlider').value;
        const sharpness = document.getElementById('sharpnessSlider').value;
        const whiteBalance = document.getElementById('whiteBalance').value;
        const resolution = document.getElementById('resolution').value;
        
        // Имитация сохранения настроек
        showNotification('Настройки камеры успешно сохранены', 'success');
        console.log('Сохранены настройки камеры:', {
            brightness, contrast, exposure, sharpness, whiteBalance, resolution
        });
    });
    
    // Сброс настроек камеры
    document.getElementById('resetCamera').addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите сбросить настройки камеры к значениям по умолчанию?')) {
            document.getElementById('brightnessSlider').value = 50;
            document.getElementById('brightnessValue').textContent = '50%';
            
            document.getElementById('contrastSlider').value = 50;
            document.getElementById('contrastValue').textContent = '50%';
            
            document.getElementById('exposureSlider').value = 50;
            document.getElementById('exposureValue').textContent = '50%';
            
            document.getElementById('sharpnessSlider').value = 50;
            document.getElementById('sharpnessValue').textContent = '50%';
            
            document.getElementById('whiteBalance').value = 'auto';
            document.getElementById('resolution').value = '1080p';
            
            showNotification('Настройки камеры сброшены', 'info');
        }
    });
    
    // Калибровка
    document.getElementById('startCalibration').addEventListener('click', function() {
        showNotification('Запущена процедура калибровки...', 'info');
        
        // Имитация процесса калибровки
        setTimeout(() => {
            document.querySelector('#calibration-section .status-dot').className = 'status-dot status-active';
            document.querySelector('#calibration-section .status-indicator span:last-child').textContent = 'Калибровка завершена';
            showNotification('Калибровка успешно завершена', 'success');
        }, 2000);
    });
    
    document.getElementById('autoCalibrate').addEventListener('click', function() {
        showNotification('Запущена автоматическая калибровка...', 'info');
        
        // Имитация автоматической калибровки
        setTimeout(() => {
            document.querySelector('#calibration-section .status-dot').className = 'status-dot status-active';
            document.querySelector('#calibration-section .status-indicator span:last-child').textContent = 'Калибровка завершена';
            showNotification('Автоматическая калибровка успешно завершена', 'success');
        }, 3000);
    });
    
    // Тестирование модели
    document.getElementById('testModel').addEventListener('click', function() {
        document.getElementById('testModal').style.display = 'flex';
    });
    
    // Обновление модели
    document.getElementById('updateModel').addEventListener('click', function() {
        showNotification('Запущено обновление модели нейросети...', 'info');
        
        // Имитация обновления
        setTimeout(() => {
            showNotification('Модель нейросети успешно обновлена', 'success');
        }, 1500);
    });
    
    // Закрытие модального окна тестирования
    document.getElementById('closeTestModal').addEventListener('click', function() {
        document.getElementById('testModal').style.display = 'none';
    });
    
    document.getElementById('closeTestBtn').addEventListener('click', function() {
        document.getElementById('testModal').style.display = 'none';
    });
    
    document.getElementById('testModal').addEventListener('click', function(event) {
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initSliders();
    initSettingsNavigation();
    initModelSelection();
    initActionButtons();
    
    // Инициализация вкладки по умолчанию
    document.querySelector('.nav-item.active').click();
});