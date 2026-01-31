import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Импорт стилей
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/journal.css';
import './styles/ai_panel.css';
import './styles/statistic.css';
import './styles/settings.css';
import './styles/account.css';

// Импорт иконок Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

// Добавляем все solid иконки в библиотеку
library.add(fas);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);