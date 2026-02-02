import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./components/Auth";
import Dashboard from "./components/DashboardPage";
import Journal from "./components/JournalPage";
import Account from "./components/AccountPage";
import AiPanel from "./components/AiPanelPage";
import Settings from "./components/SettingsPage";
import Stats from "./components/StatisticPage";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  return token ? children : <Navigate to="/auth" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />

      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/journal" element={<PrivateRoute><Journal /></PrivateRoute>} />
      <Route path="/ai-panel" element={<PrivateRoute><AiPanel /></PrivateRoute>} />
      <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
