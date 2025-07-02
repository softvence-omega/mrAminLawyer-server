import mongoose, { ClientSession, Types } from 'mongoose';
import { TProfile, TUser } from './user.interface';
import { ProfileModel, UserModel } from './user.model';
import {
  deleteFile,
  uploadImgToCloudinary,
} from '../../util/uploadImgToCloudinary';
import authUtil from '../auth/auth.util';
import { userRole } from '../../constants';

const createUser = async (
  payload: Partial<TUser>,
  file?: any,
  method?: string,
) => {
  // Validate password match
  if (payload.password !== payload.confirmPassword) {
    throw new Error('Password and confirm password do not match.');
  }

  // Validate terms agreement
  if (!payload.agreedToTerms) {
    throw new Error('You must agree to the terms and conditions to register.');
  }

  // Check for existing user
  // console.log('Checking if user exists');
  const existingUser = await UserModel.findOne({ email: payload.email }).select(
    '+password',
  );
  if (existingUser && !existingUser.isDeleted) {
    throw new Error('A user with this email already exists and is active.');
  }

  // Create new payload with default role
  const userPayload = {
    ...payload,
    role: payload.role || userRole.user,
  };

  // Remove confirmPassword from payload
  const { confirmPassword, ...userData } = userPayload;

  // console.log('User to be created:', userPayload);

  // Check MongoDB connection state
  if (mongoose.connection.readyState !== 1) {
    console.error(
      'MongoDB connection not ready, state:',
      mongoose.connection.readyState,
    );
    throw new Error('MongoDB connection is not ready.');
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    // console.log('Transaction started');

    let imageUrl: string | undefined;

    // Optional: Upload image to Cloudinary if file is provided
    if (file?.path) {
      const imageName = `${userData.email}-${Date.now()}`;
      const uploadResult = await uploadImgToCloudinary(imageName, file.path);
      imageUrl = uploadResult.secure_url;
      console.log('Image uploaded to Cloudinary:', imageUrl);
    } else {
      console.log('No image file provided, skipping upload');
    }

    // Add image URL to userData if available
    const userDataWithImg = {
      ...userData,
      ...(imageUrl && { img: imageUrl }),
    };

    let user;

    // Create user
    if (method) {
      console.log('Creating user with create method');
      const created = await UserModel.create([userDataWithImg], { session });
      user = created[0];
    } else {
      console.log('Creating user with new/save method');
      user = new UserModel({ ...userDataWithImg });
      await user.save({ session });
    }

    console.log('User created:', user._id);

    // Create profile with image URL (or undefined if no image)
    console.log('Creating profile');
    const profileCreation = await ProfileModel.create(
      [
        {
          name: userData.name ?? 'user',
          phone: userData.phone,
          email: userData.email!,
          user_id: user._id,
          img: imageUrl, // Include Cloudinary image URL or undefined
        },
      ],
      { session },
    );

    console.log('Profile created:', profileCreation[0]._id);

    // Commit the transaction
    await session.commitTransaction();
    console.log('Transaction committed');

    // Fetch the user after transaction
    const fetchedUser = await UserModel.findOne({
      email: userData.email,
    }).select('-password');
    if (!fetchedUser) {
      throw new Error('User created but not found after transaction.');
    }

    // Send OTP
    console.log('Sending OTP via email');
    const token = await authUtil.sendOTPViaEmail(fetchedUser);

    return {
      success: true,
      message: 'User created successfully and OTP sent.',
      user: fetchedUser.toObject(),
      token: token.token || null,
    };
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Transaction failed:', error);

    // Clean up local file if upload failed and file was provided
    if (file?.path) {
      try {
        await deleteFile(file.path);
      } catch (deleteError) {
        console.error('Error deleting file:', deleteError);
      }
    }

    throw new Error(
      error.message || 'User creation failed due to an internal error.',
    );
  } finally {
    session.endSession();
    console.log('Session ended');
  }
};

const setFCMToken = async (user_id: Types.ObjectId, fcmToken: string) => {
  if (!fcmToken) {
    throw new Error('fcm token is required');
  }

  const result = await UserModel.findOneAndUpdate(
    {
      _id: user_id,
    },
    {
      fcmToken: fcmToken,
    },
    { new: true },
  );

  return result;
};

const getAllUsers = async () => {
  const result = await UserModel.find({ isBlocked: false, isDeleted: false });
  return result;
};

const getAllProfiles = async () => {
  // Assuming you have a Profile model, fetch all profiles
  const profiles = await ProfileModel.find({});
  return profiles;
};

