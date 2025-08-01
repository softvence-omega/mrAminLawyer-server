import express from "express";
import notificationController from "./notifications.controller";
import auth from "../../middleware/auth";
import { userRole } from "../../constants";

const notificationRouter = express.Router()

notificationRouter.get("/getNotificationForNotificationBell",auth([userRole.admin, userRole.user]),notificationController.getNotificationForNotificationBell )

notificationRouter.get("/getAllNotifications",auth([userRole.admin, userRole.user]),notificationController.getAllNotifications )

notificationRouter.get("/viewSpecificNotification",auth([userRole.admin, userRole.user]),notificationController.viewSpecificNotification )

notificationRouter.post("/sendNotificationFromAdmin",auth([userRole.admin]),notificationController.sendNotificationFromAdmin )

notificationRouter.get("/getAllNotificationForAdmin",auth([userRole.admin]),notificationController.getAllNotificationForAdmin )

// User: Delete their own notification
notificationRouter.delete(
    '/deleteUserNotification/:id',
    auth([userRole.admin, userRole.user]),
    notificationController.deleteUserNotification,
  );
  
  // Admin: Delete globally
  notificationRouter.delete(
    '/deleteAnyNotification/:id',
    auth([userRole.admin]),
    notificationController.deleteAdminNotification,
  );

  notificationRouter.patch(
    '/mark-as-unread/:id',
    auth([userRole.admin, userRole.user]),
    notificationController.markAsUnreadNotification
  );

export default notificationRouter