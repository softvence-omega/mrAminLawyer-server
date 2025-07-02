import express from 'express';
import authController from './auth.controller';
import validator from '../../util/validator';
import { logInValidator } from './auth.validator';
import auth from '../../middleware/auth';
import { userRole } from '../../constants';

const authRouter = express.Router();

authRouter.post('/logIn', validator(logInValidator), authController.logIn);

authRouter.post(
  '/logOut',
  auth([userRole.admin, userRole.user]),
  authController.logOut,
);

authRouter.post(
  '/changePassword',
  auth([userRole.admin, userRole.user]),
  authController.changePassword,
);

authRouter.post('/otpCrossCheck', authController.otpCrossCheck);

authRouter.post(
  '/send_OTP',
  auth([userRole.admin, userRole.user], { requestOTP: true }),
  authController.send_OTP,
);

authRouter.post('/reSend_OTP', authController.reSend_OTP);

authRouter.post('/refresh-token', authController.refreshToken);
authRouter.post('/forgetPassword', authController.forgetPassword);
authRouter.post('/resetPassword', authController.resetPassword);
authRouter.get('/profile', authController.collectProfileData);

export default authRouter;
