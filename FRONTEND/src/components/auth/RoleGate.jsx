import React from "react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Gate component to conditionally render parts of the UI based on user role.
 */
export function RoleGate({ roles, children }) {
  const { role } = useAuth();

  if (!roles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
