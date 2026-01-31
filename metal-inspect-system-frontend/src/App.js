import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/DashboardPage';
import Journal from './components/JournalPage';
import AiPanel from './components/AiPanelPage';
import Statistic from './components/StatisticPage';
import Settings from './components/SettingsPage';
import Account from './components/AccountPage';
import Auth from './components/Auth';


function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Проверяем авторизацию при загрузке приложения
        const authStatus = localStorage.getItem('isAuthenticated');
        setIsAuthenticated(authStatus === 'true');
        setLoading(false);
    }, []);

    const PrivateRoute = ({ children }) => {
        return isAuthenticated ? children : <Navigate to="/login" />;
    };

    const PublicRoute = ({ children }) => {
        return !isAuthenticated ? children : <Navigate to="/dashboard" />;
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <i className="fas fa-spinner fa-spin"></i>
                <div>Загрузка приложения...</div>
            </div>
        );
    }

    return (
        <Router>
            <div className="App">
                <Routes>
                    {/* Публичные маршруты */}
                    <Route path="/login" element={
                        <PublicRoute>
                            <Auth />
                        </PublicRoute>
                    } />
                    
                    {/* Приватные маршруты */}
                    <Route path="/dashboard" element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    } />
                    
                    <Route path="/journal" element={
                        <PrivateRoute>
                            <Journal />
                        </PrivateRoute>
                    } />
                    
                    <Route path="/ai-panel" element={
                        <PrivateRoute>
                            <AiPanel />
                        </PrivateRoute>
                    } />
                    
                    <Route path="/statistic" element={
                        <PrivateRoute>
                            <Statistic />
                        </PrivateRoute>
                    } />
                    
                    <Route path="/settings" element={
                        <PrivateRoute>
                            <Settings />
                        </PrivateRoute>
                    } />
                    
                    <Route path="/account" element={
                        <PrivateRoute>
                            <Account />
                        </PrivateRoute>
                    } />
                    
                    {/* Реддиректы */}
                    <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;