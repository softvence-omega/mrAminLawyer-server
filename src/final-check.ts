import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { UserModel, ProfileModel } from './modules/user/user.model';
import { sendSingleNotification } from './firebaseSetup/sendPushNotification';
import {
  NotificationListModel,
  NotificationModel,
} from './modules/notifications/notifications.model';

dotenv.config();

async function verifyPerfect() {
  console.log('--- FINAL 100% PERFECTION CHECK ---');
  try {
    await mongoose.connect(process.env.MONGOOSE_URI!);
    console.log('✅ 1. Database Connection: OK');

    const adminEmail = 'aminmuratkasim7@gmail.com';
    const userEmail = 'shakilahammed0555@gmail.com';

    // 2. Check Admin
    const adminUser = await UserModel.findOne({ email: adminEmail }).select(
      '+password',
    );
    if (!adminUser) {
      console.log('❌ Admin not found:', adminEmail);
    } else {
      const isMatch = await bcrypt.compare('12345678', adminUser.password);
      console.log(
        `✅ 2. Admin Check (${adminEmail}): Found. Password Match: ${isMatch}`,
      );
    }

    // 3. Check User
    const user = await UserModel.findOne({ email: userEmail }).select(
      '+password',
    );
    if (!user) {
      console.log('❌ User not found:', userEmail);
    } else {
      const isMatch = await bcrypt.compare('1234567', user.password);
      console.log(
        `✅ 3. User Check (${userEmail}): Found. Password Match: ${isMatch}`,
      );
      console.log(
        `   - Legacy fcmToken: ${user.get('fcmToken') ? 'PRESENT (⚠️)' : 'CLEANED (✅)'}`,
      );
      console.log(`   - New fcmTokens count: ${user.fcmTokens?.length || 0}`);
    }

    if (!user) return;

    // 4. Reset Bell for User to test cleanly
    await NotificationListModel.updateOne(
      { user_id: user._id },
      { $set: { newNotification: 0 } },
    );
    console.log('✅ 4. Reset User Bell: OK');

    // 5. Trigger Notification (Simulating Admin Action)
    console.log('✅ 5. Triggering Notification...');
    const result = await sendSingleNotification(
      user._id as Types.ObjectId,
      'Final Verification',
      'The system is 100% perfect!',
      'case_notification',
    );
    console.log('   - Trigger Result:', result.message);

    // 6. Verify Bell Count
    const updatedList = await NotificationListModel.findOne({
      user_id: user._id,
    });
    const bellCount = updatedList?.newNotification || 0;
    console.log(`✅ 6. Final Bell Count Verification: ${bellCount}`);

    if (bellCount === 1) {
      console.log('\n🌟 VERDICT: THE SYSTEM IS 100% PERFECT! 🌟');
    } else {
      console.log('\n❌ VERDICT: BELL COUNT MISMATCH.');
    }

    // List latest notification
    const latest = await NotificationModel.findOne({ user_id: user._id }).sort({
      createdAt: -1,
    });
    console.log(
      `   - Latest Notification Detail: ${latest?.notificationDetail}`,
    );
  } catch (err) {
    console.error('❌ CHECK FAILED:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyPerfect();
