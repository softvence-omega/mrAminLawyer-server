// import WebSocket, { WebSocketServer } from 'ws';
// import jwt from 'jsonwebtoken';
// import { MessageModel } from '../modules/message/message.model';
// import idConverter from '../util/idConverter';
// import { IncomingMessage } from 'http';
// import { Types } from 'mongoose';

// interface AuthenticatedWebSocket extends WebSocket {
//   userId?: string;
// }

// export const setupWebSocket = (server: any, jwtSecret: string) => {
//   const wss = new WebSocketServer({ server });

//   wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
//     const url = new URL(req.url!, `http://${req.headers.host}`);
//     const token = url.searchParams.get('token');

//     if (!token) return ws.close();

//     try {
//       const decoded = jwt.verify(token, jwtSecret) as any;
//       ws.userId = decoded.id;
//     } catch (err) {
//       ws.close();
//     }

//     ws.on('message', async (data) => {
//       try {
//         const msg = JSON.parse(data.toString());

//         const saved = await MessageModel.create({
//           sender: idConverter(ws.userId!) as Types.ObjectId,
//           receiver: idConverter(msg.receiverId) as Types.ObjectId,
//           text: msg.text,
//         });

//         wss.clients.forEach((client) => {
//           const authClient = client as AuthenticatedWebSocket;
//           if (authClient.userId === msg.receiverId && client.readyState === 1) {
//             client.send(JSON.stringify(saved));
//           }
//         });
//       } catch (err) {
//         console.error('WebSocket message error:', err);
//       }
//     });
//   });

//   return wss;
// };

import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { MessageModel } from '../modules/message/message.model';
import idConverter from '../util/idConverter';
import { IncomingMessage } from 'http';
import { Types } from 'mongoose';
import { sendSingleNotification } from '../firebaseSetup/sendPushNotification';
import {
  NotificationModel,
  NotificationListModel,
} from '../modules/notifications/notifications.model';
import { ProfileModel } from '../modules/user/user.model';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

export const setupWebSocket = (server: any, jwtSecret: string) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) return ws.close();

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      ws.userId = decoded.id;
    } catch (err) {
      ws.close();
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        const saved = await MessageModel.create({
          sender: idConverter(ws.userId!) as Types.ObjectId,
          receiver: idConverter(msg.receiverId) as Types.ObjectId,
          text: msg.text,
        });

        wss.clients.forEach((client) => {
          const authClient = client as AuthenticatedWebSocket;
          if (authClient.userId === msg.receiverId && client.readyState === 1) {
            client.send(JSON.stringify(saved));
          }
        });

        // --- ONLY FOR CHAT NOTIFICATION ---

        // Get receiver's profile
        const receiverProfile = await ProfileModel.findOne({ user_id: idConverter(msg.receiverId) as Types.ObjectId, });

        if (receiverProfile) {
          // Create chat_message notification
          const notification = await NotificationModel.create({
            user_id: idConverter(msg.receiverId) as Types.ObjectId,
            Profile_id: receiverProfile._id,
            notificationType: 'chat_message', // ✅ specific to chat
            notificationDetail: `💬 New message: "${msg.text}"`,
            isSeen: false,
          });

          // Update notification list
          await NotificationListModel.findOneAndUpdate(
            { user_id: idConverter(msg.receiverId) as Types.ObjectId, },
            {
              $inc: { oldNotificationCount: 1, newNotification: 1 },
              $push: { notificationList: notification._id },
              $setOnInsert: {
                Profile_id: receiverProfile._id,
                seenNotificationCount: 0,
              },
            },
            { upsert: true }
          );

          // Send push notification
          await sendSingleNotification(idConverter(msg.receiverId) as Types.ObjectId, '💬 New Message', msg.text);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
  });

  return wss;
};