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
  notificationType: 'chat_message' | 'case_notification' = 'chat_message',
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Initial Checks
    const user = await UserModel.findById(userId).exec();
    if (!user) {
      return {
        success: false,
        message: `User not found for userId: ${userId}`,
      };
    }

    const profile = await ProfileModel.findOne({ user_id: userId });

    // 2. Create in-app notification record (for the bell)
    const notification = await NotificationModel.create({
      user_id: userId,
      Profile_id: profile?._id,
      notificationType: notificationType,
      notificationDetail: body,
    });

    // 3. Update or Create NotificationList (handles the "new notification" count for the bell)
    await NotificationListModel.findOneAndUpdate(
      { user_id: userId },
      {
        $setOnInsert: {
          user_id: userId,
          Profile_id: profile?._id,
          seenNotificationCount: 0,
          notificationList: [],
        },
        $inc: {
          oldNotificationCount: 1,
          newNotification: 1,
        },
        $push: {
          notificationList: notification._id,
        },
      },
      { upsert: true, new: true },
    );

    // 4. Handle Push Notifications (Multi-device)
    if (
      user.notificationsEnabled &&
      user.fcmTokens &&
      user.fcmTokens.length > 0
    ) {
      console.log(
        `Sending push notifications to ${user.fcmTokens.length} devices for user: ${userId}`,
      );

      const sendPromises = user.fcmTokens.map((token) => {
        const message = {
          notification: { title, body },
          token,
        };
        return admin.messaging().send(message);
      });

      const results = await Promise.allSettled(sendPromises);
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      console.log(
        `Successfully sent ${successCount}/${results.length} push notifications`,
      );

      // Cleanup failed tokens if needed (already handled by sendMultiple, but good to have logic here if we want)
      const failedTokens: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedTokens.push(user.fcmTokens![index]);
        }
      });

      if (failedTokens.length > 0) {
        await UserModel.updateOne(
          { _id: userId },
          { $pull: { fcmTokens: { $in: failedTokens } } },
        );
      }
    }

    return { success: true, message: 'Notification (Bell & Push) processed' };
  } catch (error) {
    console.error(`Error processing notification for userId: ${userId}`, error);
    return { success: false, message: 'Failed to process notification' };
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
      _id: { $in: userIds },
      notificationsEnabled: true,
      fcmTokens: { $exists: true, $not: { $size: 0 } },
    }).exec();

    const tokens = users.reduce((acc: string[], user) => {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        acc.push(...user.fcmTokens);
      }
      return acc;
    }, []);

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
        { fcmTokens: { $in: failedTokens } },
        { $pull: { fcmTokens: { $in: failedTokens } } },
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
