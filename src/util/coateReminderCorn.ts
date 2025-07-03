// import cron from 'node-cron';
// import mongoose from 'mongoose';
// import { UserModel } from '../modules/user/user.model';
// import { sendEmail } from './sendEmail';


// // Function to send reminder email
// const sendReminderEmail = async (clientName: string, email: string, courtDate: string, caseType: string) => {
//   const subject = 'Court Date Reminder';
//   const html = `
//     <h2>Court Date Reminder</h2>
//     <p>Dear ${clientName},</p>
//     <p>This is a reminder that your court date for your ${caseType} case is scheduled for ${new Date(courtDate).toDateString()}.</p>
//     <p>Please ensure you are prepared.</p>
//     <p>Best regards,<br>Your Legal Team</p>
//   `;

//   const result = await sendEmail(email, subject, html);
//   if (result.success) {
//     console.log(`Reminder email sent to ${clientName} at ${email}`);
//   } else {
//     console.error(`Failed to send email to ${clientName} at ${email}`);
//   }
// };

// // Cron job function
// const startCourtReminderCron = () => {
//   // Schedule cron job to run daily at 11:30 AM in server's local timezone
//   const job = cron.schedule('30 11 * * *', async () => {
//     try {

//       // Get date for tomorrow
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(0, 0, 0, 0);
//       const tomorrowEnd = new Date(tomorrow);
//       tomorrowEnd.setHours(23, 59, 59, 999);

//       // Query cases with court date tomorrow and In_Progress status
//       const cases = await mongoose.model('CaseCollection').find({
//         case_status: 'In_Progress',
//         isDeleted: false,
//         coatDate: {
//           $gte: tomorrow.toISOString().split('T')[0],
//           $lte: tomorrowEnd.toISOString().split('T')[0]
//         }
//       }).lean();

//       // Send emails for each case
//       for (const caseItem of cases) {
//         const user = await UserModel.findOne({ _id: caseItem.user_id, isDeleted: false }).lean();
//         if (user && user.email) {
//           await sendReminderEmail(caseItem.clientName, user.email, caseItem.coatDate, caseItem.caseType);
//         } else {
//           console.log(`No valid email found for client ${caseItem.clientName} with user_id ${caseItem.user_id}`);
//         }
//       }

//       console.log('Cron job completed successfully');
//     } catch (error) {
//       console.error('Error in cron job:', error);
//     } finally {
//       await mongoose.connection.close();
//     }
//   });

//   console.log('Cron job scheduler started');
//   return job; // Return the cron job instance
// };

// export default startCourtReminderCron;




import cron from 'node-cron';
import mongoose from 'mongoose';
import { UserModel } from '../modules/user/user.model';
import { sendEmail } from './sendEmail';
import { CaseOverviewModel } from '../modules/case/case.model';


// Function to send reminder email
const sendReminderEmail = async (clientName: string, email: string, courtDate: string, caseType: string) => {
  const subject = 'Court Date Reminder';
  const html = `
    <h2>Court Date Reminder</h2>
    <p>Dear ${clientName},</p>
    <p>This is a reminder that your court date for your ${caseType} case is scheduled for ${new Date(courtDate).toDateString()}.</p>
    <p>Please ensure you are prepared.</p>
    <p>Best regards,<br>Your Legal Team</p>
  `;

  const result = await sendEmail(email, subject, html);
  if (result.success) {
    console.log(`Reminder email sent to ${clientName} at ${email}`);
  } else {
    console.error(`Failed to send email to ${clientName} at ${email}`);
  }
};

// Cron job function
const startCourtReminderCron = () => {
  // Schedule cron job to run every 1 minute in server's local timezone
  const job = cron.schedule('30 11 * * *', async () => {
    try {

      // Get date for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Query cases with court date tomorrow and In_Progress status
      // Query cases with court date tomorrow and In_Progress status
      const cases = await CaseOverviewModel.find({
        case_status: 'In_Progress',
        isDeleted: false,
        coatDate: {
          $gte: tomorrow.toISOString().split('T')[0],
          $lte: tomorrowEnd.toISOString().split('T')[0]
        }
      }).lean();

      // Send emails for each case
      for (const caseItem of cases) {
        const user = await UserModel.findOne({ _id: caseItem.client_user_id, isDeleted: false }).lean();
        console.log("found user========>>>>>>",user)
        if (user && user.email && caseItem.coatDate && caseItem.isMailSent === false) {
          await sendReminderEmail(caseItem.clientName, user.email, caseItem.coatDate, caseItem.caseType);
          await CaseOverviewModel.findOneAndUpdate({
            client_user_id: caseItem.client_user_id,
            _id: caseItem._id
            
          },{
            isMailSent:true
          },{
            new: true
          })
        } else {
          console.log(`No valid email found for client ${caseItem.clientName} with user_id ${caseItem.user_id}`);
        }
      }

      console.log('Cron job completed successfully');
    } catch (error) {
      console.error('Error in cron job:', error);
    } 
  });

  console.log('Cron job scheduler started');
  return job; // Return the cron job instance
};

export default startCourtReminderCron;