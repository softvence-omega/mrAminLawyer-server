import { Request, Response } from 'express';
import catchAsync from '../../util/catchAsync';
import messageService from './message.service';
import idConverter from '../../util/idConverter';
import { Types } from 'mongoose';
import { UserModel } from '../user/user.model';
import { sendSingleNotification } from '../../firebaseSetup/sendPushNotification';

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
  

export default {
  getMessages,
  sendMessage,
  getConversation
};