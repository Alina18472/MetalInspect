import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PermissionRoute({ permission, children }) {
  const { isAuthenticated, permissions, roleId } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!permissions.includes(permission)) {
    return <Navigate to={roleId === 1 ? "/admin/account" : "/account"} replace />;
  }

  return children;
}