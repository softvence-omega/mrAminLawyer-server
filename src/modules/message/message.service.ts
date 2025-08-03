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

const saveMessage = async (senderId: Types.ObjectId, receiverId: Types.ObjectId, text?: string | null, fileUrl?: string | null,
  fileType?: string | null) => {
  return MessageModel.create({ sender: senderId, receiver: receiverId, text, fileType, fileUrl });
};

export default {
  getMessagesBetweenUsers,
  saveMessage,
};