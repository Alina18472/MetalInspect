// Инициализация ROC кривой
function initROCCurve() {
    const rocLine = document.querySelector('.roc-line');
    const points = document.querySelectorAll('.roc-point');
    
    // Создаем SVG для ROC кривой
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    
    // Создаем линию ROC кривой
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M0,100 L30,75 L50,50 L70,15 L100,0");
    path.setAttribute("stroke", "#4dabf7");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-dasharray", "5,5");
    
    // Создаем диагональную линию (случайный классификатор)
    const diagonal = document.createElementNS(svgNS, "line");
    diagonal.setAttribute("x1", "0%");
    diagonal.setAttribute("y1", "100%");
    diagonal.setAttribute("x2", "100%");
    diagonal.setAttribute("y2", "0%");
    diagonal.setAttribute("stroke", "rgba(255, 255, 255, 0.2)");
    diagonal.setAttribute("stroke-width", "1");
    diagonal.setAttribute("stroke-dasharray", "2,2");
    
    svg.appendChild(diagonal);
    svg.appendChild(path);
    rocLine.appendChild(svg);
    
    // Добавляем обработчики для точек
    points.forEach(point => {
        point.addEventListener('mouseenter', function() {
            const fpr = this.getAttribute('data-fpr');
            const tpr = this.getAttribute('data-tpr');
            
            // Показываем всплывающую подсказку
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = `FPR: ${fpr}, TPR: ${tpr}`;
            tooltip.style.cssText = `
                position: absolute;
                background-color: rgba(18, 30, 44, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.9rem;
                z-index: 100;
                white-space: nowrap;
                border: 1px solid rgba(77, 171, 247, 0.3);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            `;
            
            const rect = this.getBoundingClientRect();
            const containerRect = rocLine.getBoundingClientRect();
            
            tooltip.style.left = (rect.left - containerRect.left + 15) + 'px';
            tooltip.style.top = (rect.top - containerRect.top - 40) + 'px';
            
            rocLine.appendChild(tooltip);
            
            // Увеличиваем точку при наведении
            this.style.transform = 'translate(-50%, 50%) scale(1.5)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        point.addEventListener('mouseleave', function() {
            // Удаляем подсказку
            const tooltip = rocLine.querySelector('.tooltip');
            if (tooltip) {
                rocLine.removeChild(tooltip);
            }
            
            // Возвращаем точку к исходному размеру
            this.style.transform = 'translate(-50%, 50%) scale(1)';
        });
    });
}

// Инициализация переключения временных диапазонов
function initTimeRange() {
    const timeButtons = document.querySelectorAll('.time-btn');
    
    timeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Удаляем активный класс у всех кнопок
            timeButtons.forEach(b => b.classList.remove('active'));
            
            // Добавляем активный класс текущей кнопке
            this.classList.add('active');
            
            // Получаем выбранный диапазон
            const range = this.getAttribute('data-range');
            
            // Обновляем данные в зависимости от диапазона
            updateMetricsForRange(range);
        });
    });
}

// Обновление метрик в зависимости от временного диапазона
function updateMetricsForRange(range) {
    // Имитация загрузки новых данных
    const accuracyElement = document.getElementById('accuracyValue');
    const precisionElement = document.getElementById('precisionValue');
    const recallElement = document.getElementById('recallValue');
    const f1Element = document.getElementById('f1Value');
    
    // Данные для разных временных диапазонов
    const rangeData = {
        week: { accuracy: 96.2, precision: 97.5, recall: 94.8, f1: 95.5 },
        month: { accuracy: 95.8, precision: 97.1, recall: 94.5, f1: 95.3 },
        quarter: { accuracy: 95.0, precision: 96.5, recall: 93.8, f1: 94.6 }
    };
    
    const data = rangeData[range] || rangeData.week;
    
    // Анимированное обновление значений
    animateValue(accuracyElement, data.accuracy, '%');
    animateValue(precisionElement, data.precision, '%');
    animateValue(recallElement, data.recall, '%');
    animateValue(f1Element, data.f1, '%');
    
    // Обновляем описание графика
    const chartTitle = document.querySelector('.chart-title');
    const rangeText = range === 'week' ? 'неделю' : range === 'month' ? 'месяц' : 'квартал';
    chartTitle.textContent = `Динамика метрик за последний ${rangeText}`;
}

// Анимация изменения числовых значений
function animateValue(element, target, suffix = '') {
    const current = parseFloat(element.textContent.replace(suffix, ''));
    const increment = target > current ? 1 : -1;
    const step = Math.abs(target - current) / 20;
    
    let currentValue = current;
    
    const timer = setInterval(() => {
        currentValue += increment * step;
        
        if ((increment > 0 && currentValue >= target) || (increment < 0 && currentValue <= target)) {
            currentValue = target;
            clearInterval(timer);
        }
        
        element.textContent = currentValue.toFixed(1) + suffix;
    }, 20);
}

