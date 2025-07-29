import { Schema, model, Types } from 'mongoose';

export interface IMessage {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  text: string;
  fileUrl?: string;
  fileType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'UserCollection', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'UserCollection', required: true },
    text: { type: String, required: true },
    fileUrl: { type: String, required: false },
    fileType: { type: String, required: false },
  },
  { timestamps: true }
);

export const MessageModel = model<IMessage>('Message', messageSchema);