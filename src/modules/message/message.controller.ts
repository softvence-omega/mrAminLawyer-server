import { Request, Response } from 'express';
import catchAsync from '../../util/catchAsync';
import messageService from './message.service';
import idConverter from '../../util/idConverter';
import mongoose, { Types } from 'mongoose';
import { UserModel } from '../user/user.model';
import { sendSingleNotification } from '../../firebaseSetup/sendPushNotification';
import { MessageModel } from './message.model';

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = idConverter(req.user.id);
  const otherId = idConverter(req.params.id);

  if (!userId || !otherId) {
    return res.status(400).json({ message: 'Invalid sender or receiver ID' });
  }

  const messages = await messageService.getMessagesBetweenUsers(
    userId as Types.ObjectId,
    otherId as Types.ObjectId
  );

  res.status(200).json(messages);
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const senderId = idConverter(req.user.id);
  const { receiverId, text } = req.body;

  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const message = await messageService.saveMessage(
    senderId as Types.ObjectId,
    idConverter(receiverId) as Types.ObjectId,
    text
  );

  req.app.get('wss').clients.forEach((client: any) => {
    if (client.userId === receiverId && client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });

  await sendSingleNotification(senderId, 'You have a message', `Dear, you have just got a new message from ${req.user.name}`);

  res.status(201).json(message);
});

const getConversation = catchAsync(async (req: Request, res: Response) => {
    const currentUserId = idConverter(req.user.id);
    const otherUserId = idConverter(req.params.id);
  
    if (!currentUserId || !otherUserId) {
      return res.status(400).json({ message: 'Invalid user IDs' });
    }
  
    const chatWith = await UserModel.findById(otherUserId).select('name email img');
  
    if (!chatWith) {
      return res.status(404).json({ message: 'Chat user not found' });
    }
  
    const messages = await messageService.getMessagesBetweenUsers(
      currentUserId,
      otherUserId
    );

    // Add `sentByMe` flag
    const messagesWithSenderFlag = messages.map((msg) => ({
      ...msg.toObject(), // convert Mongoose doc to plain object
      sentByMe: msg.sender.toString() === currentUserId.toString(),
    }));
  
    res.status(200).json({ chatWith, messages: messagesWithSenderFlag });
  });

  // const getRecentChats = catchAsync(async (req: Request, res: Response) => {
  //   const currentUserId = new mongoose.Types.ObjectId(req.user.id);
  //   const onlineUsers = req.app.get('onlineUsers') as Map<string, WebSocket>;
  
  //   const chats = await MessageModel.aggregate([
  //     {
  //       $match: {
  //         $or: [
  //           { sender: currentUserId },
  //           { receiver: currentUserId },
  //         ],
  //       },
  //     },
  //     {
  //       $sort: { createdAt: -1 }, // ensure latest message first
  //     },
  //     {
  //       $addFields: {
  //         chatWith: {
  //           $cond: [
  //             { $eq: ['$sender', currentUserId] },
  //             '$receiver',
  //             '$sender',
  //           ],
  //         },
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: '$chatWith',
  //         lastMessageDoc: { $first: '$$ROOT' },
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'usercollections', // your user collection name
  //         localField: '_id',
  //         foreignField: '_id',
  //         as: 'userInfo',
  //       },
  //     },
  //     {
  //       $unwind: '$userInfo',
  //     },
  //     {
  //       $project: {
  //         userId: '$_id',
  //         name: '$userInfo.name',
  //         email: '$userInfo.email',
  //         img: '$userInfo.img',
  //         lastMessage: '$lastMessageDoc.text',
  //         lastMessageTime: '$lastMessageDoc.createdAt',
  //         sentByMe: {
  //           $eq: ['$lastMessageDoc.sender', currentUserId],
  //         },
  //       },
  //     },
  //     {
  //       $sort: { lastMessageTime: -1 },
  //     },
  //   ]);
  
  //   const result = chats.map(chat => ({
  //     ...chat,
  //     isOnline: onlineUsers.has(chat.userId.toString()),
  //   }));
  
  //   res.status(200).json(result);
  // });
  
  // const getChatListWithLastMessages = catchAsync(async (req: Request, res: Response) => {

  //   const currentUserId = new mongoose.Types.ObjectId(req.user.id);
  
  //   // Get distinct users the current user has chatted with
  //   const messages = await MessageModel.aggregate([
  //     {
  //       $match: {
  //         $or: [
  //           { sender: currentUserId },
  //           { receiver: currentUserId }
  //         ]
  //       }
  //     },
  //     {
  //       $project: {
  //         otherUser: {
  //           $cond: [
  //             { $eq: ['$sender', currentUserId] },
  //             '$receiver',
  //             '$sender'
  //           ]
  //         },
  //         text: 1,
  //         createdAt: 1
  //       }
  //     },
  //     {
  //       $sort: { createdAt: -1 }
  //     },
  //     {
  //       $group: {
  //         _id: '$otherUser',
  //         lastMessage: { $first: '$text' },
  //         createdAt: { $first: '$createdAt' }
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'UserCollections',
  //         localField: '_id',
  //         foreignField: '_id',
  //         as: 'userInfo'
  //       }
  //     },
  //     {
  //       $unwind: '$userInfo'
  //     },
  //     {
  //       $project: {
  //         _id: '$userInfo._id',
  //         name: '$userInfo.name',
  //         img: '$userInfo.img',
  //         lastMessage: '$lastMessage',
  //         createdAt: '$createdAt'
  //       }
  //     },
  //     {
  //       $sort: { createdAt: -1 }
  //     }
  //   ]);
  
  //   res.status(200).json({ success: true, data: messages });
  // });


  const getRecentChats = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = new mongoose.Types.ObjectId(req.user.id);
  const currentUserRole = req.user.role;
  const onlineUsers = req.app.get('onlineUsers') as Map<string, WebSocket>;

  // Step 1: Get all users (excluding self)
  const userFilter: any = {
    _id: { $ne: currentUserId },
    isDeleted: false,
    isBlocked: { $ne: true },
  };

  if (currentUserRole === 'user') {
    userFilter.role = 'admin';
  }

  const allUsers = await UserModel.find(userFilter)
    .select('_id name email img createdAt')
    .lean();

  // Step 2: Fetch last messages between current user and each user
  const messages = await MessageModel.aggregate([
    {
      $match: {
        $or: [
          { sender: currentUserId },
          { receiver: currentUserId },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $addFields: {
        chatWith: {
          $cond: [
            { $eq: ['$sender', currentUserId] },
            '$receiver',
            '$sender',
          ],
        },
      },
    },
    {
      $group: {
        _id: '$chatWith',
        lastMessageDoc: { $first: '$$ROOT' },
      },
    },
  ]);

  // Step 3: Create a map for quick access
  const lastMessageMap = new Map<string, any>();
  messages.forEach(msg => {
    lastMessageMap.set(msg._id.toString(), msg.lastMessageDoc);
  });

  // Step 4: Merge user info with last messages
  const result = allUsers.map(user => {
    const msg = lastMessageMap.get(user._id.toString());

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      img: user.img,
      lastMessage: msg?.text || '',
      lastMessageTime: msg?.createdAt || user.createdAt,
      sentByMe: msg?.sender?.toString() === currentUserId.toString(),
      isOnline: onlineUsers.has(user._id.toString()),
    };
  });

  // Step 5: Sort by lastMessageTime
  result.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

  res.status(200).json(result);
});

  

const messageController = {
  getMessages,
  sendMessage,
  getConversation,
  getRecentChats
};

export default messageController;