// Генерация Heat Map
function generateHeatMap() {
    const grid = document.getElementById('heatmapGrid');
    grid.innerHTML = '';
    
    // Данные для Heat Map (случайные значения)
    const heatMapData = [];
    for (let i = 0; i < 50; i++) {
        heatMapData.push(Math.floor(Math.random() * 8)); // 0-7 дефектов на ячейку
    }
    
    // Создаем ячейки Heat Map
    heatMapData.forEach((defectCount, index) => {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.setAttribute('data-defects', `${defectCount} дефектов`);
        
        // Определяем класс в зависимости от количества дефектов
        if (defectCount <= 1) {
            cell.className += ' heatmap-low';
        } else if (defectCount <= 3) {
            cell.className += ' heatmap-medium';
        } else if (defectCount <= 5) {
            cell.className += ' heatmap-high';
        } else {
            cell.className += ' heatmap-critical';
        }
        
        // Добавляем анимацию пульсации для ячеек с дефектами
        if (defectCount > 0) {
            cell.classList.add('pulse-animation');
            cell.style.animationDelay = `${(index % 10) * 0.1}s`;
        }
        
        grid.appendChild(cell);
    });
}

// Инициализация фильтров
function initFilters() {
    // Применение фильтров
    document.getElementById('applyFilters').addEventListener('click', function() {
        const period = document.getElementById('periodSelect').value;
        const line = document.getElementById('lineSelect').value;
        const shift = document.getElementById('shiftSelect').value;
        const defectType = document.getElementById('defectSelect').value;
        const groupBy = document.getElementById('groupSelect').value;
        
        // Имитация применения фильтров
        updateStatistics(period, line, shift, defectType, groupBy);
        showNotification('Фильтры применены', 'success');
    });
    
    // Сброс фильтров
    document.getElementById('resetFilters').addEventListener('click', function() {
        document.getElementById('periodSelect').value = 'week';
        document.getElementById('lineSelect').value = 'all';
        document.getElementById('shiftSelect').value = 'all';
        document.getElementById('defectSelect').value = 'all';
        document.getElementById('groupSelect').value = 'shift';
        
        updateStatistics('week', 'all', 'all', 'all', 'shift');
        showNotification('Фильтры сброшены', 'info');
    });
}

// Обновление статистики на основе фильтров
function updateStatistics(period, line, shift, defectType, groupBy) {
    // Имитация загрузки новых данных
    const totalIngots = document.getElementById('totalIngots');
    const totalDefects = document.getElementById('totalDefects');
    const qualityRate = document.getElementById('qualityRate');
    const costSavings = document.getElementById('costSavings');
    
    // Данные для разных периодов
    const periodData = {
        today: { ingots: 187, defects: 3, quality: 98.4, savings: 18700 },
        week: { ingots: 1247, defects: 18, quality: 98.56, savings: 124700 },
        month: { ingots: 5215, defects: 72, quality: 98.62, savings: 521500 }
    };
    
    const data = periodData[period] || periodData.week;
    
    // Анимированное обновление значений
    animateValue(totalIngots, data.ingots, '');
    animateValue(totalDefects, data.defects, '');
    animateValue(qualityRate, data.quality, '%');
    animateValue(costSavings, data.savings, '₽');
    
    // Обновление заголовка периода
    const periodText = {
        today: 'Сегодня',
        week: '12-18 июня 2023',
        month: 'Июнь 2023',
        quarter: '2-й квартал 2023',
        year: '2023 год'
    };
    
    const periodElement = document.querySelector('.panel-header div');
    if (periodElement) {
        periodElement.textContent = `Период: ${periodText[period] || '12-18 июня 2023'}`;
    }
    
    // Обновление распределения дефектов в зависимости от фильтров
    updateDefectsDistribution(defectType);
    
    // Обновление статистики по сменам
    updateShiftsStats(shift);
    
    // Обновление Heat Map
    generateHeatMap();
}

