import { Types } from 'mongoose';
import { ProfileModel, UserModel } from '../modules/user/user.model';
import admin from './firebase';
import {
  NotificationListModel,
  NotificationModel,
} from '../modules/notifications/notifications.model';

// Utility function to send notification to a single user
export const sendSingleNotification = async (
  userId: Types.ObjectId,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    // Await MongoDB query to find user
    const user = await UserModel.findById(userId).exec();
    if (!user || !user.fcmToken) {
      return {
        success: false,
        message: `No user or FCM token found for userId: ${userId}`,
      };
    }
    if (!user.notificationsEnabled || !user.fcmToken) {
      return {
        success: false,
        message: `Notifications are disabled or no FCM token for userId: ${userId}`,
      };
    }

    console.log('fcm token :::::: ', user.fcmToken);
    const message = {
      notification: {
        title,
        body,
      },
      token: user.fcmToken, 
    };

    // Await Firebase notification send
    await admin.messaging().send(message);

    // Get the user's profile (if applicable)
    const profile = await ProfileModel.findOne({ user_id: userId });

    // 1. Create the Notification
    const notification = await NotificationModel.create({
      user_id: userId,
      Profile_id: profile?._id,
      notificationType: 'chat_message',
      notificationDetail: body,
    });

    // 2. Update or Create NotificationList
    const list = await NotificationListModel.findOne({ user_id: userId });
    if (list) {
      list.notificationList.push(notification._id);
      list.newNotification += 1;
      await list.save();
    } else {
      await NotificationListModel.create({
        user_id: userId,
        Profile_id: profile?._id,
        notificationList: [notification._id],
        newNotification: 1,
      });
    }

    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error(`Error sending notification to userId: ${userId}`, error);
    return { success: false, message: 'Failed to send notification' };
  }
};

// Utility function to send notifications to multiple users
export const sendMultipleNotifications = async (
  userIds: any,
  title: string,
  body: string,
): Promise<{
  success: boolean;
  message: string;
  successCount?: number;
  failureCount?: number;
}> => {
  try {
    const users = await UserModel.find({
      userId: { $in: userIds },
      notificationsEnabled: true,
      fcmToken: { $ne: null },
    }).exec();

    const tokens = users
      .filter((user) => user.fcmToken)
      .map((user) => user.fcmToken);

    if (tokens.length === 0) {
      return {
        success: false,
        message: 'No valid FCM tokens found for provided userIds',
      };
    }

    let successCount = 0;
    let failureCount = 0;
    const failedTokens: string[] = [];

    for (const token of tokens) {
      if (!token) {
        continue;
      }
      try {
        const message = {
          notification: { title, body },
          token,
        };
        await admin.messaging().send(message);
        successCount++;
      } catch (error) {
        console.error(`Failed to send to token: ${token}`, error);
        failedTokens.push(token);
        failureCount++;
      }
    }

    if (failedTokens.length > 0) {
      await UserModel.updateMany(
        { fcmToken: { $in: failedTokens } },
        { $set: { fcmToken: null } },
      ).exec();
      console.log(`Cleared ${failedTokens.length} invalid FCM tokens`);
    }

    return {
      success: successCount > 0,
      message: 'Notifications sent successfully',
      successCount,
      failureCount,
    };
  } catch (error) {
    console.error('Error sending notifications to userIds:', userIds, error);
    return { success: false, message: 'Failed to send notifications' };
  }
};
