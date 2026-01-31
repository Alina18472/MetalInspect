// import React, { useState, useEffect } from 'react';
// import '../styles/dashboard.css';

// const Dashboard = () => {
//     const [aiDetections, setAiDetections] = useState([
//         { id: 1, x: 120, y: 80, width: 180, height: 120, confidence: 0.96, type: 'трещина' },
//         { id: 2, x: 350, y: 150, width: 140, height: 90, confidence: 0.87, type: 'трещина' },
//         { id: 3, x: 600, y: 200, width: 200, height: 110, confidence: 0.92, type: 'трещина' },
//         { id: 4, x: 850, y: 100, width: 160, height: 100, confidence: 0.78, type: 'подозрение' }
//     ]);

//     const [eventsData, setEventsData] = useState([
//         { time: "14:23:17", id: "SL-4829", confidence: 0.96 },
//         { time: "14:21:05", id: "SL-4827", confidence: 0.87 },
//         { time: "14:18:42", id: "SL-4824", confidence: 0.92 },
//         { time: "14:15:33", id: "SL-4821", confidence: 0.78 },
//         { time: "14:12:19", id: "SL-4818", confidence: 0.95 },
//         { time: "14:09:05", id: "SL-4815", confidence: 0.81 },
//         { time: "14:05:47", id: "SL-4812", confidence: 0.89 },
//         { time: "14:02:31", id: "SL-4809", confidence: 0.93 },
//         { time: "13:58:22", id: "SL-4805", confidence: 0.84 },
//         { time: "13:54:10", id: "SL-4801", confidence: 0.91 }
//     ]);

//     const [stats, setStats] = useState({
//         totalIngots: 1247,
//         defectsFound: 18,
//         defectRate: 1.44,
//         avgConfidence: 94.7
//     });

//     const [isPaused, setIsPaused] = useState(false);
//     const [selectedEvent, setSelectedEvent] = useState(null);
//     const [isModalOpen, setIsModalOpen] = useState(false);

//     useEffect(() => {
//         // Автоматическое обновление статистики
//         const statsInterval = setInterval(updateStats, 5000);
        
//         // Имитация динамического добавления нового события
//         const eventsInterval = setInterval(() => {
//             if (Math.random() > 0.7 && !isPaused) {
//                 addNewEvent();
//             }
//         }, 10000);

//         return () => {
//             clearInterval(statsInterval);
//             clearInterval(eventsInterval);
//         };
//     }, [isPaused]);

//     const updateStats = () => {
//         if (isPaused) return;
        
//         setStats(prev => {
//             const newIngots = prev.totalIngots + Math.floor(Math.random() * 3) + 1;
//             const newDefects = prev.defectsFound + (Math.random() > 0.7 ? 1 : 0);
//             const newRate = ((newDefects / newIngots) * 100).toFixed(2);
//             const newConfidence = prev.avgConfidence + (Math.random() > 0.5 ? 0.1 : -0.1);
            
//             return {
//                 totalIngots: newIngots,
//                 defectsFound: newDefects,
//                 defectRate: parseFloat(newRate),
//                 avgConfidence: parseFloat(newConfidence.toFixed(1))
//             };
//         });
//     };

//     const addNewEvent = () => {
//         const now = new Date();
//         const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
//                          now.getMinutes().toString().padStart(2, '0') + ':' + 
//                          now.getSeconds().toString().padStart(2, '0');
        
//         const newId = `SL-${Math.floor(Math.random() * 1000) + 4830}`;
//         const newConfidence = Math.random() * 0.2 + 0.75;
        
//         const newEvent = {
//             time: timeString,
//             id: newId,
//             confidence: newConfidence
//         };
        
//         setEventsData(prev => [newEvent, ...prev.slice(0, 9)]);
//     };

//     const openEventDetails = (event) => {
//         setSelectedEvent(event);
//         setIsModalOpen(true);
//     };

//     const handlePauseToggle = () => {
//         setIsPaused(!isPaused);
//     };

//     const refreshEvents = () => {
//         // Здесь можно добавить логику обновления событий с сервера
//         console.log('Обновление событий...');
//     };

//     const getConfidenceClass = (confidence) => {
//         if (confidence > 0.9) return 'high-confidence';
//         if (confidence > 0.8) return 'medium-confidence';
//         return 'low-confidence';
//     };

//     const getCriticalityClass = (confidence) => {
//         if (confidence > 0.9) return 'detail-critical';
//         if (confidence > 0.8) return 'detail-warning';
//         return 'detail-ok';
//     };

