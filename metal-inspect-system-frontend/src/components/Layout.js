import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <strong>Metal Inspect System</strong>

        <nav style={{ display: "flex", gap: 10 }}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/journal">Journal</Link>
          <Link to="/ai">AI Panel</Link>
          <Link to="/account">Account</Link>
          <Link to="/stats">Stats</Link>
          <Link to="/settings">Settings</Link>
        </nav>

        <button style={{ marginLeft: "auto" }} onClick={logout}>
          Logout
        </button>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
