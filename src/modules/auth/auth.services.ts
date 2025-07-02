import bcrypt from 'bcrypt';
import config from '../../config';
import authUtil from './auth.util';
import { ProfileModel, UserModel } from '../user/user.model';
import idConverter from '../../util/idConverter';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { sendEmail } from '../../util/sendEmail';
import userServices from '../user/user.service';
import { Types } from 'mongoose';
import { error } from 'console';

const logIn = async (
  email: string,
  password: string,
  method: 'google' | 'email_Pass' | 'facebook' = 'email_Pass',
) => {
  let user = await UserModel.findOne({ email }).select('+password');

  if (
    (user?.isBlocked || user?.isDeleted || !user) &&
    (method === 'google' || method === 'facebook')
  ) {
    await userServices.createUser(
      {
        email,
        agreedToTerms: true,
      },
      method,
    );

    // Re-fetch new user
    user = await UserModel.findOne({ email }).select('+password');

    if (!user) {
      throw new Error('User creation failed');
    }
  }

  // If still no user (and not a social login), throw error
  if (!user) {
    throw new Error('No user found with this email');
  }

  // Deny login for blocked/deleted users for normal email login
  if ((user.isBlocked) && method === 'email_Pass') {
    throw new Error('This user is blocked!');
  }
  if ((user.isDeleted) && method === 'email_Pass') {
    throw new Error('This user is deleted!');
  }

  // Password check for email login
  if (method === 'email_Pass') {
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new Error('Password is not matched');
    }
  }

  const updatedUser = await UserModel.findOneAndUpdate(
    { email },
    { isLoggedIn: true },
    { new: true },
  );

  const tokenizeData = {
    id: user._id.toHexString(),
    role: user.role,
    username: updatedUser?.name,
    OTPVerified: updatedUser?.OTPVerified,
  };

  const approvalToken = authUtil.createToken(
    tokenizeData,
    config.jwt_token_secret,
    config.token_expiresIn,
  );

  const refreshToken = authUtil.createToken(
    tokenizeData,
    config.jwt_refresh_Token_secret,
    config.refresh_expiresIn,
  );

  let message = 'access_all';

  if (!user.OTPVerified) {
    message =
      'you are not a verified user. You wont be able to use some services. Please verify';
  }

  return { approvalToken, refreshToken, updatedUser, message };
};

const logOut = async (userId: string) => {
  const convertedId = idConverter(userId);

  const findUserById = await UserModel.findOneAndUpdate(
    { _id: convertedId },
    { isLoggedIn: false, loggedOutTime: new Date() },
    { new: true },
  );
  return findUserById;
};

const changePassword = async (
  authorizationToken: string,
  oldPassword: string,
  newPassword: string,
) => {
  try {
    // Decode the token
    const decoded = jwt.verify(
      authorizationToken,
      config.jwt_token_secret as string,
    ) as JwtPayload;

    if (!decoded || !decoded.id) {
      throw new Error('Invalid or unauthorized token');
    }

    const userId = decoded.id;

    // Find the user and include the password field
    const findUser = await UserModel.findOne({ _id: userId })
      .select('+password')
      .lean(); // Convert to a plain object for performance

    if (!findUser || !findUser.password) {
      throw new Error('User not found or password missing');
    }

    // Compare old password with hashed password
    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      findUser.password,
    );

    if (!isPasswordMatch) {
      throw new Error('Old password is incorrect');
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      Number(config.bcrypt_salt),
    );

    // Update the password
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId },
      {
        password: newPasswordHash,
        passwordChangeTime: new Date(),
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new Error('Error updating password');
    }

    return { success: true, message: 'Password changed successfully' };
  } catch (error: any) {
    console.error('Error changing password:', error.message);
    throw new Error(error.message || 'Something went wrong');
  }
};

const refreshToken = async (refreshToken: string) => {
  const decoded = jwt.verify(
    refreshToken,
    config.jwt_refresh_Token_secret as string,
  );

  if (!decoded) {
    throw Error('token decoding Failed');
  }

  const { id, iat, role } = decoded as JwtPayload;

  const findUser = await UserModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!findUser) {
    throw Error('Unauthorized User or forbidden Access');
  }

  // console.log(findUser)
  if ((findUser.passwordChangeTime || findUser.loggedOutTime) && iat) {
    const passwordChangedAt = findUser.passwordChangeTime
      ? new Date(findUser.passwordChangeTime).getTime() / 1000
      : null;

    const logOutTimedAt = findUser.loggedOutTime
      ? new Date(findUser.loggedOutTime).getTime() / 1000
      : null;

    if (
      (passwordChangedAt && passwordChangedAt > iat) ||
      (logOutTimedAt && logOutTimedAt > iat)
    ) {
      throw Error('Unauthorized User: Try logging in again');
    }
  }

  const JwtPayload = {
    id: findUser.id,
    role: role,
  };
  const approvalToken = authUtil.createToken(
    JwtPayload,
    config.jwt_token_secret as string,
    config.token_expiresIn as string,
  );

  return {
    approvalToken,
  };
};

