import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);

router.get("/stream", notificationController.streamNotifications);
router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/clear", notificationController.clearNotifications);
router.delete("/:id", notificationController.deleteNotification);
router.get("/preferences", notificationController.getPreferences);
router.patch("/preferences", notificationController.updatePreferences);

export default router;