//     const getCriticalityText = (confidence) => {
//         if (confidence > 0.9) return 'Высокая';
//         if (confidence > 0.8) return 'Средняя';
//         return 'Низкая';
//     };

//     return (
//         <div className="container">
//             {/* Шапка */}
//             <div className="header">
//                 <div className="logo-section">
//                     <div className="logo-icon">
//                         <i className="fas fa-industry"></i>
//                     </div>
//                     <div className="logo-text">
//                         <h1>Metal Inspect</h1>
//                         <div className="subtitle">Система распознавания трещин в слитках • Главный экран оператора</div>
//                     </div>
//                 </div>
                
//                 <div className="system-status">
//                     <div className={`pulse ${isPaused ? 'pulse-inactive' : ''}`}></div>
//                     <span>{isPaused ? 'Пауза • ' : 'AI-модель активна • '}32 FPS • Камера #4</span>
//                 </div>
                
//                 <div className="user-info">
//                     <div className="user-avatar">
//                         <i className="fas fa-user"></i>
//                     </div>
//                     <div>
//                         <div className="user-name">Оператор Иванов А.С.</div>
//                         <div className="user-role">Смена #3 • 08:00-20:00</div>
//                     </div>
//                 </div>
//             </div>
            
//             {/* Основное содержимое */}
//             <div className="main-content">
//                 {/* Левая панель - видеопоток */}
//                 <div className="video-panel">
//                     <div className="video-header">
//                         <h2><i className="fas fa-video"></i> Видеопоток с камеры контроля</h2>
//                         <div className="camera-info">
//                             <i className="fas fa-camera"></i>
//                             <span>Камера #4 • Линия разливки • Разрешение: 1920x1080</span>
//                         </div>
//                     </div>
                    
//                     <div className="video-container">
//                         <div className="video-placeholder">
//                             {/* Здесь будет реальный видеопоток */}
//                             <div className="video-simulated">
//                                 <div className="ingot-simulation">
//                                     {[...Array(4)].map((_, i) => (
//                                         <div key={i} className="ingot"></div>
//                                     ))}
//                                 </div>
//                             </div>
//                         </div>
                        
//                         {/* Наложение с результатами ИИ */}
//                         <div className="video-overlay">
//                             {aiDetections.map(detection => (
//                                 <div
//                                     key={detection.id}
//                                     className="ai-box"
//                                     style={{
//                                         left: `${detection.x}px`,
//                                         top: `${detection.y}px`,
//                                         width: `${detection.width}px`,
//                                         height: `${detection.height}px`,
//                                         borderColor: detection.confidence > 0.9 ? '#f44336' : 
//                                                     detection.confidence > 0.8 ? '#ff9800' : '#4CAF50'
//                                     }}
//                                     onClick={() => openEventDetails(detection)}
//                                 >
//                                     <div className="confidence-label">
//                                         {Math.round(detection.confidence * 100)}% {detection.type}
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
                    
//                     <div className="video-controls">
//                         <div>
//                             <button 
//                                 className={`control-btn ${isPaused ? 'paused' : ''}`}
//                                 onClick={handlePauseToggle}
//                             >
//                                 <i className={`fas fa-${isPaused ? 'play' : 'pause'}`}></i>
//                                 {isPaused ? ' Возобновить' : ' Приостановить'}
//                             </button>
//                             <button className="control-btn secondary">
//                                 <i className="fas fa-flag"></i> Пометить дефект
//                             </button>
//                             <button className="control-btn secondary">
//                                 <i className="fas fa-sliders-h"></i> Калибровка
//                             </button>
//                         </div>
                        
//                         <div className="fps-indicator">
//                             <i className="fas fa-tachometer-alt"></i>
//                             Обработка: {isPaused ? '0' : '32'} кадра/сек • Задержка: 47 мс
//                         </div>
//                     </div>
//                 </div>
                
//                 {/* Правая панель - статистика и события */}
//                 <div className="stats-panel">
//                     {/* Блок статистики */}
//                     <div className="stats-container">
//                         <div className="panel-header">
//                             <h2><i className="fas fa-chart-bar"></i> Текущая статистика</h2>
//                             <div style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>Смена #3</div>
//                         </div>
                        
