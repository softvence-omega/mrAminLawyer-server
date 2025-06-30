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



export type TSleepQuality =
  | { quality: 'excellent'; lowerLimit: 8; upperLimit: 10 } 
  | { quality: 'great'; lowerLimit: 7; upperLimit: 8 }
  | { quality: 'normal'; lowerLimit: 5; upperLimit: 6 }
  | { quality: 'bad'; lowerLimit: 0; upperLimit: 4 };

export type TWorkoutASetup = {
  user_id:Types.ObjectId;
  goal: 'lose_weight' | 'gain_weight' | 'ai_coach' | 'gain_insurance' | 'just_tryout_app';
  gender: 'male' | 'female' | 'other'; // Fixed space in "female "
  weight: number;
  age: number;
  height: number; // Fixed typo: hight -> height
  dietaryPreference: 'plant_based' | 'carbo_diet' | 'specialized' | 'traditional'; // Fixed: Traditional -> traditional
  exercisePreference: 'jogging' | 'walking' | 'hiking' | 'skating' | 'biking' | 'weightLift' | 'cardio' | 'yoga' | 'other';
  calorieGoal: number;
  sleepQuality: TSleepQuality;
};

export type TProfile = {
  name: string;
  phone?: string;
  email: string;
  img?: string;
  emailNotification: boolean;
  user_id: Types.ObjectId;
  workoutASetup?:Types.ObjectId;
  habits?: [Types.ObjectId]; // Optional to align with schema
  favoriteFood?:[Types.ObjectId];
  notificationList_id?: Types.ObjectId; // Optional to align with schema
  isDeleted?: boolean;
};