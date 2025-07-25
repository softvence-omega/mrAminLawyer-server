import express from 'express';
import userController from './user.controller';
import { userRole } from '../../constants';

import { upload } from '../../util/uploadImgToCludinary';
import auth from '../../middleware/auth';
import { UserModel } from './user.model';
const userRoutes = express.Router();

// users routes
userRoutes.post(
  '/createUser',
  upload.single('file'),
  userController.createUser,
);

userRoutes.post(
  '/setFCMToken',
  auth([userRole.admin, userRole.user]),
  userController.setFCMToken,
);

userRoutes.patch(
  '/updateProfileData',
  auth([userRole.admin, userRole.user]),
  userController.updateProfileData,
);

userRoutes.delete(
  '/selfDestruct',
  auth([userRole.user]),
  userController.selfDestruct,
);

userRoutes.post(
  '/uploadOrChangeImg',
  auth([userRole.admin, userRole.user]),
  upload.single('files'),
  userController.uploadOrChangeImg,
);

userRoutes.get(
  '/getProfile',
  auth([userRole.admin, userRole.user]),
  userController.getProfile,
);

userRoutes.get(
  '/userDetails/:id',
  auth([userRole.admin]),
  userController.getUserFullDetails,
);

// Route to get all profiles
userRoutes.get('/all-profiles', userController.getAllProfiles);

userRoutes.put(
  '/update-user/:id',
  auth([userRole.admin, userRole.user]),
  userController.updateUserByAdmin,
);

// admin routes
userRoutes.get(
  '/getAllUser',
  auth([userRole.admin, userRole.user]),
  userController.getAllUsers,
);

userRoutes.delete(
  '/deleteSingleUser',
  auth([userRole.admin]),
  userController.deleteSingleUser,
);

// Update Profile Route (with image upload)
userRoutes.patch(
  '/updateProfile',
  auth([userRole.admin, userRole.user]),
  upload.single('img'),
  userController.updateUserProfile,
);

// PUT /users/block/:id
userRoutes.put('/block/:id', auth([userRole.admin]), userController.blockUserController);

// Unblock user
userRoutes.put('/unblock/:id', auth([userRole.admin]), userController.unblockUserController);

// PATCH /user/notification-toggle
userRoutes.patch(
  '/notification-toggle',
  auth([userRole.user, userRole.admin]),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { enabled } = req.body;

      await UserModel.findByIdAndUpdate(userId, {
        notificationsEnabled: enabled,
      });

      res.json({
        success: true,
        message: `Notifications ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Notification toggle error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
);

export default userRoutes;