//                         <div className="stats-content">
//                             <div className="stat-card">
//                                 <div className="stat-value">{stats.totalIngots.toLocaleString()}</div>
//                                 <div className="stat-label">Проверено слитков</div>
//                                 <div className="stat-trend trend-up">
//                                     <i className="fas fa-arrow-up"></i> +12 за 5 мин
//                                 </div>
//                             </div>
                            
//                             <div className="stat-card">
//                                 <div className="stat-value">{stats.defectsFound}</div>
//                                 <div className="stat-label">Выявлено дефектов</div>
//                                 <div className="stat-trend trend-down">
//                                     <i className="fas fa-arrow-down"></i> -2 за час
//                                 </div>
//                             </div>
                            
//                             <div className="stat-card">
//                                 <div className="stat-value">{stats.defectRate.toFixed(2)}%</div>
//                                 <div className="stat-label">Процент брака</div>
//                                 <div className="stat-trend trend-down">
//                                     <i className="fas fa-arrow-down"></i> -0.3% за смену
//                                 </div>
//                             </div>
                            
//                             <div className="stat-card">
//                                 <div className="stat-value">{stats.avgConfidence.toFixed(1)}%</div>
//                                 <div className="stat-label">Средняя уверенность</div>
//                                 <div className="stat-trend trend-up">
//                                     <i className="fas fa-arrow-up"></i> +1.2% за день
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
                    
//                     {/* Блок событий */}
//                     <div className="events-container">
//                         <div className="panel-header">
//                             <h2><i className="fas fa-history"></i> Последние события</h2>
//                             <div style={{ color: '#8fb4d9', fontSize: '0.9rem' }}>
//                                 <i 
//                                     className="fas fa-sync-alt" 
//                                     style={{ cursor: 'pointer' }}
//                                     onClick={refreshEvents}
//                                 ></i>
//                             </div>
//                         </div>
                        
//                         <div className="events-content">
//                             <table className="events-table">
//                                 <thead>
//                                     <tr>
//                                         <th>Время</th>
//                                         <th>ID слитка</th>
//                                         <th>Уверенность</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {eventsData.map((event, index) => (
//                                         <tr 
//                                             key={index}
//                                             onClick={() => openEventDetails(event)}
//                                             className="event-row"
//                                         >
//                                             <td className="event-time">{event.time}</td>
//                                             <td className="event-id">{event.id}</td>
//                                             <td>
//                                                 <div className="confidence-cell">
//                                                     <div className="confidence-bar">
//                                                         <div 
//                                                             className={`confidence-fill ${getConfidenceClass(event.confidence)}`}
//                                                             style={{ width: `${Math.round(event.confidence * 100)}%` }}
//                                                         ></div>
//                                                     </div>
//                                                     <span>{Math.round(event.confidence * 100)}%</span>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Модальное окно детализации события */}
//             {isModalOpen && selectedEvent && (
//                 <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
//                     <div className="modal-content" onClick={e => e.stopPropagation()}>
//                         <div className="modal-header">
//                             <h3>Детализация дефекта</h3>
//                             <button className="close-modal" onClick={() => setIsModalOpen(false)}>
//                                 &times;
//                             </button>
//                         </div>
//                         <div className="modal-body">
//                             <div className="detail-image">
//                                 <div style={{ textAlign: 'center', color: '#8fb4d9', padding: '20px' }}>
//                                     <i className="fas fa-image" style={{ fontSize: '3rem', marginBottom: '15px' }}></i>
//                                     <div>Изображение слитка {selectedEvent.id}</div>
//                                     <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>
//                                         Обнаружена {selectedEvent.type || 'трещина'}
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="detail-info">
//                                 <h3 style={{ color: '#e0e0e0', marginBottom: '10px' }}>Информация о дефекте</h3>
                                
//                                 <div className="detail-row">
//                                     <span className="detail-label">ID слитка:</span>
//                                     <span className="detail-value">{selectedEvent.id || 'SL-4829'}</span>
//                                 </div>
                                
//                                 <div className="detail-row">
//                                     <span className="detail-label">Время обнаружения:</span>
//                                     <span className="detail-value">{selectedEvent.time || '14:23:17'}</span>
//                                 </div>
                                
//                                 <div className="detail-row">
//                                     <span className="detail-label">Уверенность ИИ:</span>
//                                     <span className={`detail-value ${getCriticalityClass(selectedEvent.confidence)}`}>
//                                         {Math.round((selectedEvent.confidence || 0.96) * 100)}%
//                                     </span>
//                                 </div>
                                
