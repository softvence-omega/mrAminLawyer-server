import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import authUtil from '../modules/auth/auth.util';
import catchAsync from '../util/catchAsync';
import { TUserRole } from '../constants';
import { UserModel } from '../modules/user/user.model';
import idConverter from '../util/idConverter';

type AuthOptions = {
  requestOTP?: boolean;
};

const auth = (roles: TUserRole[], options?: AuthOptions) => {
  const { requestOTP = false } = options || {};

  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authorizationToken = req.headers.authorization;

    console.log('yoo token', authorizationToken);

    if (!authorizationToken) {
      throw new Error('Unauthorized: Missing Authorization Token');
    }

    const decoded = authUtil.decodeAuthorizationToken(authorizationToken);

    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Unauthorized: Invalid Token');
    }

    const { id, role, iat, OTPVerified } = decoded as JwtPayload;

    console.log('bla bla', id, role, iat, OTPVerified);

    if (!requestOTP && !OTPVerified) {
      throw new Error(
        'Unauthorized: Please verify your OTP to access this resource',
      );
    }

    if (requestOTP && OTPVerified) {
      throw new Error('Unauthorized: You are already verified');
    }

    if (!roles.includes(role)) {
      throw new Error('Unauthorized: Role not permitted');
    }

    const findUser = await UserModel.findOne({
      _id: idConverter(id),
      isDeleted: false,
    });

    if (!findUser) {
      throw new Error('Unauthorized: User not found or logged out');
    }

    const logOutTime = findUser.loggedOutTime
      ? new Date(findUser.loggedOutTime).getTime() / 1000
      : null;

    if (logOutTime && iat && iat < logOutTime) {
      throw new Error('Unauthorized: Session expired. Please log in again');
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

export default auth;
