import { chat as chatService } from "../services/aiService.js";

export async function chat(req, res, next) {
    try {
        const {
            query,
            featureFlags = {},
            fileContext = null,
            recentFiles = [],
            conversation = [],
        } = req.body || {};

        if (!query || typeof query !== "string") {
            return res.status(400).json({ message: "query is required" });
        }

        const result = await chatService({
            query,
            featureFlags,
            fileContext,
            recentFiles,
            conversation,
        });

        // result shape: { message: string }
        return res.json(result);
    } catch (err) {
        next(err);
    }
}
