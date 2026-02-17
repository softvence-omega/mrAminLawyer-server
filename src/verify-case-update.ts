import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { CaseOverviewModel } from './modules/case/case.model';

dotenv.config();

async function verifyUpdate() {
  console.log('--- Case Update Verification ---');
  try {
    if (!process.env.MONGOOSE_URI) {
      throw new Error('MONGOOSE_URI not found in .env');
    }
    await mongoose.connect(process.env.MONGOOSE_URI);
    console.log('✅ Database Connected');

    // Find an existing case
    const testCase = await CaseOverviewModel.findOne({ isDeleted: false });
    if (!testCase) {
      console.log('❌ No cases found to test with.');
      return;
    }

    const originalUpdatedAt = testCase.updatedAt;
    console.log(`Initial updatedAt: ${originalUpdatedAt}`);

    // Wait a bit to ensure a timestamp difference
    console.log('Waiting 2 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate the fix: updateOne without any field change, or with the same ID
    console.log('Executing CaseOverviewModel.updateOne logic...');
    await CaseOverviewModel.updateOne(
      { _id: testCase._id },
      { $set: { assetList_id: testCase.assetList_id } },
    );

    // Fetch again
    const updatedCase = await CaseOverviewModel.findById(testCase._id);
    const finalUpdatedAt = updatedCase?.updatedAt;
    console.log(`Final updatedAt:   ${finalUpdatedAt}`);

    if (
      finalUpdatedAt &&
      originalUpdatedAt &&
      finalUpdatedAt.getTime() > originalUpdatedAt.getTime()
    ) {
      console.log('✅ SUCCESS: updatedAt field was successfully refreshed!');
    } else {
      console.log('❌ FAILURE: updatedAt field did NOT change.');
      console.log(
        'Note: If they are exactly the same, Mongoose might be skipping the update because no fields changed value.',
      );

      console.log('Trying with explicit updatedAt touch...');
      await CaseOverviewModel.updateOne(
        { _id: testCase._id },
        { $set: { updatedAt: new Date() } },
      );

      const forcedCase = await CaseOverviewModel.findById(testCase._id);
      console.log(`Forced updatedAt:  ${forcedCase?.updatedAt}`);
      if (
        forcedCase?.updatedAt &&
        originalUpdatedAt &&
        forcedCase.updatedAt.getTime() > originalUpdatedAt.getTime()
      ) {
        console.log('✅ SUCCESS (with explicit touch): updatedAt updated.');
      }
    }
  } catch (err) {
    console.error('❌ Verification Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyUpdate();
