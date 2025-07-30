import { Types } from "mongoose";
import catchAsync from "../../util/catchAsync";
import notificationServices from "./notifications.service";
import idConverter from "../../util/idConverter";
import globalResponseHandler from "../../util/globalResponseHandler";

const getNotificationForNotificationBell= catchAsync(async(req,res)=>{
    const user_id = req.user.id
    const converted_user_id= idConverter(user_id)

    const result = await notificationServices.getNotificationForNotificationBell(converted_user_id as Types.ObjectId)
    globalResponseHandler(res, {
        statusCode: 200,
        success: true,
        message: 'Notification for bell',
        data: result,
      });
})


const getAllNotifications = catchAsync(async(req, res)=>{

    const user_id = req.user.id
    const converted_user_id= idConverter(user_id)

    const result = await notificationServices.getAllNotifications(converted_user_id as Types.ObjectId)
    globalResponseHandler(res, {
        statusCode: 200,
        success: true,
        message: 'All Notification',
        data: result,
      });
})


const viewSpecificNotification = catchAsync(async(req, res)=>{

    const user_id = req.user.id
    const converted_user_id= idConverter(user_id)

    const notification_id = req.query.notification_id as string
    const converted_notification_id= idConverter(notification_id)

    const result = await notificationServices.viewSpecificNotification(converted_notification_id as Types.ObjectId, converted_user_id as Types.ObjectId)
    globalResponseHandler(res, {
        statusCode: 200,
        success: true,
        message: 'Found single notification',
        data: result,
      });
})


const sendNotificationFromAdmin= catchAsync(async(req,res)=>{

    const result = await notificationServices.sendNotificationFromAdmin(req.body)
    globalResponseHandler(res, {
        statusCode: 200,
        success: true,
        message: 'Notification sent successfully',
        data: result,
      });
})


const getAllNotificationForAdmin= catchAsync(async(req,res)=>{
    const notificationType = req.query.notificationType as string
    const result = await notificationServices.getAllNotificationForAdmin(notificationType)
    globalResponseHandler(res, {
        statusCode: 200,
        success: true,
        message: 'Notification fetched successfully for admin',
        data: result,
      });
})

const deleteUserNotification = catchAsync(async (req, res) => {
    const user_id = req.user.id;
    const notification_id = req.params.id;
  
    console.log('user_id :::: ', user_id, notification_id);
  
    const result = await notificationServices.deleteUserNotification(
      user_id,
      notification_id,
    );
  
    console.log("Delete result:", result);
  
    globalResponseHandler(res, {
      statusCode: 200,
      success: true,
      message: 'Notification deleted successfully by user',
      data: result,
    });
  });
  
  const deleteAdminNotification = catchAsync(async (req, res) => {
    const notification_id = idConverter(req.params.id);
  
    const result = await notificationServices.deleteAdminNotification(
      notification_id as Types.ObjectId,
    );
  
    globalResponseHandler(res, {
      statusCode: 200,
      success: true,
      message: 'Notification deleted successfully by admin',
      data: result,
    });
  });

  const markAsUnreadNotification = catchAsync(async (req, res) => {
    const notification_id = idConverter(req.params.id) as Types.ObjectId;
    const user_id = req.user.id;
  
    const result = await notificationServices.markAsUnread(notification_id as Types.ObjectId, user_id);
  
    globalResponseHandler(res, {
      statusCode: 200,
      success: true,
      message: 'Notification marked as unread',
      data: result,
    });
  });
  


const notificationController = {
    getAllNotifications,viewSpecificNotification,sendNotificationFromAdmin,getAllNotificationForAdmin,getNotificationForNotificationBell,
    deleteUserNotification, deleteAdminNotification, markAsUnreadNotification
}


export default notificationController