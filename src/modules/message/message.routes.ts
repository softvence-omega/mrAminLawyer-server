import express from 'express';
import messageController from './message.controller';
import auth from '../../middleware/auth';
import { userRole } from '../../constants';

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
