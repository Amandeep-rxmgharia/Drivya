import api from "./auth.js";

// ─── Account API Functions ───────────────────────────────────

export const getProfile = async () => {
  const response = await api.get("/api/account/profile");
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.patch("/api/account/profile", data);
  return response.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await api.post("/api/account/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteAvatar = async () => {
  const response = await api.delete("/api/account/avatar");
  return response.data;
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.put("/api/account/password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const deleteAccount = async (password) => {
  const response = await api.delete("/api/account", {
    data: { password },
  });
  return response.data;
};
