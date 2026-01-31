import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Здесь обычно будет отправка данных на сервер
        // В данном примере просто имитируем авторизацию
        
        setTimeout(() => {
            if (username && password) {
                // Успешная авторизация
                console.log(`Авторизация успешна: ${username}`);
                
                // В реальном приложении здесь будет сохранение токена/сессии
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('username', username);
                
                // Перенаправление на главную страницу
                navigate('/dashboard');
            } else {
                // Ошибка авторизации
                setError('Неверное имя пользователя или пароль');
            }
            setIsLoading(false);
        }, 1500);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="login-container">
            <div className="header">
                <div className="logo">
                    <h1>Metal Inspect</h1>
                    <div className="subtitle">Система распознавания трещин в слитках</div>
                </div>
            </div>
            
            <div className="form-container">
                <form onSubmit={handleSubmit} id="loginForm">
                    {error && (
                        <div className="error-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="input-group">
                        <label htmlFor="username">
                            <i className="fas fa-user"></i> Логин
                        </label>
                        <div className="input-icon">
                            <i className="fas fa-user"></i>
                        </div>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            placeholder="Введите ваш логин" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="password">
                            <i className="fas fa-lock"></i> Пароль
                        </label>
                        <div className="input-icon">
                            <i className="fas fa-lock"></i>
                        </div>
                        <input 
                            type={showPassword ? "text" : "password"}
                            id="password" 
                            name="password" 
                            placeholder="Введите ваш пароль" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                        <div 
                            className="password-toggle" 
                            id="togglePassword"
                            onClick={togglePasswordVisibility}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        className={`login-btn ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Проверка данных...
                            </>
                        ) : (
                            'Войти в систему'
                        )}
                    </button>
                </form>
            </div>
            
            <div className="footer">
                <p style={{ marginTop: '15px' }}>
                    Для доступа к системе требуется авторизация.<br />
                    Обратитесь к администратору для получения учетных данных.
                </p>
                <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>© 2026 Metal Inspect.</p>
            </div>
        </div>
    );
};

export default Auth;