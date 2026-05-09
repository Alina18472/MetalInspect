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
import PermissionRoute from "./components/PermissionRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />

      <Route
        path="/dashboard"
        element={
          <PermissionRoute permission="dashboard.view">
            <Dashboard />
          </PermissionRoute>
        }
      />

      <Route
        path="/journal"
        element={
          <PermissionRoute permission="journal.view">
            <Journal />
          </PermissionRoute>
        }
      />

      <Route
        path="/ai-panel"
        element={
          <PermissionRoute permission="ai_models.view">
            <AiPanel />
          </PermissionRoute>
        }
      />

      <Route
        path="/stats"
        element={
          <PermissionRoute permission="stats.view">
            <Stats />
          </PermissionRoute>
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