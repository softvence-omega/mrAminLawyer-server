import { Schema, model, Types } from 'mongoose';

export interface IMessage {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  text: string;
  fileUrl?: string;
  fileType?: string;
  seen?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'UserCollection', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'UserCollection', required: true },
    text: { type: String, required: false, default: '' },
    fileUrl: { type: String, required: false, default: '' },
    fileType: { type: String, required: false },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const MessageModel = model<IMessage>('Message', messageSchema);