import axios from "axios";

// ─── Axios Instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Response Interceptor: handle session expiry ──────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 (unauthorized or session expired) on a protected page, redirect to /auth
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isAuthPage = path.startsWith("/auth");
        const isPublicPage = path.startsWith("/s/") || path === "/";
        if (!isAuthPage && !isPublicPage) {
          window.location.href = "/auth";
        }
      }
    }

    return Promise.reject(error);
  },
);

// ─── Auth API Functions ──────────────────────────────────────

export const registerUser = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await api.post("/auth/login", userData);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const refreshToken = async () => {
  // Single session token in use; no token refresh needed
  return { message: "Single session token in use." };
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// ─── 2FA (TOTP) API Functions ────────────────────────────────

export const setup2FA = async () => {
  const response = await api.post("/auth/2fa/setup");
  return response.data;
};

export const verify2FA = async ({ code }) => {
  const response = await api.post("/auth/2fa/verify", { code });
  return response.data;
};

export const regenerateBackupCodes = async ({ code }) => {
  const response = await api.post("/auth/2fa/backup-codes/regenerate", { code });
  return response.data;
};

export const loginVerify2FA = async ({ code }) => {
  const response = await api.post("/auth/2fa/login-verify", { code });
  return response.data;
};

export const disable2FA = async ({ code }) => {
  const response = await api.post("/auth/2fa/disable", { code });
  return response.data;
};

export const forgotPassword = async ({ email }) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const verifyResetOtp = async ({ email, otp }) => {
  const response = await api.post("/auth/verify-reset-otp", { email, otp });
  return response.data;
};

export const verifyReset2FA = async ({ resetToken, code }) => {
  const response = await api.post("/auth/verify-reset-2fa", { resetToken, code });
  return response.data;
};

export const resetPassword = async ({ resetToken, newPassword }) => {
  const response = await api.post("/auth/reset-password", { resetToken, newPassword });
  return response.data;
};

// ─── Google OAuth API Functions ──────────────────────────────

export const googleAuth = async ({ credential }) => {
  const response = await api.post("/auth/google", { credential });
  return response.data;
};

export const getGoogleLoginUrl = async ({ redirect } = {}) => {
  const params = redirect ? { redirect } : {};
  const response = await api.get("/auth/google/login-url", { params });
  return response.data;
};

// ─── GitHub OAuth API Functions ──────────────────────────────

export const getGithubLoginUrl = async ({ redirect } = {}) => {
  const params = redirect ? { redirect } : {};
  const response = await api.get("/auth/github/login-url", { params });
  return response.data;
};


// ─── Deactivated Account API Functions ──────────────────────

export const sendDeactivatedOtp = async ({ deactivatedToken }) => {
  const response = await api.post("/auth/deactivated/send-otp", { deactivatedToken });
  return response.data;
};

export const verifyDeactivatedOtp = async ({ deactivatedToken, otp }) => {
  const response = await api.post("/auth/deactivated/verify-otp", { deactivatedToken, otp });
  return response.data;
};

export const verifyDeactivated2FA = async ({ deactivatedToken, code }) => {
  const response = await api.post("/auth/deactivated/verify-2fa", { deactivatedToken, code });
  return response.data;
};

export const deleteDeactivatedAccount = async ({ deactivatedToken }) => {
  const response = await api.post("/auth/deactivated/delete", { deactivatedToken });
  return response.data;
};

export default api;
