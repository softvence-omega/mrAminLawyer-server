import mongoose, { ClientSession, Types } from 'mongoose';
import { TProfile, TUser, TWorkoutASetup } from './user.interface';
import { ProfileModel, UserModel, WorkoutASetupModel } from './user.model';
import { deleteFile, uploadImgToCloudinary } from '../../util/uploadImgToCloudinary';
import authUtil from '../auth/auth.utill';
import { userRole } from '../../constents';

// const createUser = async (payload: Partial<TUser>,file:any, method?: string) => {
//   // Validate password match
//   if (payload.password !== payload.confirmPassword) {
//     return {
//       success: false,
//       message: 'Password and confirm password do not match.',
//       data: { user: null, token: null },
//     };
//   }

//   // Validate terms agreement
//   if (!payload.agreedToTerms) {
//     return {
//       success: false,
//       message: 'You must agree to the terms and conditions to register.',
//       data: { user: null, token: null },
//     };
//   }

//   // Check for existing user
//   console.log('Checking if user exists');
//   const existingUser = await UserModel.findOne({ email: payload.email }).select('+password');
//   if (existingUser && !existingUser.isDeleted) {
//     return {
//       success: false,
//       message: 'A user with this email already exists and is active.',
//       data: { user: null, token: null },
//     };
//   }
//   //upload imge to cloudinary from here


//   // Create new payload with default role
//   const userPayload = {
//     ...payload,
//     role: payload.role || userRole.user,
//   };

//   // Remove confirmPassword from payload
//   const { confirmPassword, ...userData } = userPayload;

//   console.log('User to be created:', userPayload);

//   // Check MongoDB connection state
//   if (mongoose.connection.readyState !== 1) {
//     console.error('MongoDB connection not ready, state:', mongoose.connection.readyState);
//     return {
//       success: false,
//       message: 'MongoDB connection is not ready.',
//       data: { user: null, token: null },
//     };
//   }

//   const session = await mongoose.startSession();

//   try {
//     await session.startTransaction();
//     console.log('Transaction started');

//     let user;

//     // Create user
//     if (method) {
//       console.log('Creating user with create method');
//       const created = await UserModel.create([userData], { session });
//       user = created[0];
//     } else {
//       console.log('Creating user with new/save method');
//       user = new UserModel({ ...userData });
//       await user.save({ session });
//     }

//     console.log('User created:', user._id);

//     // Create profile
//     console.log('Creating profile');
//     const profileCreation = await ProfileModel.create(
//       [
//         {
//           name: userData.name ?? 'user',
//           phone: userData.phone,
//           email: userData.email!,
//           user_id: user._id,
//           // img: defaultImageUpload.secure_url, // Uncomment if needed
//         },
//       ],
//       { session },
//     );

//     console.log('Profile created:', profileCreation[0]._id);

//     // Commit the transaction
//     await session.commitTransaction();
//     console.log('Transaction committed');

//     // Fetch the user after transaction
//     const fetchedUser = await UserModel.findOne({ email: userData.email }).select('-password');
//     if (!fetchedUser) {
//       return {
//         success: false,
//         message: 'User created but not found after transaction.',
//         data: { user: null, token: null },
//       };
//     }

//     // Send OTP
//     console.log('Sending OTP via email');
//     const token = await authUtil.sendOTPviaEmail(fetchedUser);

//     return {
//       success: true,
//       message: 'User created successfully and OTP sent.',
//       user: fetchedUser.toObject(),
//       token: token.token || null,
//     };
//   } catch (error: any) {
//     await session.abortTransaction();
//     console.error('Transaction failed:', error);
//     return {
//       success: false,
//       message: error.message || 'User creation failed due to an internal error.',
//       data: { user: null, token: null },
//     };
//   } finally {
//     session.endSession();
//     console.log('Session ended');
//   }
// };


