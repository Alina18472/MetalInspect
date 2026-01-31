// Данные для bounding boxes на видеопотоке
const aiDetections = [
    { id: 1, x: 120, y: 80, width: 180, height: 120, confidence: 0.96, type: 'трещина' },
    { id: 2, x: 350, y: 150, width: 140, height: 90, confidence: 0.87, type: 'трещина' },
    { id: 3, x: 600, y: 200, width: 200, height: 110, confidence: 0.92, type: 'трещина' },
    { id: 4, x: 850, y: 100, width: 160, height: 100, confidence: 0.78, type: 'подозрение' }
];

// Данные для таблицы событий
const eventsData = [
    { time: "14:23:17", id: "SL-4829", confidence: 0.96 },
    { time: "14:21:05", id: "SL-4827", confidence: 0.87 },
    { time: "14:18:42", id: "SL-4824", confidence: 0.92 },
    { time: "14:15:33", id: "SL-4821", confidence: 0.78 },
    { time: "14:12:19", id: "SL-4818", confidence: 0.95 },
    { time: "14:09:05", id: "SL-4815", confidence: 0.81 },
    { time: "14:05:47", id: "SL-4812", confidence: 0.89 },
    { time: "14:02:31", id: "SL-4809", confidence: 0.93 },
    { time: "13:58:22", id: "SL-4805", confidence: 0.84 },
    { time: "13:54:10", id: "SL-4801", confidence: 0.91 }
];

// Инициализация bounding boxes на видеопотоке
function initAIDetections() {
    const overlay = document.getElementById('videoOverlay');
    overlay.innerHTML = '';
    
    aiDetections.forEach(detection => {
        const box = document.createElement('div');
        box.className = 'ai-box';
        box.id = `detection-${detection.id}`;
        box.style.left = `${detection.x}px`;
        box.style.top = `${detection.y}px`;
        box.style.width = `${detection.width}px`;
        box.style.height = `${detection.height}px`;
        
        // Цвет рамки в зависимости от уверенности
        if (detection.confidence > 0.9) {
            box.style.borderColor = '#f44336';
        } else if (detection.confidence > 0.8) {
            box.style.borderColor = '#ff9800';
        } else {
            box.style.borderColor = '#4CAF50';
        }
        
        // Метка с уверенностью
        const label = document.createElement('div');
        label.className = 'confidence-label';
        label.textContent = `${Math.round(detection.confidence * 100)}% ${detection.type}`;
        box.appendChild(label);
        
        // Обработчик клика для детализации
        box.addEventListener('click', () => openEventDetails(detection));
        
        overlay.appendChild(box);
    });
}

// Инициализация таблицы событий
function initEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = '';
    
    eventsData.forEach(event => {
        const row = document.createElement('tr');
        row.dataset.id = event.id;
        
        // Определяем класс для уверенности
        let confidenceClass = 'low-confidence';
        if (event.confidence > 0.9) {
            confidenceClass = 'high-confidence';
        } else if (event.confidence > 0.8) {
            confidenceClass = 'medium-confidence';
        }
        
        // Процент заполнения полоски уверенности
        const confidencePercent = Math.round(event.confidence * 100);
        
        row.innerHTML = `
            <td class="event-time">${event.time}</td>
            <td class="event-id">${event.id}</td>
            <td>
                <div class="confidence-cell">
                    <div class="confidence-bar">
                        <div class="confidence-fill ${confidenceClass}" style="width: ${confidencePercent}%"></div>
                    </div>
                    <span>${confidencePercent}%</span>
                </div>
            </td>
        `;
        
        // Обработчик клика для открытия деталей
        row.addEventListener('click', () => {
            openEventDetails({
                id: event.id,
                time: event.time,
                confidence: event.confidence
            });
        });
        
        tbody.appendChild(row);
    });
}

