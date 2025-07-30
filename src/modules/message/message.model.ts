import { Schema, model, Types } from 'mongoose';

export interface IMessage {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  text: string;
  imageUrl?: string;
  fileType?: string;
  seen?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'UserCollection', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'UserCollection', required: true },
    text: { type: String, required: true },
    imageUrl: { type: String, required: false },
    fileType: { type: String, required: false },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const MessageModel = model<IMessage>('Message', messageSchema);