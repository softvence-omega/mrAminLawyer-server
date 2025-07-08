import { Types } from "mongoose";
import admin from "./firebase";
import { UserModel } from "../modules/user/user.model";

// Utility function to send notification to a single user
export const sendSingleNotification = async (userId: Types.ObjectId, title: string, body: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Await MongoDB query to find user
      const user = await UserModel.findOne({ userId }).exec();
      if (!user || !user.fcmToken) {
        return { success: false, message: `No user or FCM token found for userId: ${userId}` };
      }
  
      const message = {
        notification: {
          title,
          body,
        },
        token: user.fcmToken, // Use first token for simplicity
      };
  
      // Await Firebase notification send
      await admin.messaging().send(message);
      return { success: true, message: 'Notification sent successfully' };
    }
    catch (error) {
      console.error(`Error sending notification to userId: ${userId}`, error);
      return { success: false, message: 'Failed to send notification' };
    }
};

// Utility function to send notifications to multiple users
export const sendMultipleNotifications = async (userIds: any, title: string, body: string): Promise<{
    success: boolean;
    message: string;
    successCount?: number;
    failureCount?: number;
}> => {
    try {
      const users = await UserModel.find({ userId: { $in: userIds } }).exec();
      const tokens = users
        .filter(user => user.fcmToken)
        .map(user => user.fcmToken);
  
      if (tokens.length === 0) {
        return { success: false, message: 'No valid FCM tokens found for provided userIds' };
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
          { $set: { fcmToken: null } }
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