// Открытие модального окна с деталями события
function openEventDetails(details) {
    const modal = document.getElementById('eventModal');
    const modalBody = document.getElementById('modalBody');
    
    // Определяем критичность
    let criticalityClass = 'detail-ok';
    let criticalityText = 'Низкая';
    
    if (details.confidence > 0.9) {
        criticalityClass = 'detail-critical';
        criticalityText = 'Высокая';
    } else if (details.confidence > 0.8) {
        criticalityClass = 'detail-warning';
        criticalityText = 'Средняя';
    }
    
    // Заполняем содержимое модального окна
    modalBody.innerHTML = `
        <div class="detail-image">
            <div style="text-align: center; color: #8fb4d9; padding: 20px;">
                <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <div>Изображение слитка ${details.id}</div>
                <div style="font-size: 0.9rem; margin-top: 10px;">Обнаружена ${details.type || 'трещина'}</div>
            </div>
        </div>
        <div class="detail-info">
            <h3 style="color: #e0e0e0; margin-bottom: 10px;">Информация о дефекте</h3>
            
            <div class="detail-row">
                <span class="detail-label">ID слитка:</span>
                <span class="detail-value">${details.id || 'SL-4829'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Время обнаружения:</span>
                <span class="detail-value">${details.time || '14:23:17'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Уверенность ИИ:</span>
                <span class="detail-value ${criticalityClass}">${Math.round((details.confidence || 0.96) * 100)}%</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Критичность:</span>
                <span class="detail-value ${criticalityClass}">${criticalityText}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Тип дефекта:</span>
                <span class="detail-value">${details.type || 'Продольная трещина'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Размер:</span>
                <span class="detail-value">~${details.width ? details.width + 'x' + details.height + ' px' : '180x120 px'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Статус проверки:</span>
                <span class="detail-value detail-warning">Требует подтверждения оператором</span>
            </div>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(60, 120, 180, 0.3);">
                <button class="control-btn" style="width: 100%; margin-bottom: 10px;">
                    <i class="fas fa-check-circle"></i> Подтвердить дефект
                </button>
                <button class="control-btn secondary" style="width: 100%;">
                    <i class="fas fa-times-circle"></i> Отметить как ложное срабатывание
                </button>
            </div>
        </div>
    `;
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// Закрытие модального окна
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('eventModal').style.display = 'none';
});

// Закрытие модального окна при клике вне его
document.getElementById('eventModal').addEventListener('click', function(event) {
    if (event.target === this) {
        this.style.display = 'none';
    }
});

// Обновление статистики каждые 5 секунд
function updateStats() {
    // Имитация обновления данных
    const totalIngots = document.getElementById('totalIngots');
    const defectsFound = document.getElementById('defectsFound');
    
    let currentIngots = parseInt(totalIngots.textContent.replace(',', ''));
    let currentDefects = parseInt(defectsFound.textContent);
    
    // Случайное небольшое увеличение
    const newIngots = currentIngots + Math.floor(Math.random() * 3) + 1;
    const newDefects = currentDefects + (Math.random() > 0.7 ? 1 : 0);
    
    totalIngots.textContent = newIngots.toLocaleString();
    defectsFound.textContent = newDefects;
    
    // Пересчет процента брака
    const defectRate = document.getElementById('defectRate');
    const newRate = ((newDefects / newIngots) * 100).toFixed(2);
    defectRate.textContent = `${newRate}%`;
}

// Обработчики кнопок управления
document.getElementById('pauseBtn').addEventListener('click', function() {
    const icon = this.querySelector('i');
    if (icon.classList.contains('fa-pause')) {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        this.innerHTML = '<i class="fas fa-play"></i> Возобновить';
        this.style.background = 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)';
    } else {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        this.innerHTML = '<i class="fas fa-pause"></i> Приостановить';
        this.style.background = 'linear-gradient(90deg, #1e5aa0 0%, #2a6bc0 100%)';
    }
});

document.getElementById('refreshEvents').addEventListener('click', function() {
    // Анимация обновления
    this.style.transform = 'rotate(360deg)';
    this.style.transition = 'transform 0.5s ease';
    
    // Имитация обновления данных
    setTimeout(() => {
        initEventsTable();
        this.style.transform = 'rotate(0deg)';
    }, 500);
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initAIDetections();
    initEventsTable();
    
    // Автоматическое обновление статистики
    setInterval(updateStats, 5000);
    
    // Имитация динамического добавления нового события
    setInterval(() => {
        // Случайное добавление нового события (с вероятностью 30%)
        if (Math.random() > 0.7) {
            const now = new Date();
            const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                             now.getMinutes().toString().padStart(2, '0') + ':' + 
                             now.getSeconds().toString().padStart(2, '0');
            
            const newId = `SL-${Math.floor(Math.random() * 1000) + 4830}`;
            const newConfidence = Math.random() * 0.2 + 0.75; // 0.75 - 0.95
            
            // Добавляем в начало массива
            eventsData.unshift({
                time: timeString,
                id: newId,
                confidence: newConfidence
            });
            
            // Обновляем таблицу
            initEventsTable();
            
            // Обновляем статистику
            updateStats();
        }
    }, 10000);
});