// Инициализация выбора модели
function initModelSelection() {
    const modelComparisons = document.querySelectorAll('.model-comparison');
    
    modelComparisons.forEach(model => {
        model.addEventListener('click', function() {
            // Удаляем выделение у всех моделей
            modelComparisons.forEach(m => {
                m.classList.remove('active');
                const status = m.querySelector('div:last-child');
                if (status && status.textContent === 'Активна') {
                    status.textContent = '';
                    status.style.color = '';
                }
            });
            
            // Добавляем выделение текущей модели
            this.classList.add('active');
            
            // Обновляем статус
            const status = this.querySelector('div:last-child');
            if (status) {
                status.textContent = 'Активна';
                status.style.color = '#4CAF50';
                status.style.fontWeight = '600';
            }
        });
    });
}

// Инициализация кнопок действий
function initActionButtons() {
    // Кнопка сравнения моделей
    document.getElementById('compareModels').addEventListener('click', function() {
        document.getElementById('compareModal').style.display = 'flex';
    });
    
    // Кнопка переключения модели
    document.getElementById('switchModel').addEventListener('click', function() {
        const activeModel = document.querySelector('.model-comparison.active');
        const modelName = activeModel ? activeModel.querySelector('.model-name').textContent : 'YOLOv8';
        
        if (confirm(`Вы уверены, что хотите переключить активную модель на "${modelName}"?`)) {
            // Имитация переключения модели
            showNotification(`Модель переключена на ${modelName}`, 'success');
        }
    });
    
    // Закрытие модального окна сравнения
    document.getElementById('closeCompareModal').addEventListener('click', function() {
        document.getElementById('compareModal').style.display = 'none';
    });
    
    document.getElementById('closeCompareBtn').addEventListener('click', function() {
        document.getElementById('compareModal').style.display = 'none';
    });
    
    document.getElementById('compareModal').addEventListener('click', function(event) {
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

// Имитация обновления метрик в реальном времени
function simulateRealTimeUpdates() {
    setInterval(() => {
        // Случайное небольшое изменение метрик
        const accuracyElement = document.getElementById('accuracyValue');
        const precisionElement = document.getElementById('precisionValue');
        const recallElement = document.getElementById('recallValue');
        const f1Element = document.getElementById('f1Value');
        
        const currentAccuracy = parseFloat(accuracyElement.textContent.replace('%', ''));
        const currentPrecision = parseFloat(precisionElement.textContent.replace('%', ''));
        const currentRecall = parseFloat(recallElement.textContent.replace('%', ''));
        const currentF1 = parseFloat(f1Element.textContent.replace('%', ''));
        
        // Небольшие случайные колебания (±0.1%)
        const newAccuracy = Math.max(95.0, Math.min(98.0, currentAccuracy + (Math.random() - 0.5) * 0.2));
        const newPrecision = Math.max(96.0, Math.min(99.0, currentPrecision + (Math.random() - 0.5) * 0.2));
        const newRecall = Math.max(93.0, Math.min(97.0, currentRecall + (Math.random() - 0.5) * 0.2));
        const newF1 = Math.max(94.0, Math.min(97.0, currentF1 + (Math.random() - 0.5) * 0.2));
        
        // Плавное обновление значений
        accuracyElement.textContent = newAccuracy.toFixed(1) + '%';
        precisionElement.textContent = newPrecision.toFixed(1) + '%';
        recallElement.textContent = newRecall.toFixed(1) + '%';
        f1Element.textContent = newF1.toFixed(1) + '%';
        
        // Обновляем прогресс-бары
        updateProgressBars(newAccuracy, newPrecision, newRecall, newF1);
        
    }, 10000); // Обновление каждые 10 секунд
}

// Обновление прогресс-баров
function updateProgressBars(accuracy, precision, recall, f1) {
    const accuracyBar = document.querySelector('.bar-accuracy');
    const precisionBar = document.querySelector('.bar-precision');
    const recallBar = document.querySelector('.bar-recall');
    const f1Bar = document.querySelector('.bar-f1');
    
    if (accuracyBar) accuracyBar.style.width = accuracy + '%';
    if (precisionBar) precisionBar.style.width = precision + '%';
    if (recallBar) recallBar.style.width = recall + '%';
    if (f1Bar) f1Bar.style.width = f1 + '%';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initROCCurve();
    initTimeRange();
    initModelSelection();
    initActionButtons();
    
    // Запускаем имитацию обновления в реальном времени
    simulateRealTimeUpdates();
    
    // Инициализируем прогресс-бары начальными значениями
    updateProgressBars(96.2, 97.5, 94.8, 95.5);
});