const forgetPassword = async (email: string) => {
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new Error('User not found with this email');
  }

  if (user.isDeleted) {
    throw new Error('This user is deleted. This function is not available.');
  }

  const tokenizeData = {
    email: email,
    role: user.role,
  };

  const resetToken = authUtil.createToken(
    tokenizeData,
    config.jwt_token_secret as string,
    config.otp_token_duration as string,
  );

  const resetTokenSending = await reSend_OTP(resetToken);

  if (!resetTokenSending) {
    throw Error('token sending failed');
  }

  return {
    message: 'an OTP sent to your email',
    token: resetTokenSending,
  };
};

const resetPassword = async (token: string, newPassword: string) => {
  // Validate inputs
  if (!token || !newPassword) {
    throw Error('Token and new password are required');
  }

  // // Basic password strength validation (example: min 8 characters)
  // if (newPassword.length < 8) {
  //   throw Error('New password must be at least 8 characters long');
  // }

  // Validate config values
  if (!config.jwt_token_secret || !config.bcrypt_salt) {
    throw Error(
      'Server configuration error: Missing JWT secret or bcrypt salt',
    );
  }

  // Decode the token
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      config.jwt_token_secret as string,
    ) as JwtPayload;
  } catch (err) {
    throw Error('Invalid or unauthorized token');
  }

  if (!decoded || !decoded.email) {
    throw Error('Invalid or unauthorized token');
  }

  const { email } = decoded;
  console.log('email', email);

  // Find the user and include the password field
  const findUser = await UserModel.findOne({ email: email }).select(
    '+password allowPasswordChange',
  );

  if (!findUser) {
    throw Error('User not found');
  }

  if (!findUser.allowPasswordChange) {
    throw Error(
      'No request to change password from this user, cant change password ..!',
    );
  }

  // Hash the new password
  const newPasswordHash = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt),
  );

  // Update the user's password and passwordChangeTime
  const updatePassword = await UserModel.findOneAndUpdate(
    { email: email },
    {
      allowPasswordChange: false,
      password: newPasswordHash,
      passwordChangeTime: new Date(),
    },
    { new: true },
  );

  if (!updatePassword) {
    throw Error('Error updating password');
  }

  return {
    passwordChanged: true,
    message: 'Password reset successfully',
  };
};

const collectProfileData = async (id: string) => {
  const result = await UserModel.findOne({ _id: id });
  return result;
};

const otpCrossCheck = async (
  token: string,
  OTP: string,
  passwordChange?: boolean,
) => {
  console.log('here i am ', token, OTP);

  if (!token || !OTP) {
    throw new Error('!token || !OTP');
  }

  const deTokenizeData = authUtil.decodeToken(token, config.jwt_token_secret);

  if (
    typeof deTokenizeData !== 'object' ||
    deTokenizeData === null ||
    !('email' in deTokenizeData) ||
    !('role' in deTokenizeData)
  ) {
    throw new Error('OTP VERIFICATION FAILED: Invalid token data');
  }

  const { email } = deTokenizeData as JwtPayload;

  const findUser = await UserModel.findOne({ email });

  if (!findUser || !findUser.sentOTP) {
    throw new Error('User not found');
  }

  if (String(findUser.sentOTP) !== String(OTP)) {
    throw new Error('Invalid OTP');
  }

  let updateUser;

  if (passwordChange) {
    updateUser = await UserModel.findOneAndUpdate(
      { email: email },
      {
        allowPasswordChange: true,
      },
      {
        new: true,
      },
    );

    if (!updateUser) {
      throw Error('cant update password now, something went wrong');
    }
  } else {
    updateUser = await UserModel.findOneAndUpdate(
      { email: email },
      {
        OTPVerified: true,
      },
      { new: true },
    );
  }

  return {
    message: 'OTP verified successfully',
    user: updateUser,
  };
};

const send_OTP = async (user_id: Types.ObjectId) => {
  const findUser = await UserModel.findById(user_id);
  console.log('i am find user', findUser);

  if (!findUser || !findUser.email || !findUser.role) {
    throw new Error('user or user email or Role is not found');
  }
  const sendOTP = await authUtil.sendOTPViaEmail({
    email: findUser.email,
    role: findUser.role,
  });

  return sendOTP;
};

const reSend_OTP = async (token: string) => {
  const decodedToken = authUtil.decodeAuthorizationToken(token);
  const { email } = decodedToken as JwtPayload;

  const findUser = await UserModel.findOne({ email: email });
  console.log('i am find user', findUser);

  if (!findUser || !findUser.email || !findUser.role) {
    throw new Error('user or user email or Role is not found');
  }

  const sendOTP = await authUtil.sendOTPViaEmail({
    email: findUser.email,
    role: findUser.role,
  });

  const updateUser = await UserModel.findOneAndUpdate(
    { email: email },
    {
      sentOTP: sendOTP.OTP,
    },
    { new: true },
  );

  if (!updateUser) {
    throw Error('updating User failed after sending email');
  }

  return sendOTP.token;
};

const authServices = {
  logIn,
  logOut,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
  collectProfileData,
  otpCrossCheck,
  send_OTP,
  reSend_OTP,
};
export default authServices;
