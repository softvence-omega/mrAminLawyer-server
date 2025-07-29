import express from 'express';
import messageController from './message.controller';
import auth from '../../middleware/auth';
import { userRole } from '../../constants';
import { upload } from '../../util/uploadImgToCludinary';

const messageRouter = express.Router();

// messageRouter.get(
//   '/chat-list',
//   auth([userRole.admin, userRole.user]),
//   messageController.getChatListWithLastMessages,
// );

messageRouter.get(
  '/chat-list',
  auth([userRole.admin, userRole.user]),
  messageController.getRecentChats,
);

messageRouter.post(
  '/chat-file',
  auth([userRole.admin, userRole.user]),
  upload.single('file'),
  messageController.uploadChatFile
);

messageRouter.get(
  '/conversation/:id',
  auth([userRole.admin, userRole.user]),
  messageController.getConversation,
);

messageRouter.get(
  '/:id',
  auth([userRole.admin, userRole.user]),
  messageController.getMessages,
);

messageRouter.post(
  '/',
  auth([userRole.admin, userRole.user]),
  messageController.sendMessage,
);

export default messageRouter;
