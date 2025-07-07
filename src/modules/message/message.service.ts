import { Types } from 'mongoose';
import { MessageModel } from './message.model';

const getMessagesBetweenUsers = async (senderId: Types.ObjectId, receiverId: Types.ObjectId) => {
  return MessageModel.find({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  }).sort({ createdAt: 1 });
};

const saveMessage = async (senderId: Types.ObjectId, receiverId: Types.ObjectId, text: string) => {
  return MessageModel.create({ sender: senderId, receiver: receiverId, text });
};

export default {
  getMessagesBetweenUsers,
  saveMessage,
};