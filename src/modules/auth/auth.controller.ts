import { Types } from 'mongoose';
import catchAsync from '../../util/catchAsync';
import idConverter from '../../util/idConverter';
import authServices from './auth.services';

const logIn = catchAsync(async (req, res) => {
  const { email, password, method } = req.body;
  const result = await authServices.logIn(email, password, method);
  const { approvalToken, refreshToken, updatedUser, message } = result;

  res.status(200).json({
    message: 'Log In Successful',
    access_Message: message,
    approvalToken: approvalToken,
    refreshToken: refreshToken,
    user: updatedUser,
  });
});

const logOut = catchAsync(async (req, res) => {
  const userId = req?.user.id;

  if (!userId) {
    throw Error('token is missing');
  }

  await authServices.logOut(userId);
  res.status(200).json({
    message: 'Log OUT Successful',
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const authorizationToken = req.headers?.authorization as string;

  const result = await authServices.changePassword(
    authorizationToken,
    oldPassword,
    newPassword,
  );
  res.status(200).json({
    success: true,
    message: 'password changed',
    body: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await authServices.refreshToken(refreshToken);

  res.status(200).json({
    success: true,
    message: 'log token refreshed',
    body: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const email = req.body?.email;
  const result = await authServices.forgetPassword(email);
  res.status(200).json({
    success: true,
    message: 'reset password token generated check your email',
    body: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { newPassword, token } = req.body;

  const result = await authServices.resetPassword(token, newPassword);

  res.status(200).json({
    success: true,
    message: 'password changed',
    body: result,
  });
});

const collectProfileData = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await authServices.collectProfileData(user.id);
  res.status(200).json({
    success: true,
    message: 'password changed',
    body: result,
  });
});

const otpCrossCheck = catchAsync(async (req, res) => {
  const { token, receivedOTP, passwordChange } = req.body;

  // Validate required inputs
  if (!token || !receivedOTP) {
    return res.status(400).json({
      success: false,
      message: 'Token and OTP are required',
    });
  }

  // Call authServices.otpCrossCheck with passwordChange (true or undefined)
  const result = await authServices.otpCrossCheck(
    token,
    receivedOTP,
    passwordChange === true ? true : undefined,
  );

  // Validate result
  if (!result || !result.user) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP or retrieve user data',
    });
  }

  // Send success response
  res.status(200).json({
    success: true,
    message: passwordChange
      ? 'Now you can set a new password'
      : 'OTP verified successfully, allowed to log in',
    body: result.user,
  });
});

const send_OTP = catchAsync(async (req, res) => {
  const user_id = req.user.id as string;
  const converted_id = idConverter(user_id);

  console.log('yooooo', converted_id);

  const result = await authServices.send_OTP(converted_id as Types.ObjectId);
  res.status(200).json({
    success: true,
    message: 'OTP verified successfully,allow to log in',
    body: result,
  });
});

const reSend_OTP = catchAsync(async (req, res) => {
  const resendOTPToken = req.body.resendOTPToken as string;

  console.log('yooooo', reSend_OTP);

  const result = await authServices.reSend_OTP(resendOTPToken);
  res.status(200).json({
    success: true,
    message: 'OTP is sent again !',
    body: result,
  });
});

const authController = {
  logIn,
  otpCrossCheck,
  logOut,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
  collectProfileData,
  send_OTP,
  reSend_OTP,
};
export default authController;
