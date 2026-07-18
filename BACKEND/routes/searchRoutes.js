import express from "express";
import { searchAll } from "../controllers/searchController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Require authentication for search
router.use(authenticate);

router.get("/", searchAll);

export default router;