// Обновление распределения дефектов
function updateDefectsDistribution(defectType) {
    const defectCounts = document.querySelectorAll('.defect-count');
    const defectPercentages = document.querySelectorAll('.defect-percentage');
    const progressFills = document.querySelectorAll('.progress-fill');
    
    // Данные для разных типов дефектов
    const defectData = {
        all: { cracks: 12, porosity: 3, inclusion: 2, scratch: 1 },
        crack: { cracks: 12, porosity: 0, inclusion: 0, scratch: 0 },
        porosity: { cracks: 0, porosity: 3, inclusion: 0, scratch: 0 },
        inclusion: { cracks: 0, porosity: 0, inclusion: 2, scratch: 0 },
        scratch: { cracks: 0, porosity: 0, inclusion: 0, scratch: 1 }
    };
    
    const data = defectData[defectType] || defectData.all;
    const totalDefects = data.cracks + data.porosity + data.inclusion + data.scratch;
    
    // Обновляем значения
    if (defectCounts.length >= 4) {
        defectCounts[0].textContent = data.cracks;
        defectCounts[1].textContent = data.porosity;
        defectCounts[2].textContent = data.inclusion;
        defectCounts[3].textContent = data.scratch;
    }
    
    // Обновляем проценты и прогресс-бары
    if (totalDefects > 0) {
        const crackPercent = totalDefects > 0 ? (data.cracks / totalDefects * 100).toFixed(1) : 0;
        const porosityPercent = totalDefects > 0 ? (data.porosity / totalDefects * 100).toFixed(1) : 0;
        const inclusionPercent = totalDefects > 0 ? (data.inclusion / totalDefects * 100).toFixed(1) : 0;
        const scratchPercent = totalDefects > 0 ? (data.scratch / totalDefects * 100).toFixed(1) : 0;
        
        if (defectPercentages.length >= 4) {
            defectPercentages[0].textContent = `${crackPercent}% от всех дефектов`;
            defectPercentages[1].textContent = `${porosityPercent}% от всех дефектов`;
            defectPercentages[2].textContent = `${inclusionPercent}% от всех дефектов`;
            defectPercentages[3].textContent = `${scratchPercent}% от всех дефектов`;
        }
        
        if (progressFills.length >= 4) {
            progressFills[0].style.width = `${crackPercent}%`;
            progressFills[1].style.width = `${porosityPercent}%`;
            progressFills[2].style.width = `${inclusionPercent}%`;
            progressFills[3].style.width = `${scratchPercent}%`;
        }
    }
    
    // Обновляем общее количество дефектов в заголовке
    const defectHeader = document.querySelector('.panel-header div');
    if (defectHeader && defectHeader.textContent.includes('Всего дефектов')) {
        defectHeader.textContent = `Всего дефектов: ${totalDefects}`;
    }
}

// Обновление статистики по сменам
function updateShiftsStats(shift) {
    const shiftValues = document.querySelectorAll('.shift-value');
    
    // Данные для разных смен
    const shiftData = {
        all: { shift1: { defects: 7, ingots: 412, quality: 98.3 },
               shift2: { defects: 5, ingots: 398, quality: 98.7 },
               shift3: { defects: 6, ingots: 437, quality: 98.6 } },
        shift1: { shift1: { defects: 7, ingots: 412, quality: 98.3 },
                  shift2: { defects: 0, ingots: 0, quality: 0 },
                  shift3: { defects: 0, ingots: 0, quality: 0 } },
        shift2: { shift1: { defects: 0, ingots: 0, quality: 0 },
                  shift2: { defects: 5, ingots: 398, quality: 98.7 },
                  shift3: { defects: 0, ingots: 0, quality: 0 } },
        shift3: { shift1: { defects: 0, ingots: 0, quality: 0 },
                  shift2: { defects: 0, ingots: 0, quality: 0 },
                  shift3: { defects: 6, ingots: 437, quality: 98.6 } }
    };
    
    const data = shiftData[shift] || shiftData.all;
    
    // Обновляем значения для смен
    if (shiftValues.length >= 9) {
        // Смена 1
        shiftValues[0].textContent = data.shift1.defects;
        shiftValues[1].textContent = data.shift1.ingots;
        shiftValues[2].textContent = data.shift1.quality > 0 ? data.shift1.quality.toFixed(1) + '%' : '—';
        
        // Смена 2
        shiftValues[3].textContent = data.shift2.defects;
        shiftValues[4].textContent = data.shift2.ingots;
        shiftValues[5].textContent = data.shift2.quality > 0 ? data.shift2.quality.toFixed(1) + '%' : '—';
        
        // Смена 3
        shiftValues[6].textContent = data.shift3.defects;
        shiftValues[7].textContent = data.shift3.ingots;
        shiftValues[8].textContent = data.shift3.quality > 0 ? data.shift3.quality.toFixed(1) + '%' : '—';
    }
}