// update profile with profile image
const updateUserProfile = async (
  user_id: Types.ObjectId, // MongoDB default _id is of type ObjectId
  payload?: Partial<TProfile>,
  imgFile?: Express.Multer.File, // imgFile is optional now
) => {
  const updatedProfileData = { ...payload }; // Start with the existing payload

  // If imgFile is provided, upload it to Cloudinary
  if (imgFile) {
    try {
      const imageUploadResult = await uploadImgToCloudinary(
        `profile-${user_id.toString()}`, // Custom name for the image
        imgFile.path, // Path to the uploaded image
      );

      // Add the image URL to the updated profile data
      updatedProfileData.img = imageUploadResult.secure_url;
    } catch (error: any) {
      throw new Error('Error uploading image: ' + error.message);
    }
  }

  // Now update the profile with the provided data (including the image if uploaded)
  try {
    const updatedProfile = await ProfileModel.findOneAndUpdate(
      { user_id },
      { $set: updatedProfileData },
      { new: true }, // Return the updated document
    );

    return updatedProfile;
  } catch (error: any) {
    throw new Error('Profile update failed: ' + error.message);
  }
};

const updateProfileData = async (
  user_id: Types.ObjectId,
  payload: Partial<TProfile>,
) => {
  try {
    const updatedProfile = await ProfileModel.findOneAndUpdate(
      { user_id },
      { $set: payload },
      { new: true },
    );
    return updatedProfile;
  } catch (error) {
    throw error;
  }
};

const deleteSingleUser = async (user_id: Types.ObjectId) => {
  const session: ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate user_id
    if (!Types.ObjectId.isValid(user_id)) {
      throw new Error('Invalid user ID provided');
    }

    // Update the UserModel
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: user_id },
      { isDeleted: true, email: null },
      { new: true, session }, // Return the updated document
    );

    if (!updatedUser) {
      throw new Error('User not found');
    }

    // Update the ProfileModel
    const updatedProfile = await ProfileModel.findOneAndUpdate(
      { user_id },
      { isDeleted: true, email: null },
      { new: true, session }, // Return the updated document
    );

    if (!updatedProfile) {
      throw new Error('Profile not found for the user');
    }

    // Commit the transaction
    await session.commitTransaction();

    return {
      success: true,
      message: 'User and associated profile deleted successfully',
      data: {
        userId: user_id,
        updatedUser,
        updatedProfile,
      },
    };
  } catch (error: any) {
    // Abort the transaction on error
    await session.abortTransaction();
    throw new Error(`Failed to delete user: ${error.message}`);
  } finally {
    // Always end the session
    session.endSession();
  }
};

const selfDestruct = async (user_id: Types.ObjectId) => {
  const result = deleteSingleUser(user_id);
  return result;
};

const uploadOrChangeImg = async (
  user_id: Types.ObjectId,
  imgFile: Express.Multer.File,
) => {
  if (!user_id || !imgFile) {
    throw new Error('User ID and image file are required.');
  }

  // Upload new image to Cloudinary
  const result = await uploadImgToCloudinary(imgFile.filename, imgFile.path);

  console.log(result);

  if (!result.secure_url) {
    throw new Error('Image upload failed.');
  }

  // Update user profile with new image URL
  const updatedUserProfile = await ProfileModel.findOneAndUpdate(
    { user_id }, // Corrected query (find by user_id, not _id)
    { img: result.secure_url },
    { new: true },
  );

  if (!updatedUserProfile) {
    throw new Error('Profile not found or update failed.');
  }

  return updatedUserProfile;
};

const getProfile = async (user_id: Types.ObjectId) => {
  const profile = await ProfileModel.findOne({ user_id }).populate([
    { path: 'user_id', model: 'UserCollection' },
  ]);

  if (!profile) {
    throw new Error('Profile not found for the given user_id');
  }

  return profile;
};

// In userServices.ts
const updateUserByAdmin = async (
  userId: Types.ObjectId,
  payload: Partial<TUser>,
) => {
  console.log('Received userId:', userId.toString());
  console.log('Received payload:', payload);

  if (payload.isBlocked === true) {
    payload.isLoggedIn = false;
  }

  const updatedUser = await UserModel.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new Error('User not found or update failed');
  }

  console.log('Updated user:', updatedUser);
  return updatedUser;
};

const getUserFullDetails = async (userId: Types.ObjectId) => {
  const user = await UserModel.findById(userId).select('-password');
  const profile = await ProfileModel.findOne({ user_id: userId });

  return {
    user,
    profile,
  };
};

const blockUser = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  user.isBlocked = true;
  user.isLoggedIn = false;
  user.loggedOutTime = new Date();
  await user.save();
  return user;
};

const unblockUser = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.isBlocked = false;
  await user.save();

  return user;
};


const userServices = {
  createUser,
  getAllUsers,
  updateProfileData,
  deleteSingleUser,
  selfDestruct,
  uploadOrChangeImg,
  getProfile,
  updateUserProfile,
  getAllProfiles,
  updateUserByAdmin,
  getUserFullDetails,
  setFCMToken,
  blockUser,
  unblockUser
};

export default userServices;
