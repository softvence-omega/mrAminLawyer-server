import { model, Schema } from 'mongoose';
import {
  TEachNotification,
  TNotificationList,
} from './notifications.interface';

const notificationSchema = new Schema<TEachNotification>(
  {
    user_id: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
    Profile_id: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'Profile',
    },
    notificationType: {
      type: String,
      enum: ['chat_message', 'case_notification'],
      required: true,
    },
    notificationDetail: { type: String, required: true },
    isSeen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const notificationListSchema = new Schema<TNotificationList>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    Profile_id: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'Profile',
    },
    oldNotificationCount: { type: Number, default: 0 },
    seenNotificationCount: { type: Number, default: 0 },
    newNotification: { type: Number, default: 0 },
    notificationList: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
  },
  { timestamps: true },
);

export const NotificationListModel = model<TNotificationList>(
  'NotificationList',
  notificationListSchema,
);
export const NotificationModel = model<TEachNotification>(
  'Notification',
  notificationSchema,
);