const createUser = async (payload: Partial<TUser>, file?: any, method?: string) => {
  // Validate password match
  if (payload.password !== payload.confirmPassword) {
    throw new Error('Password and confirm password do not match.');
  }

  // Validate terms agreement
  if (!payload.agreedToTerms) {
    throw new Error('You must agree to the terms and conditions to register.');
  }

  // Validate file
  if (!file || !file.path) {
    throw new Error('Image file is required.');
  }

  // Check for existing user
  console.log('Checking if user exists');
  const existingUser = await UserModel.findOne({ email: payload.email }).select('+password');
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

  console.log('User to be created:', userPayload);

  // Check MongoDB connection state
  if (mongoose.connection.readyState !== 1) {
    console.error('MongoDB connection not ready, state:', mongoose.connection.readyState);
    throw new Error('MongoDB connection is not ready.');
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    console.log('Transaction started');

    // // Upload image to Cloudinary
    // const imageName = `${userData.email}-${Date.now()}`; // Unique name
    // const uploadResult = await uploadImgToCloudinary(imageName, file.path);
    // const imageUrl = uploadResult.secure_url;
    // console.log('Image uploaded to Cloudinary:', imageUrl);

    let imageUrl: string | undefined;

    // Optional: Upload image to Cloudinary
    if (file?.path) {
      const imageName = `${userData.email}-${Date.now()}`;
      const uploadResult = await uploadImgToCloudinary(imageName, file.path);
      imageUrl = uploadResult.secure_url;
      console.log('Image uploaded to Cloudinary:', imageUrl);
    } else {
      console.log('No image file provided, skipping upload');
    }

    // // Add image URL to userData
    // const userDataWithImg = {
    //   ...userData,
    //   img: imageUrl, // Include Cloudinary image URL for UserModel
    // };

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

    // Create profile with image URL
    console.log('Creating profile');
    const profileCreation = await ProfileModel.create(
      [
        {
          name: userData.name ?? 'user',
          phone: userData.phone,
          email: userData.email!,
          user_id: user._id,
          img: imageUrl, // Include Cloudinary image URL
        },
      ],
      { session },
    );

    console.log('Profile created:', profileCreation[0]._id);

    // Commit the transaction
    await session.commitTransaction();
    console.log('Transaction committed');

    // Fetch the user after transaction
    const fetchedUser = await UserModel.findOne({ email: userData.email }).select('-password');
    if (!fetchedUser) {
      throw new Error('User created but not found after transaction.');
    }

    // Send OTP
    console.log('Sending OTP via email');
    const token = await authUtil.sendOTPviaEmail(fetchedUser);

    return {
      success: true,
      message: 'User created successfully and OTP sent.',
      user: fetchedUser.toObject(),
      token: token.token || null,
    };
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Transaction failed:', error);

    // Clean up local file if upload failed
    if (file && file.path) {
      try {
        await deleteFile(file.path);
      } catch (deleteError) {
        console.error('Error deleting file:', deleteError);
      }
    }

    throw new Error(error.message || 'User creation failed due to an internal error.');
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
  const result = await UserModel.find({isBlocked:false,isDeleted:false});
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

const selfDistuct = async (user_id: Types.ObjectId) => {
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
    { path: 'workoutASetup', model: 'WorkoutASetup' },
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

const createWorkoutSetup = async (user_id: Types.ObjectId, payload: any) => {
  // Validate inputs
  if (!user_id) {
    throw new Error('User ID is required.');
  }

  if (
    !payload ||
    !payload.goal ||
    !payload.gender ||
    !payload.weight ||
    !payload.age ||
    !payload.height ||
    !payload.dietaryPreference ||
    !payload.exercisePreference ||
    !payload.calorieGoal ||
    !payload.sleepQuality
  ) {
    throw new Error('All workout setup fields, including sleepQuality, are required.');
  }

  // Map sleepQuality string to full TSleepQuality object
  let sleepQuality
  switch (payload.sleepQuality) {
    case 'excellent':
      sleepQuality = { quality: 'excellent', lowerLimit: 8, upperLimit: 10 };
      break;
    case 'great':
      sleepQuality = { quality: 'great', lowerLimit: 7, upperLimit: 8 };
      break;
    case 'normal':
      sleepQuality = { quality: 'normal', lowerLimit: 5, upperLimit: 6 };
      break;
    case 'bad':
      sleepQuality = { quality: 'bad', lowerLimit: 0, upperLimit: 4 };
      break;
    default:
      throw new Error('Invalid sleep quality. Must be one of: excellent, great, normal, bad.');
  }

  // Check MongoDB connection state
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection is not ready.');
  }

  const session = await WorkoutASetupModel.startSession();

  try {
    await session.startTransaction();
    console.log('Transaction started for workout setup creation');

    // Create a new workout setup
    const workoutSetup = new WorkoutASetupModel({
      user_id,
      goal: payload.goal,
      gender: payload.gender,
      weight: payload.weight,
      age: payload.age,
      height: payload.height,
      dietaryPreference: payload.dietaryPreference,
      exercisePreference: payload.exercisePreference,
      calorieGoal: payload.calorieGoal,
      sleepQuality,
    });

    // Save the workout setup
    const savedWorkoutSetup = await workoutSetup.save({ session });
    console.log('Workout setup saved:', savedWorkoutSetup._id);

    // Update the user's profile
    const updatedProfile = await ProfileModel.findOneAndUpdate(
      { user_id },
      { workoutASetup: savedWorkoutSetup._id },
      { new: true, session },
    );

    if (!updatedProfile) {
      throw new Error('Profile not found or update failed.');
    }

    console.log('Profile updated with workout setup:', updatedProfile._id);

    // Commit the transaction
    await session.commitTransaction();
    console.log('Transaction committed');

    return {
      success: true,
      message: 'Workout setup created successfully.',
      data: {
        workoutSetup: savedWorkoutSetup,
        profile: updatedProfile,
      },
    };
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error creating workout setup:', error);
    throw new Error(error.message || 'Failed to create workout setup due to an internal error.');
  } finally {
    session.endSession();
    console.log('Session ended');
  }
};


const updateWorkoutSetup = async (user_id:Types.ObjectId, payload:any) => {
  // Validate inputs
  if (!user_id) {
    throw new Error('User ID is required.');
  }

  if (!payload || Object.keys(payload).length === 0) {
    throw new Error('At least one field must be provided for update.');
  }

  // Map sleepQuality string to object if provided
  const updatePayload = { ...payload };
  if (payload.sleepQuality) {
    switch (payload.sleepQuality) {
      case 'excellent':
        updatePayload.sleepQuality = { quality: 'excellent', lowerLimit: 8, upperLimit: 10 };
        break;
      case 'great':
        updatePayload.sleepQuality = { quality: 'great', lowerLimit: 7, upperLimit: 8 };
        break;
      case 'normal':
        updatePayload.sleepQuality = { quality: 'normal', lowerLimit: 5, upperLimit: 6 };
        break;
      case 'bad':
        updatePayload.sleepQuality = { quality: 'bad', lowerLimit: 0, upperLimit: 4 };
        break;
      default:
        throw new Error('Invalid sleep quality. Must be one of: excellent, great, normal, bad.');
    }
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    console.log('Transaction started for workout setup update');

    // Check if workout setup exists
    const workoutSetup = await WorkoutASetupModel.findOne({ user_id }).session(session);
    if (!workoutSetup) {
      throw new Error('No workout setup found for the provided user ID.');
    }
    console.log('Existing workout setup found:', workoutSetup._id);

    // Update workout setup with all provided payload fields
    const updatedWorkoutSetup = await WorkoutASetupModel.findOneAndUpdate(
      { user_id },
      { $set: updatePayload },
      { new: true, session },
    );
    if (!updatedWorkoutSetup) {
      throw new Error('Failed to update workout setup.');
    }
    console.log('Workout setup updated:', updatedWorkoutSetup._id);

    // Find the user's profile
    const profile = await ProfileModel.findOne({ user_id }).session(session);
    if (!profile) {
      throw new Error('Profile not found for the provided user ID.');
    }
    console.log('Profile found:', profile._id);

    // Commit the transaction
    console.log('Committing transaction');
    await session.commitTransaction();
    console.log('Transaction committed');

    return {
      success: true,
      message: 'Workout setup updated successfully.',
      data: {
        workoutSetup: updatedWorkoutSetup,
        profile: profile,
      },
    };
  } catch (error:any) {
    await session.abortTransaction();
    console.error('Error in updateWorkoutSetup:', {
      message: error.message,
      stack: error.stack,
      error,
    });
    throw new Error(error.message || 'Failed to update workout setup due to an internal error.');
  } finally {
    session.endSession();
    console.log('Session ended');
  }
};

const getWorkoutSetup = async(user_id:Types.ObjectId)=>{
  // Validate user_id
  if (!user_id) {
    throw new Error('User ID is required.');
  }

  // Fetch workout setup for the given user_id
  const workoutSetup = await WorkoutASetupModel.findOne({ user_id }).populate('user_id', 'name email');

  if (!workoutSetup) {
    throw new Error('No workout setup found for the provided user ID.');
  }

  return workoutSetup;
};


const userServices = {
  createUser,
  getAllUsers,
  updateProfileData,
  deleteSingleUser,
  selfDistuct,
  uploadOrChangeImg,
  getProfile,
  updateUserProfile,
  getAllProfiles,
  updateUserByAdmin,
  getUserFullDetails,
  setFCMToken,
  createWorkoutSetup,
  updateWorkoutSetup,
  getWorkoutSetup
};

export default userServices;
