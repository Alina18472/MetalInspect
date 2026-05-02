//RoleRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

export default function RoleRoute({ allow, children }) {
  const token = localStorage.getItem("access_token");
  const roleId = Number(localStorage.getItem("role_id")); // 1 или 2

  if (!token) return <Navigate to="/auth" replace />;

  // если роль не подходит
  if (!allow.includes(roleId)) {
    // куда редиректить "не туда попал"
    return <Navigate to={roleId === 1 ? "/admin/account" : "/account"} replace />;
  }

  return children;
}
