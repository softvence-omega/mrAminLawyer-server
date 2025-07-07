import express from 'express';
import messageController from './message.controller';
import auth from '../../middleware/auth';
import { userRole } from '../../constants';

const messageRouter = express.Router();

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

messageRouter.get(
  '/conversation/:id',
  auth([userRole.admin, userRole.user]),
  messageController.getConversation,
);
export default messageRouter;
