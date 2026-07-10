import api from "./auth.js";

// ─── Subscription API Functions ──────────────────────────────────

export const createSubscription = async (planKey, period) => {
  const response = await api.post("/api/subscription/create", { planKey, period });
  return response.data;
};

export const verifyPayment = async (data) => {
  const response = await api.post("/api/subscription/verify", data);
  return response.data;
};

export const getSubscription = async () => {
  const response = await api.get("/api/subscription");
  return response.data;
};

export const cancelSubscription = async () => {
  const response = await api.post("/api/subscription/cancel");
  return response.data;
};

export const getInvoices = async () => {
  const response = await api.get("/api/subscription/invoices");
  return response.data;
};

export const getPlans = async () => {
  const response = await api.get("/api/subscription/plans");
  return response.data;
};
