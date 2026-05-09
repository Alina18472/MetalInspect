
import React from "react";
import { Navigate } from "react-router-dom";

export default function RoleRoute({ allow, children }) {
  const token = localStorage.getItem("access_token");
  const roleId = Number(localStorage.getItem("role_id")); 

  if (!token) return <Navigate to="/auth" replace />;


  if (!allow.includes(roleId)) {

    return <Navigate to={roleId === 1 ? "/admin/account" : "/account"} replace />;
  }

  return children;
}