// Анимация изменения числовых значений
function animateValue(element, target, suffix = '') {
    const currentText = element.textContent.replace(suffix, '').replace('₽', '').replace('%', '').trim();
    const current = parseFloat(currentText) || 0;
    
    if (current === target) return;
    
    const increment = target > current ? 1 : -1;
    const step = Math.abs(target - current) / 20;
    
    let currentValue = current;
    
    const timer = setInterval(() => {
        currentValue += increment * step;
        
        if ((increment > 0 && currentValue >= target) || (increment < 0 && currentValue <= target)) {
            currentValue = target;
            clearInterval(timer);
        }
        
        if (suffix === '₽') {
            element.textContent = '₽' + Math.round(currentValue).toLocaleString();
        } else if (suffix === '%') {
            element.textContent = currentValue.toFixed(2) + suffix;
        } else {
            element.textContent = Math.round(currentValue).toLocaleString();
        }
    }, 20);
}

// Инициализация кнопок экспорта
function initExportButtons() {
    // Экспорт в Excel
    document.getElementById('exportExcel').addEventListener('click', function() {
        showNotification('Формирование отчета Excel...', 'info');
        
        setTimeout(() => {
            showNotification('Отчет успешно экспортирован в Excel', 'success');
        }, 1500);
    });
    
    // Экспорт в PDF
    document.getElementById('exportPDF').addEventListener('click', function() {
        showNotification('Формирование PDF отчета...', 'info');
        
        setTimeout(() => {
            showNotification('PDF отчет успешно сформирован', 'success');
        }, 2000);
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

// Имитация обновления статистики в реальном времени
function simulateRealTimeUpdates() {
    setInterval(() => {
        // Случайное небольшое изменение статистики
        const totalIngots = document.getElementById('totalIngots');
        const totalDefects = document.getElementById('totalDefects');
        const qualityRate = document.getElementById('qualityRate');
        
        const currentIngots = parseInt(totalIngots.textContent.replace(/,/g, '')) || 1247;
        const currentDefects = parseInt(totalDefects.textContent) || 18;
        const currentQuality = parseFloat(qualityRate.textContent.replace('%', '')) || 98.56;
        
        // Небольшие случайные изменения
        const newIngots = currentIngots + Math.floor(Math.random() * 3) + 1;
        const newDefects = currentDefects + (Math.random() > 0.7 ? 1 : 0);
        const newQuality = ((newIngots - newDefects) / newIngots * 100).toFixed(2);
        
        // Обновляем значения
        totalIngots.textContent = newIngots.toLocaleString();
        totalDefects.textContent = newDefects;
        qualityRate.textContent = newQuality + '%';
        
        // Обновляем экономию (примерно 100 руб за слиток)
        const costSavings = document.getElementById('costSavings');
        const newSavings = newIngots * 100;
        costSavings.textContent = '₽' + newSavings.toLocaleString();
        
    }, 10000); // Обновление каждые 10 секунд
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    generateHeatMap();
    initFilters();
    initExportButtons();
    
    // Инициализируем статистику с данными по умолчанию
    updateStatistics('week', 'all', 'all', 'all', 'shift');
    
    // Запускаем имитацию обновления в реальном времени
    simulateRealTimeUpdates();
});