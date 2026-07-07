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

// ─── Flag to prevent multiple refresh calls at once ──────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
}

// ─── Response Interceptor: auto-refresh on 401 ──────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 with TOKEN_EXPIRED and not already retried
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Redirect to login on refresh failure
        window.location.href = "/auth";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
  const response = await api.post("/auth/refresh");
  return response.data;
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

export const getGoogleLoginUrl = async () => {
  const response = await api.get("/auth/google/login-url");
  return response.data;
};

// ─── GitHub OAuth API Functions ──────────────────────────────

export const getGithubLoginUrl = async () => {
  const response = await api.get("/auth/github/login-url");
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
