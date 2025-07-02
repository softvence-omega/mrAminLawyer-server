import { Types } from 'mongoose';
import catchAsync from '../../util/catchAsync';
import globalResponseHandler from '../../util/globalResponseHandler';
import idConverter from '../../util/idConverter';
import userServices from './user.service';

const createUser = catchAsync(async (req, res): Promise<void> => {
  const file = req.file; // Assuming file is from middleware like multer
  if (!file) {
    throw new Error('Image file is required');
  }

  const data = req.body.data;
  if (!data) {
    throw new Error('Data must be provided');
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(data); // Parse JSON string from req.body.data
  } catch (error: any) {
    throw new Error('Invalid JSON data provided');
  }

  const result = await userServices.createUser(parsedData, file);

  res.status(200).json({
    status: 'success',
    message: result.message || 'User created successfully',
    data: result,
  });
});

const setFCMToken = catchAsync(async (req, res) => {
  const user_id = req.user.id; // Assuming req.user.id is already an ObjectId from your auth middleware
  const fcmToken = req.body.fcmToken;

  if (!fcmToken) {
    throw new Error('fcm token is required');
  }

  const result = await userServices.setFCMToken(user_id, fcmToken);

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'FCM token set successfully',
    data: result,
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const result = await userServices.getAllUsers();
  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'All users',
    data: result,
  });
});

const getAllProfiles = catchAsync(async (req, res) => {
  // Call the user service method to get all profiles
  const result = await userServices.getAllProfiles();

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'All profiles retrieved successfully',
    data: result,
  });
});

// update profile controller
const updateUserProfile = catchAsync(async (req, res) => {
  const user_id = req.user.id; // Assuming req.user.id is already an ObjectId from your auth middleware

  // No need to convert to ObjectId since it's already an ObjectId
  // Parse JSON data from 'data' field in form-data
  const profileData = JSON.parse(req.body.data);
  const imgFile = req.file; // Image file (if uploaded)

  // Call the service to update the profile, passing the imgFile (optional)
  const updatedProfile = await userServices.updateUserProfile(
    user_id,
    profileData,
    imgFile,
  );

  // Send the response with the updated profile data
  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile,
  });
});

const updateProfileData = catchAsync(async (req, res) => {
  const user_id =
    typeof req.user.id === 'string' ? idConverter(req.user.id) : req.user.id;
  const payload = req.body;
  const result = await userServices.updateProfileData(user_id, payload);
  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'profile updated',
    data: result,
  });
});

const deleteSingleUser = catchAsync(async (req, res) => {
  const user_id = req.query.user_id as string;
  const userIdConverted = idConverter(user_id);
  console.log(user_id, userIdConverted);
  if (!userIdConverted) {
    throw new Error('user id conversion failed');
  }
  const result = await userServices.deleteSingleUser(userIdConverted);
  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'user deleted',
    data: result,
  });
});

const selfDestruct = catchAsync(async (req, res) => {
  const user_id = req.user.id;
  const userIdConverted = idConverter(user_id);
  if (!userIdConverted) {
    throw new Error('user id conversion failed');
  }

  const result = await userServices.selfDestruct(userIdConverted);

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'your account deletion successful',
    data: result,
  });
});

const uploadOrChangeImg = catchAsync(async (req, res) => {
  const actionType = req.query.actionType as string; // Fixed typo in `actionType`
  const user_id = req.user.id;
  const imgFile = req.file;

  if (!user_id || !imgFile) {
    throw new Error('User ID and image file are required.');
  }

  // Ensure `idConverter` returns only the ObjectId
  const userIdConverted = idConverter(user_id);
  if (!(userIdConverted instanceof Types.ObjectId)) {
    throw new Error('User ID conversion failed');
  }

  // Call the service function to handle the upload
  const result = await userServices.uploadOrChangeImg(
    userIdConverted,
    imgFile as Express.Multer.File,
  );

  // Send response
  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: `Your profile picture has been ${actionType || 'updated'}`,
    data: result,
  });
});

const getProfile = catchAsync(async (req, res) => {
  const user_id = req.user.id;
  const converted_user_id = idConverter(user_id);
  if (!converted_user_id) {
    throw Error('id conversation failed');
  }
  const result = await userServices.getProfile(converted_user_id);

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'your position retrieved successfully',
    data: result,
  });
});

const updateUserByAdmin = catchAsync(async (req, res) => {
  const user_id = req.params.id;
  const convertedUserId = idConverter(user_id);

  if (!convertedUserId) {
    throw new Error('User ID conversion failed');
  }

  const payload = req.body;

  const result = await userServices.updateUserByAdmin(convertedUserId, payload);

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'User updated successfully',
    data: result,
  });
});

const getUserFullDetails = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const convertedUserId = idConverter(userId);

  if (!convertedUserId) {
    throw new Error('Invalid user ID.');
  }

  const result = await userServices.getUserFullDetails(convertedUserId);

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'User full details retrieved successfully',
    data: result,
  });
});

const blockUserController = catchAsync(async (req, res) => {
  const userId = req.params.id;

  const result = await userServices.blockUser(userId);

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'User blocked successfully',
    data: result,
  });
});

const unblockUserController = catchAsync(async (req, res) => {
  const userId = req.params.id;

  const result = await userServices.unblockUser(userId);

  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: 'User unblocked successfully',
    data: result,
  });
});

const userController = {
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
  blockUserController,
  unblockUserController
};

export default userController;
