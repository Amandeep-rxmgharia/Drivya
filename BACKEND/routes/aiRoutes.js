import express from "express";
import { chat, organize } from "../controllers/aiController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/chat", authenticate, chat);
router.post("/organize", authenticate, organize);

export default router;
