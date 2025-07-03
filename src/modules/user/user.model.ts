import bcrypt from 'bcrypt';
import mongoose, { Schema } from 'mongoose';
import { TProfile, TUser } from './user.interface';
import { userRole } from '../../constants';

const UserSchema = new Schema<TUser>(
  {
    img: { type: String, required: false },
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
  { timestamps: true },
);

const ProfileSchema = new Schema<TProfile>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: true },
    img: {
      type: String,
      required: false,
      default:
        'https://res.cloudinary.com/dpgcpei5u/image/upload/v1747546759/interviewProfile_jvo9jl.jpg',
    },
    emailNotification: { type: Boolean, required: false, default: false },
    user_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'UserCollection',
    },
    notificationList_id: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'NotificationList',
    },
    case_ids: [{ type: Schema.Types.ObjectId, ref: 'CaseOverview' }],
    isDeleted: { type: Boolean, required: false, default: false },
  },
  { timestamps: true },
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
