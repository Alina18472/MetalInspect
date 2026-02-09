
import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./components/Auth";
import Dashboard from "./components/DashboardPage";
import Journal from "./components/JournalPage";
import Account from "./components/AccountPage";
import AiPanel from "./components/AiPanelPage";
import Settings from "./components/SettingsPage";
import Stats from "./components/StatisticPage";
import AdminAccount from "./components/AdminAccountPage";
import RoleRoute from "./components/RoleRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />

      <Route
        path="/dashboard"
        element={
          <RoleRoute allow={[1, 2]}>
            <Dashboard />
          </RoleRoute>
        }
      />

      <Route
        path="/journal"
        element={
          <RoleRoute allow={[1, 2]}>
            <Journal />
          </RoleRoute>
        }
      />

      <Route
        path="/ai-panel"
        element={
          <RoleRoute allow={[1, 2]}>
            <AiPanel />
          </RoleRoute>
        }
      />

      <Route
        path="/stats"
        element={
          <RoleRoute allow={[1, 2]}>
            <Stats />
          </RoleRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <RoleRoute allow={[1]}>
            <Settings />
          </RoleRoute>
        }
      />

      <Route
        path="/admin/account"
        element={
          <RoleRoute allow={[1]}>
            <AdminAccount />
          </RoleRoute>
        }
      />

      <Route
        path="/account"
        element={
          <RoleRoute allow={[2]}>
            <Account />
          </RoleRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