//                                 <div className="detail-row">
//                                     <span className="detail-label">Критичность:</span>
//                                     <span className={`detail-value ${getCriticalityClass(selectedEvent.confidence)}`}>
//                                         {getCriticalityText(selectedEvent.confidence)}
//                                     </span>
//                                 </div>
                                
//                                 <div className="detail-row">
//                                     <span className="detail-label">Тип дефекта:</span>
//                                     <span className="detail-value">{selectedEvent.type || 'Продольная трещина'}</span>
//                                 </div>
                                
//                                 <div className="detail-row">
//                                     <span className="detail-label">Размер:</span>
//                                     <span className="detail-value">
//                                         ~{selectedEvent.width ? `${selectedEvent.width}x${selectedEvent.height} px` : '180x120 px'}
//                                     </span>
//                                 </div>
                                
//                                 <div className="detail-row">
//                                     <span className="detail-label">Статус проверки:</span>
//                                     <span className="detail-value detail-warning">Требует подтверждения оператором</span>
//                                 </div>
                                
//                                 <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(60, 120, 180, 0.3)' }}>
//                                     <button className="control-btn" style={{ width: '100%', marginBottom: '10px' }}>
//                                         <i className="fas fa-check-circle"></i> Подтвердить дефект
//                                     </button>
//                                     <button className="control-btn secondary" style={{ width: '100%' }}>
//                                         <i className="fas fa-times-circle"></i> Отметить как ложное срабатывание
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Dashboard;
import React, { useState, useEffect } from "react";
// import "../styles/dashboard.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/Api";

