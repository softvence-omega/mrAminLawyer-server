import bcrypt from 'bcrypt';
import mongoose, { Schema, Types } from 'mongoose';
import { TProfile, TUser, TWorkoutASetup, TSleepQuality } from './user.interface';
import { userRole } from '../../constents';

const SleepQualitySchema = new Schema<TSleepQuality>({
  quality: { 
    type: String, 
    enum: ['excellent', 'great', 'normal', 'bad'], 
    required: true 
  },
  lowerLimit: { 
    type: Number, 
    enum: [1,2,3,4,5,6,9,8, 7, 3, 0], 
    required: true 
  },
  upperLimit: { 
    type: Number, 
    enum: [1,2,3,4,5,6,9,8, 7, 3, 0], 
    required: true 
  }
});

const WorkoutASetupSchema = new Schema<TWorkoutASetup>({
  user_id: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: 'UserCollection',
    unique:true 
  },
  goal: { 
    type: String, 
    enum: ['lose_weight', 'gain_weight', 'ai_coach', 'gain_insurance', 'just_tryout_app'], 
    required: true 
  },
  gender: { 
    type: String, 
    enum: ['male', 'female', 'other'], 
    required: true 
  },
  weight: { type: Number, required: true },
  age: { type: Number, required: true },
  height: { type: Number, required: true },
  dietaryPreference: { 
    type: String, 
    enum: ['plant_based', 'carbo_diet', 'specialized', 'traditional'], 
    required: true 
  },
  exercisePreference: { 
    type: String, 
    enum: ['jogging', 'walking', 'hiking', 'skating', 'biking', 'weightLift', 'cardio', 'yoga', 'other'], 
    required: true 
  },
  calorieGoal: { type: Number, required: true },
  sleepQuality: { type: SleepQualitySchema, required: true }
});

const UserSchema = new Schema<TUser>(
  {
    img:{ type: String, required: false },
    name: { type: String, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: true },
    password: { type: String, required: true },
    confirmPassword: { type: String, required: false },
    agreedToTerms: { type: Boolean, required: true }, // Fixed typo
    role: { type: String, enum: ['admin', 'user'], default: userRole.user },
    allowPasswordChange: { type: Boolean, required: true, default: false },
    sentOTP: { type: String, required: false }, // Made optional
    OTPVerified: { type: Boolean, required: false, default: false }, // Made optional
    isDeleted: { type: Boolean, required: false, default: false },
    isBlocked: { type: Boolean, required: false, default: false },
    isLoggedIn: { type: Boolean, required: false, default: false },
    loggedOutTime: { type: Date, required: false },
    passwordChangeTime: { type: Date, required: false },
    fcmToken: { type: String, required: false, default: null },
  },
  { timestamps: true }
);



const ProfileSchema = new Schema<TProfile>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: true },
    img: { 
      type: String, 
      required: false, 
      default: "https://res.cloudinary.com/dpgcpei5u/image/upload/v1747546759/interviewProfile_jvo9jl.jpg" 
    },
    emailNotification: { type: Boolean, required: false, default: false },
    user_id: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      ref: 'UserCollection' 
    },
    workoutASetup: { 
      type: Schema.Types.ObjectId, 
      required: false, 
      ref: 'WorkoutASetup' 
    },
    habits:{
      type:[Types.ObjectId],
      required:false
    },
    favoriteFood:{
      type: [Schema.Types.ObjectId], 
      required: false, 
      ref: 'FoodCollection' // Assuming you have a MealCollection model
    },
    notificationList_id: { 
      type: Schema.Types.ObjectId, 
      required: false, 
      ref: 'NotificationList' 
    },
    isDeleted: { type: Boolean, required: false, default: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Hash only if password is modified

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    return next(error);
  }
});

export const UserModel = mongoose.model('UserCollection', UserSchema);
export const ProfileModel = mongoose.model('Profile', ProfileSchema);
export const WorkoutASetupModel = mongoose.model('WorkoutASetup', WorkoutASetupSchema);