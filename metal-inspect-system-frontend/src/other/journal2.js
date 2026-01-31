// Данные для журнала событий
const journalData = [
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

// Инициализация таблицы журнала
function initJournalTable() {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = '';
    
    journalData.forEach((event, index) => {
        const row = document.createElement('tr');
        
        // Определяем класс для уверенности
        let confidenceClass = 'low-confidence';
        if (event.confidence > 0.9) {
            confidenceClass = 'high-confidence';
        } else if (event.confidence > 0.8) {
            confidenceClass = 'medium-confidence';
        }
        
        // Процент заполнения полоски уверенности
        const confidencePercent = Math.round(event.confidence * 100);
        
        // Статус
        let statusBadge = '';
        if (event.status === 'confirmed') {
            statusBadge = '<span class="status-badge status-confirmed">Подтверждено</span>';
        } else if (event.status === 'rejected') {
            statusBadge = '<span class="status-badge status-rejected">Отклонено</span>';
        } else {
            statusBadge = '<span class="status-badge status-pending">Ожидает</span>';
        }
        
        // Оператор
        let operatorAvatar = '';
        let operatorName = event.operator;
        
        if (event.operator === 'Иванов А.С.') {
            operatorAvatar = '<div class="operator-avatar">И</div>';
        } else if (event.operator === 'Петров В.И.') {
            operatorAvatar = '<div class="operator-avatar">П</div>';
        } else if (event.operator === 'Сидорова Е.П.') {
            operatorAvatar = '<div class="operator-avatar">С</div>';
        } else {
            operatorAvatar = '<div class="operator-avatar"><i class="fas fa-robot"></i></div>';
        }
        
        row.innerHTML = `
            <td class="time-cell">${event.time}</td>
            <td class="id-cell">${event.id}</td>
            <td>
                <div class="confidence-cell">
                    <div class="confidence-bar">
                        <div class="confidence-fill ${confidenceClass}" style="width: ${confidencePercent}%"></div>
                    </div>
                    <span>${confidencePercent}%</span>
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div class="operator-cell">
                    ${operatorAvatar}
                    <span>${operatorName}</span>
                </div>
            </td>
            <td class="comment-cell" id="comment-${index}">${event.comment}</td>
            <td class="action-cell">
                <button class="action-btn" title="Просмотреть детали" onclick="viewEventDetails(${index})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" title="Развернуть комментарий" onclick="toggleComment(${index})">
                    <i class="fas fa-expand-alt"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Переключение развертывания комментария
function toggleComment(index) {
    const commentCell = document.getElementById(`comment-${index}`);
    commentCell.classList.toggle('expanded');
    
    const btn = commentCell.parentElement.querySelector('.fa-expand-alt').parentElement;
    if (commentCell.classList.contains('expanded')) {
        btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
        btn.title = 'Свернуть комментарий';
    } else {
        btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
        btn.title = 'Развернуть комментарий';
    }
}

// Просмотр деталей события
function viewEventDetails(index) {
    const event = journalData[index];
    alert(`Детали события:\n\nID слитка: ${event.id}\nВремя: ${event.time}\nУверенность ИИ: ${Math.round(event.confidence * 100)}%\nСтатус: ${event.status === 'confirmed' ? 'Подтверждено' : event.status === 'rejected' ? 'Отклонено' : 'Ожидает'}\nОператор: ${event.operator}\nКомментарий: ${event.comment}\nТип дефекта: ${event.defectType === 'crack' ? 'Трещина' : event.defectType === 'porosity' ? 'Пористость' : event.defectType === 'inclusion' ? 'Включения' : 'Царапина'}`);
}

// Применение фильтров
function applyFilters() {
    const defectType = document.getElementById('defectType').value;
    const status = document.getElementById('status').value;
    const operator = document.getElementById('operator').value;
    const confidence = document.getElementById('confidence').value;
    
    let filteredData = journalData;
    
    // Фильтрация по типу дефекта
    if (defectType) {
        filteredData = filteredData.filter(event => event.defectType === defectType);
    }
    
    // Фильтрация по статусу
    if (status) {
        filteredData = filteredData.filter(event => event.status === status);
    }
    
    // Фильтрация по оператору
    if (operator) {
        if (operator === 'ai') {
            filteredData = filteredData.filter(event => event.operator === 'Автоматически');
        } else if (operator) {
            // Для простоты фильтруем только по Иванову
            filteredData = filteredData.filter(event => event.operator === 'Иванов А.С.');
        }
    }
    
    // Фильтрация по уверенности
    if (confidence) {
        if (confidence === 'high') {
            filteredData = filteredData.filter(event => event.confidence > 0.9);
        } else if (confidence === 'medium') {
            filteredData = filteredData.filter(event => event.confidence >= 0.75 && event.confidence <= 0.9);
        } else if (confidence === 'low') {
            filteredData = filteredData.filter(event => event.confidence < 0.75);
        }
    }
    
    // Обновление таблицы
    updateTableWithFilteredData(filteredData);
    
    // Обновление счетчика записей
    document.getElementById('recordCount').textContent = `Найдено ${filteredData.length} записей`;
}

// Обновление таблицы отфильтрованными данными
function updateTableWithFilteredData(data) {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 40px; color: #8fb4d9;">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i>
                <div>По заданным фильтрам записей не найдено</div>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    // Отображаем только первые 20 записей для примера
    const displayData = data.slice(0, 20);
    
    displayData.forEach((event, index) => {
        const row = document.createElement('tr');
        
        let confidenceClass = 'low-confidence';
        if (event.confidence > 0.9) {
            confidenceClass = 'high-confidence';
        } else if (event.confidence > 0.8) {
            confidenceClass = 'medium-confidence';
        }
        
        const confidencePercent = Math.round(event.confidence * 100);
        
        let statusBadge = '';
        if (event.status === 'confirmed') {
            statusBadge = '<span class="status-badge status-confirmed">Подтверждено</span>';
        } else if (event.status === 'rejected') {
            statusBadge = '<span class="status-badge status-rejected">Отклонено</span>';
        } else {
            statusBadge = '<span class="status-badge status-pending">Ожидает</span>';
        }
        
        let operatorAvatar = '';
        let operatorName = event.operator;
        
        if (event.operator === 'Иванов А.С.') {
            operatorAvatar = '<div class="operator-avatar">И</div>';
        } else if (event.operator === 'Петров В.И.') {
            operatorAvatar = '<div class="operator-avatar">П</div>';
        } else if (event.operator === 'Сидорова Е.П.') {
            operatorAvatar = '<div class="operator-avatar">С</div>';
        } else {
            operatorAvatar = '<div class="operator-avatar"><i class="fas fa-robot"></i></div>';
        }
        
        row.innerHTML = `
            <td class="time-cell">${event.time}</td>
            <td class="id-cell">${event.id}</td>
            <td>
                <div class="confidence-cell">
                    <div class="confidence-bar">
                        <div class="confidence-fill ${confidenceClass}" style="width: ${confidencePercent}%"></div>
                    </div>
                    <span>${confidencePercent}%</span>
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div class="operator-cell">
                    ${operatorAvatar}
                    <span>${operatorName}</span>
                </div>
            </td>
            <td class="comment-cell" id="filtered-comment-${index}">${event.comment}</td>
            <td class="action-cell">
                <button class="action-btn" title="Просмотреть детали" onclick="viewEventDetails(${journalData.indexOf(event)})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" title="Развернуть комментарий" onclick="toggleFilteredComment(${index})">
                    <i class="fas fa-expand-alt"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function toggleFilteredComment(index) {
    const commentCell = document.getElementById(`filtered-comment-${index}`);
    commentCell.classList.toggle('expanded');
    
    const btn = commentCell.parentElement.querySelector('.fa-expand-alt').parentElement;
    if (commentCell.classList.contains('expanded')) {
        btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
        btn.title = 'Свернуть комментарий';
    } else {
        btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
        btn.title = 'Развернуть комментарий';
    }
}

// Сброс фильтров
function resetFilters() {
    document.getElementById('defectType').value = '';
    document.getElementById('status').value = '';
    document.getElementById('operator').value = '';
    document.getElementById('confidence').value = '';
    
    initJournalTable();
    document.getElementById('recordCount').textContent = `Загружено ${journalData.length} записей`;
}

// Генерация отчета
function generateReport(type) {
    const modal = document.getElementById('reportModal');
    const modalBody = document.getElementById('reportModalBody');
    
    let reportTitle = '';
    let reportContent = '';
    
    if (type === 'defectReport') {
        reportTitle = 'Сводный отчет по браку';
        reportContent = `
            <div class="report-preview">
                <div class="report-title">${reportTitle}</div>
                <div class="report-period">Период: 01.06.2023 - 30.06.2023</div>
                
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="report-stat-value">1,247</div>
                        <div class="report-stat-label">Проверено слитков</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-value">18</div>
                        <div class="report-stat-label">Выявлено дефектов</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-value">1.44%</div>
                        <div class="report-stat-label">Процент брака</div>
                    </div>
                </div>
                
                <div class="report-chart">
                    <div class="chart-placeholder">
                        <i class="fas fa-chart-bar"></i>
                        <div>Диаграмма распределения дефектов по типам</div>
                        <div style="font-size: 0.9rem; margin-top: 10px;">(В реальной системе здесь будет график)</div>
                    </div>
                </div>
                
                <h3 style="color: #e0e0e0; margin-bottom: 15px;">Распределение по типам дефектов:</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="background-color: rgba(40, 60, 85, 0.8); padding: 15px; border-radius: 6px;">
                        <div style="font-weight: 600; color: #4dabf7;">Трещины</div>
                        <div style="font-size: 1.2rem; margin-top: 5px;">12 (66.7%)</div>
                    </div>
                    <div style="background-color: rgba(40, 60, 85, 0.8); padding: 15px; border-radius: 6px;">
                        <div style="font-weight: 600; color: #4dabf7;">Пористость</div>
                        <div style="font-size: 1.2rem; margin-top: 5px;">3 (16.7%)</div>
                    </div>
                    <div style="background-color: rgba(40, 60, 85, 0.8); padding: 15px; border-radius: 6px;">
                        <div style="font-weight: 600; color: #4dabf7;">Включения</div>
                        <div style="font-size: 1.2rem; margin-top: 5px;">2 (11.1%)</div>
                    </div>
                    <div style="background-color: rgba(40, 60, 85, 0.8); padding: 15px; border-radius: 6px;">
                        <div style="font-weight: 600; color: #4dabf7;">Царапины</div>
                        <div style="font-size: 1.2rem; margin-top: 5px;">1 (5.6%)</div>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'trendReport') {
        reportTitle = 'Динамика дефектов по сменам';
        reportContent = `
            <div class="report-preview">
                <div class="report-title">${reportTitle}</div>
                <div class="report-period">Период: 01.06.2023 - 30.06.2023</div>
                
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="report-stat-value">-2</div>
                        <div class="report-stat-label">Изменение за месяц</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-value">1.44%</div>
                        <div class="report-stat-label">Средний % брака</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-value">3</div>
                        <div class="report-stat-label">Пиковых значений</div>
                    </div>
                </div>
                
                <div class="report-chart">
                    <div class="chart-placeholder">
                        <i class="fas fa-chart-line"></i>
                        <div>График изменения количества дефектов по сменам</div>
                        <div style="font-size: 0.9rem; margin-top: 10px;">(В реальной системе здесь будет график трендов)</div>
                    </div>
                </div>
                
                <h3 style="color: #e0e0e0; margin-bottom: 15px;">Статистика по сменам:</h3>
                <div style="background-color: rgba(40, 60, 85, 0.8); padding: 20px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(60, 120, 180, 0.2);">
                        <div style="font-weight: 600; color: #b0c4de;">Смена</div>
                        <div style="font-weight: 600; color: #b0c4de;">Дефектов</div>
                        <div style="font-weight: 600; color: #b0c4de;">% брака</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div>Смена #1 (ночная)</div>
                        <div>7</div>
                        <div>1.8%</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div>Смена #2 (дневная)</div>
                        <div>5</div>
                        <div>1.2%</div>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <div>Смена #3 (вечерняя)</div>
                        <div>6</div>
                        <div>1.3%</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    modalBody.innerHTML = reportContent;
    modal.style.display = 'flex';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initJournalTable();
    
    // Обработчики фильтров
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Обработчики отчетов
    document.getElementById('defectReport').addEventListener('click', () => generateReport('defectReport'));
    document.getElementById('trendReport').addEventListener('click', () => generateReport('trendReport'));
    document.getElementById('operatorReport').addEventListener('click', () => generateReport('defectReport'));
    document.getElementById('systemReport').addEventListener('click', () => generateReport('defectReport'));
    document.getElementById('generateReport').addEventListener('click', () => generateReport('defectReport'));
    
    // Закрытие модального окна с отчетом
    document.getElementById('closeReportModal').addEventListener('click', function() {
        document.getElementById('reportModal').style.display = 'none';
    });
    
    document.getElementById('closeReportBtn').addEventListener('click', function() {
        document.getElementById('reportModal').style.display = 'none';
    });
    
    document.getElementById('reportModal').addEventListener('click', function(event) {
        if (event.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Экспорт данных
    document.getElementById('exportData').addEventListener('click', function() {
        alert('В реальной системе здесь будет экспорт данных в CSV/Excel формат');
    });
    
    // Печать отчета
    document.getElementById('printReport').addEventListener('click', function() {
        alert('В реальной системе здесь будет печать отчета');
    });
    
    // Экспорт отчета
    document.getElementById('exportReport').addEventListener('click', function() {
        alert('В реальной системе здесь будет экспорт отчета в Excel');
    });
    
    // Пагинация
    document.querySelectorAll('.page-btn').forEach(btn => {
        if (!btn.id) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // В реальной системе здесь будет загрузка соответствующей страницы данных
                const pageNum = this.textContent;
                document.querySelector('.pagination-info').textContent = 
                    `Показаны записи ${(parseInt(pageNum)-1)*20+1}-${parseInt(pageNum)*20} из 1247`;
            });
        }
    });
    
    document.getElementById('prevPage').addEventListener('click', function() {
        const activeBtn = document.querySelector('.page-btn.active');
        const currentPage = parseInt(activeBtn.textContent);
        
        if (currentPage > 1) {
            document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page-btn')[currentPage-1].classList.add('active');
            
            document.querySelector('.pagination-info').textContent = 
                `Показаны записи ${(currentPage-2)*20+1}-${(currentPage-1)*20} из 1247`;
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', function() {
        const activeBtn = document.querySelector('.page-btn.active');
        const currentPage = parseInt(activeBtn.textContent);
        
        if (currentPage < 5) {
            document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page-btn')[currentPage+1].classList.add('active');
            
            document.querySelector('.pagination-info').textContent = 
                `Показаны записи ${currentPage*20+1}-${(currentPage+1)*20} из 1247`;
        }
    });
    
    // Имитация выбора дат (в реальной системе можно использовать datepicker)
    document.getElementById('dateRange').addEventListener('click', function() {
        alert('В реальной системе здесь будет календарь для выбора диапазона дат');
    });
});