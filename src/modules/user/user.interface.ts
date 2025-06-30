import { Types } from "mongoose";
import { boolean } from "zod";

// Assuming TUserRole is an enum based on previous context
export type TUserRole = 'admin' | 'user';

export type TInterviewsAvailable = number | 'unlimited';

export type TUser = {
  img:string,
  name: string;
  phone?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  agreedToTerms: boolean; // Fixed typo: agreedToTerms -> agreedToTerms
  role: TUserRole;
  allowPasswordChange: boolean;
  sentOTP?: string; // Made optional
  OTPVerified?: boolean; // Made optional
  isDeleted?: boolean; // Changed to boolean
  isBlocked?: boolean;
  isLoggedIn?: boolean;
  loggedOutTime?: Date;
  passwordChangeTime?: Date;
  fcmToken?: string;
};

export type TProfile = {
  name: string;
  phone?: string;
  email: string;
  img?: string;
  emailNotification: boolean;
  case_ids?:[Types.ObjectId];
  user_id: Types.ObjectId;
  notificationList_id?: Types.ObjectId; // Optional to align with schema
  isDeleted?: boolean;
};