const Dashboard = () => {
  const { userEmail, logout } = useAuth();

  const [aiDetections] = useState([
    { id: 1, x: 120, y: 80, width: 180, height: 120, confidence: 0.96, type: "трещина" },
    { id: 2, x: 350, y: 150, width: 140, height: 90, confidence: 0.87, type: "трещина" },
    { id: 3, x: 600, y: 200, width: 200, height: 110, confidence: 0.92, type: "трещина" },
    { id: 4, x: 850, y: 100, width: 160, height: 100, confidence: 0.78, type: "подозрение" },
  ]);

  const [eventsData, setEventsData] = useState([
    { time: "14:23:17", id: "SL-4829", confidence: 0.96 },
    { time: "14:21:05", id: "SL-4827", confidence: 0.87 },
    { time: "14:18:42", id: "SL-4824", confidence: 0.92 },
    { time: "14:15:33", id: "SL-4821", confidence: 0.78 },
    { time: "14:12:19", id: "SL-4818", confidence: 0.95 },
    { time: "14:09:05", id: "SL-4815", confidence: 0.81 },
    { time: "14:05:47", id: "SL-4812", confidence: 0.89 },
    { time: "14:02:31", id: "SL-4809", confidence: 0.93 },
    { time: "13:58:22", id: "SL-4805", confidence: 0.84 },
    { time: "13:54:10", id: "SL-4801", confidence: 0.91 },
  ]);

  const [stats, setStats] = useState({
    totalIngots: 1247,
    defectsFound: 18,
    defectRate: 1.44,
    avgConfidence: 94.7,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const statsInterval = setInterval(updateStats, 5000);

    const eventsInterval = setInterval(() => {
      if (Math.random() > 0.7 && !isPaused) addNewEvent();
    }, 10000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(eventsInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  // (Опционально) Пример защищённого запроса: если 401 — разлогинить
  // useEffect(() => {
  //   api.getDashboard()
  //     .then(console.log)
  //     .catch((e) => {
  //       if (e.status === 401) logout();
  //     });
  // }, [logout]);

  const updateStats = () => {
    if (isPaused) return;

    setStats((prev) => {
      const newIngots = prev.totalIngots + Math.floor(Math.random() * 3) + 1;
      const newDefects = prev.defectsFound + (Math.random() > 0.7 ? 1 : 0);
      const newRate = ((newDefects / newIngots) * 100).toFixed(2);
      const newConfidence = prev.avgConfidence + (Math.random() > 0.5 ? 0.1 : -0.1);

      return {
        totalIngots: newIngots,
        defectsFound: newDefects,
        defectRate: parseFloat(newRate),
        avgConfidence: parseFloat(newConfidence.toFixed(1)),
      };
    });
  };

  const addNewEvent = () => {
    const now = new Date();
    const timeString =
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0") +
      ":" +
      now.getSeconds().toString().padStart(2, "0");

    const newId = `SL-${Math.floor(Math.random() * 1000) + 4830}`;
    const newConfidence = Math.random() * 0.2 + 0.75;

    const newEvent = { time: timeString, id: newId, confidence: newConfidence };
    setEventsData((prev) => [newEvent, ...prev.slice(0, 9)]);
  };

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handlePauseToggle = () => setIsPaused((v) => !v);

  const refreshEvents = () => {
    console.log("Обновление событий...");
    // позже: дернуть API и обновить eventsData
  };

  const getConfidenceClass = (confidence) => {
    if (confidence > 0.9) return "high-confidence";
    if (confidence > 0.8) return "medium-confidence";
    return "low-confidence";
  };

  const getCriticalityClass = (confidence) => {
    if (confidence > 0.9) return "detail-critical";
    if (confidence > 0.8) return "detail-warning";
    return "detail-ok";
  };

  const getCriticalityText = (confidence) => {
    if (confidence > 0.9) return "Высокая";
    if (confidence > 0.8) return "Средняя";
    return "Низкая";
  };

  return (
    <div className="container">
      <div className="header">
        <div className="logo-section">
          <div className="logo-icon">
            <i className="fas fa-industry"></i>
          </div>
          <div className="logo-text">
            <h1>Metal Inspect</h1>
            <div className="subtitle">Система распознавания трещин в слитках • Главный экран оператора</div>
          </div>
        </div>

        <div className="system-status">
          <div className={`pulse ${isPaused ? "pulse-inactive" : ""}`}></div>
          <span>{isPaused ? "Пауза • " : "AI-модель активна • "}32 FPS • Камера #4</span>
        </div>

        <div className="user-info" style={{ gap: 10 }}>
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div>
            <div className="user-name">{userEmail || "Пользователь"}</div>
            <div className="user-role">Смена #3 • 08:00-20:00</div>
          </div>
          <button onClick={logout} className="control-btn secondary" style={{ marginLeft: 12 }}>
            <i className="fas fa-sign-out-alt"></i> Выйти
          </button>
        </div>
      </div>

      {/* остальная твоя разметка без изменений */}
      {/* ... */}
      {/* (я не дублирую весь код ниже, чтобы не раздувать ответ;
          можешь оставить всё как есть, только поменять header как выше) */}

      {/* Модалка оставь как у тебя */}
      {isModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Детализация дефекта</h3>
              <button className="close-modal" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-image">
                <div style={{ textAlign: "center", color: "#8fb4d9", padding: "20px" }}>
                  <i className="fas fa-image" style={{ fontSize: "3rem", marginBottom: "15px" }}></i>
                  <div>Изображение слитка {selectedEvent.id}</div>
                  <div style={{ fontSize: "0.9rem", marginTop: "10px" }}>
                    Обнаружена {selectedEvent.type || "трещина"}
                  </div>
                </div>
              </div>
              <div className="detail-info">
                <h3 style={{ color: "#e0e0e0", marginBottom: "10px" }}>Информация о дефекте</h3>

                <div className="detail-row">
                  <span className="detail-label">ID слитка:</span>
                  <span className="detail-value">{selectedEvent.id || "SL-4829"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Время обнаружения:</span>
                  <span className="detail-value">{selectedEvent.time || "14:23:17"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Уверенность ИИ:</span>
                  <span className={`detail-value ${getCriticalityClass(selectedEvent.confidence)}`}>
                    {Math.round((selectedEvent.confidence || 0.96) * 100)}%
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Критичность:</span>
                  <span className={`detail-value ${getCriticalityClass(selectedEvent.confidence)}`}>
                    {getCriticalityText(selectedEvent.confidence)}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Тип дефекта:</span>
                  <span className="detail-value">{selectedEvent.type || "Продольная трещина"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Размер:</span>
                  <span className="detail-value">
                    ~{selectedEvent.width ? `${selectedEvent.width}x${selectedEvent.height} px` : "180x120 px"}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Статус проверки:</span>
                  <span className="detail-value detail-warning">Требует подтверждения оператором</span>
                </div>

                <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid rgba(60, 120, 180, 0.3)" }}>
                  <button className="control-btn" style={{ width: "100%", marginBottom: "10px" }}>
                    <i className="fas fa-check-circle"></i> Подтвердить дефект
                  </button>
                  <button className="control-btn secondary" style={{ width: "100%" }}>
                    <i className="fas fa-times-circle"></i> Отметить как ложное срабатывание
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
