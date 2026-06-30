import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

/**
 * Guard component that restricts subroutes based on user roles.
 * Redirects unauthorized users to the dashboard home page.
 */
export function RequireRole({ roles, children }) {
  const { role, user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!roles.includes(role)) {
    return <Navigate to="/dashboard/home" replace />;
  }

  return children;
}
