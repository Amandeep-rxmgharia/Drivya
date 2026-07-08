import axios from "axios";

// ─── Axios Instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
    timeout: 20000,
    headers: {
        "Content-Type": "application/json",
    },
});

export const chatWithAi = async ({
    query,
    featureFlags = {},
    fileContext = null,
    recentFiles = [],
    conversation = [],
}) => {
    const response = await api.post("/api/ai/chat", {
        query,
        featureFlags,
        fileContext,
        recentFiles,
        conversation,
    });
    return response.data;
};
