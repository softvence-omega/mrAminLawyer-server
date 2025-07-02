import jwt, { Secret } from 'jsonwebtoken';
import config from '../../config';
import { TUser } from '../user/user.interface';
import crypto from 'crypto';
import { UserModel } from '../user/user.model';
import { sendEmail } from '../../util/sendEmail';

const createToken = (
  tokenizeData: Record<string, any>,
  tokenSecret: string,
  expiresIn: any,
): string => {
  if (!tokenSecret) {
    throw new Error('Token secret is missing.');
  }

  return jwt.sign(tokenizeData, tokenSecret, { expiresIn });
};

const decodeToken = (token: string, secret: Secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null; // Handle invalid token gracefully
  }
};

const decodeAuthorizationToken = (token: string) =>
  decodeToken(token, config.jwt_token_secret);

const decodeRefreshToken = (token: string) =>
  decodeToken(token, config.jwt_refresh_Token_secret);

const sendOTPViaEmail = async (payload: Partial<TUser>) => {
  console.log('from send otp via email', payload);

  if (!payload.email || !payload.role) {
    throw new Error('!payload.email || !payload.role wnt missing');
  }

  const otp = crypto.randomInt(100000, 1000000); // 6-digit
  console.log(otp);

  const tokenizeData = createToken(
    {
      email: payload.email,
      role: payload.role,
    },
    config.jwt_token_secret,
    config.otp_token_duration,
  );

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
    <h2 style="color: #2c3e50;">Mr. Amin Lawyer Verification Code</h2>
    <p style="font-size: 16px;">Hello 👋,</p>
    <p style="font-size: 16px;">
      Your One-Time Password (OTP) is:
    </p>
    <div style="font-size: 28px; font-weight: bold; margin: 20px 0; color: #1abc9c;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #555;">
      This OTP will expire in 5 minutes. If you did not request this, please ignore this email.
    </p>
    <hr style="margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">Thank you,<br/>M Team</p>
  </div>
`;

  const updateUserWithOtp = await UserModel.findOneAndUpdate(
    { email: payload.email },
    {
      sentOTP: otp,
    },
    { new: true },
  );

  if (!updateUserWithOtp) {
    throw Error('failed to update user with OTP');
  }
  //   now send mail to the user with otp
  const sendEmailWithOtp = await sendEmail(
    payload.email,
    'OTP from Mr. Amin Lawyer',
    html,
  );
  if (!sendEmailWithOtp.success) {
    throw new Error('email sending failed');
  }

  const token = `${tokenizeData}`;

  return {
    token: token,
    OTP: otp,
  };
};

const authUtil = {
  createToken,
  decodeAuthorizationToken,
  decodeRefreshToken,
  sendOTPViaEmail,
  decodeToken,
};

export default authUtil;
