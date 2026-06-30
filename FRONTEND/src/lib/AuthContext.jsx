import React, { createContext, useContext } from "react";
import { ROLES, PERMISSIONS, isRoleAtLeast } from "./rbacConstants.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ userProfile, setUserProfile, children }) => {
  const role = userProfile?.role || "user";

  const hasRole = (minimumRole) => {
    return isRoleAtLeast(role, minimumRole);
  };

  const hasPermission = (permission) => {
    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles ? allowedRoles.includes(role) : false;
  };

  const isAdmin = () => role === ROLES.ADMIN;
  const isModerator = () => [ROLES.MODERATOR, ROLES.ADMIN].includes(role);

  return (
    <AuthContext.Provider
      value={{
        user: userProfile,
        setUser: setUserProfile,
        role,
        hasRole,
        hasPermission,
        isAdmin,
        isModerator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export default AuthContext;
