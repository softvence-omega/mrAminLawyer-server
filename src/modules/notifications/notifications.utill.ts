import {
  NotificationListModel,
  NotificationModel,
} from '../notifications/notifications.model';
import { ProfileModel } from '../user/user.model';
import { sendSingleNotification } from '../../firebaseSetup/sendPushNotification';
import idConverter from '../../util/idConverter';
import { Types } from 'mongoose';

export const sendChatNotification = async ({
  senderId,
  receiverId,
  message,
}: {
  senderId: string;
  receiverId: string;
  message: string;
}) => {
  const receiverProfile = await ProfileModel.findOne({ user_id: receiverId });

  if (!receiverProfile) {
    console.log('⚠️ Receiver profile not found');
    return;
  }

  const notificationDetail = `💬 New message: "${message}"`;

  const eachNotification = await NotificationModel.create({
    user_id: receiverId,
    Profile_id: receiverProfile._id,
    notificationType: 'chat_message',
    notificationDetail,
    isSeen: false,
  });

  await NotificationListModel.findOneAndUpdate(
    { user_id: receiverId },
    {
      $setOnInsert: {
        Profile_id: receiverProfile._id,
        oldNotificationCount: 0,
        seenNotificationCount: 0,
        newNotification: 0,
        notificationList: [],
      },
      $inc: {
        oldNotificationCount: 1,
        newNotification: 1,
      },
      $push: {
        notificationList: eachNotification._id,
      },
    },
    { upsert: true, new: true },
  );

  await sendSingleNotification(
    idConverter(receiverId) as Types.ObjectId,
    'New Message Received',
    notificationDetail,
  );

  console.log(`✅ Chat notification sent to ${receiverId}`);
};
