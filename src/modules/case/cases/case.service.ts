import mongoose, { Types } from "mongoose";
import { uploadPdfToCloudinary } from "../../../util/uploadImgToCludinary";
import { AssetListModel, TimelineListModel, CaseOverviewModel } from "../case.model";
import { ProfileModel } from "../../user/user.model";
import { CaseByIdQuery } from "../case.interface";

interface ManageCasePayload {
  userId: string; // Admin or user ID (from req.user.id)
  client_user_id?: string; // Client ID (from payload for admins, req.user.id for users)
  clientName?: string;
  caseTitle?: string;
  caseType?: string;
  caseStatus?: string;
  coatDate?: string;
  note?: string;
  caseOverviewId?: string;
  assetListData?: Array<{
    assetUrl: string;
    assetName: string;
    uploadDate: string;
  }>;
  timelineData?: {
    title: string;
    description: string;
    date?: string;
    assetUrl?: string;
  };
}

export interface UpdateCasePayload {
  userId: string; // Admin ID (from req.user.id)
  caseOverviewId: string;
  client_user_id?: string;
  clientName?: string;
  caseTitle?: string;
  caseType?: string;
  caseStatus?: string;
  coatDate?: string;
  note?: string;
}

export interface DeleteCasePayload {
  userId: string; // Admin ID (from req.user.id)
  caseOverviewId: string;
}

interface CaseOverviewQuery {
  userId?: Types.ObjectId;
  page?: number;
  limit?: number;
  caseStatus?: "Letter_sent_to_insurance" | "In_Progress" | "Closed" | "Pending";
}

/**
 * Create or Update Timeline List
 */
const createOrUpdateTimelineList = async ({
  client_user_id,
  caseTitle,
  caseOverviewId,
  timelineId = null,
  action = "case_started",
  additionalData = {},
  session,
}: {
  client_user_id: string;
  caseTitle: string;
  caseOverviewId: Types.ObjectId;
  timelineId?: Types.ObjectId | null;
  action?: "case_started" | "asset_updated" | "case_overview_updated" | "timeline_created";
  additionalData?: any;
  session: mongoose.ClientSession;
}): Promise<Types.ObjectId> => {
  try {
    let timelineEntry;
    switch (action) {
      case "case_started":
        timelineEntry = {
          assetUrl: [],
          title: "Case Started",
          description: `Case "${caseTitle}" began today.`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "asset_updated":
        timelineEntry = {
          assetUrl: additionalData.assetUrls || [],
          title: "Assets Updated",
          description: `${additionalData.assetCount || "New"} asset(s) added to the case "${caseTitle}".`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "case_overview_updated":
        timelineEntry = {
          assetUrl: [],
          title: "Case Updated",
          description: `Case "${caseTitle}" details updated. ${additionalData.changes ? "Changes: " + additionalData.changes : ""}`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "timeline_created":
        timelineEntry = {
          assetUrl: additionalData.assetUrl ? [additionalData.assetUrl] : [],
          title: additionalData.title || "Timeline Entry Added",
          description: additionalData.description || `New timeline entry created for "${caseTitle}".`,
          date: additionalData.date || new Date().toISOString(),
          isDeleted: false,
        };
        break;
      default:
        timelineEntry = {
          assetUrl: [],
          title: "Case Activity",
          description: `Activity recorded for "${caseTitle}".`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
    }

    if (!timelineId) {
      const timelineData = {
        caseOverview_id: caseOverviewId,
        client_user_id: new Types.ObjectId(client_user_id),
        caseTitle,
        timeLine: [timelineEntry],
      };
      const timeline = await TimelineListModel.create([timelineData], { session });
      return timeline[0]._id;
    } else {
      await TimelineListModel.updateOne(
        { _id: timelineId },
        { $push: { timeLine: timelineEntry } },
        { session }
      );
      return timelineId;
    }
  } catch (error: any) {
    throw new Error(`Timeline operation failed: ${error.message}`);
  }
};

/**
 * Create or Update Asset List
 */
const createOrUpdateAssetList = async ({
  client_user_id,
  caseOverviewId,
  assetListData,
  files,
  assetListId = null,
  session,
}: {
  client_user_id: string;
  caseOverviewId: Types.ObjectId;
  assetListData: Array<{
    assetUrl: string;
    assetName: string;
    uploadDate: string;
  }>;
  files: any[];
  assetListId?: Types.ObjectId | null;
  session: mongoose.ClientSession;
}): Promise<{ assetListId: Types.ObjectId; uploadedAssetUrls: string[] }> => {
  try {
    if (!files || files.length === 0 || !assetListData || assetListData.length === 0) {
      throw new Error("Files and assetListData are required");
    }
    if (files.length !== assetListData.length) {
      throw new Error(`Mismatch between files (${files.length}) and assetListData (${assetListData.length})`);
    }

    const uploadedAssets = await Promise.all(
      assetListData.map(async (asset, index) => {
        const file = files[index];
        if (!file || !file.path) {
          throw new Error(`Invalid file at index ${index}`);
        }
        const uploadResult = await uploadPdfToCloudinary(asset.assetName, file.path);
        return {
          assetUrl: uploadResult.secure_url,
          assetName: asset.assetName,
          uploadDate: asset.uploadDate || new Date().toISOString(),
        };
      })
    );

    const uploadedAssetUrls = uploadedAssets.map((asset) => asset.assetUrl);

    if (!assetListId) {
      const assetListPayload = {
        client_user_id: new Types.ObjectId(client_user_id),
        caseOverview_id: caseOverviewId,
        assets: uploadedAssets,
      };
      const assetList = await AssetListModel.create([assetListPayload], { session });
      return { assetListId: assetList[0]._id, uploadedAssetUrls };
    } else {
      await AssetListModel.updateOne(
        { _id: assetListId },
        { $push: { assets: { $each: uploadedAssets } } },
        { session }
      );
      return { assetListId, uploadedAssetUrls };
    }
  } catch (error: any) {
    throw new Error(`Asset list operation failed: ${error.message}`);
  }
};

/**
 * Main Manage Case Function
 */
// const manageCase = async (
//   payload: ManageCasePayload,
//   files?: any[],
//   userRole?: string
// ): Promise<{
//   caseOverviewId: Types.ObjectId;
//   assetListId?: Types.ObjectId;
//   timelineId?: Types.ObjectId;
// }> => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     let caseOverviewId: Types.ObjectId;
//     let assetListId: Types.ObjectId | null = null;
//     let timelineId: Types.ObjectId | null = null;

//     // Validate inputs
//     if (!payload.userId || !Types.ObjectId.isValid(payload.userId)) {
//       throw new Error("Valid userId is required");
//     }

//     // Create new case
// if (!payload.client_user_id || !payload.clientName || !payload.caseTitle || !payload.caseType || !payload.caseStatus) {
//   throw new Error("client_user_id, clientName, caseTitle, caseType, and caseStatus are required for new case");
// }
// if (!Types.ObjectId.isValid(payload.client_user_id)) {
//   throw new Error("Invalid client_user_id");
// }

// // CHANGED: Verify client profile exists using user_id
// const clientProfile = await ProfileModel.findOne({
//   user_id: new Types.ObjectId(payload.client_user_id),
//   isDeleted: false,
// }).session(session);
// if (!clientProfile) {
//   throw new Error(`No profile found for client_user_id: ${payload.client_user_id}`);
// }

//     // Determine caseOverviewId and client_user_id based on role
//     if (userRole === "user") {
//       // Users can only add assets using clientName or caseOverviewId
//       if (payload.client_user_id || payload.caseTitle || payload.caseType || payload.caseStatus || payload.coatDate || payload.note || payload.timelineData) {
//         throw new Error("Users can only add assets");
//       }
//       if (!payload.clientName && !payload.caseOverviewId) {
//         throw new Error("clientName or caseOverviewId is required for users");
//       }
//       if (!payload.assetListData || payload.assetListData.length === 0 || !files || files.length === 0) {
//         throw new Error("assetListData and files are required for users");
//       }
//       if (files.length !== payload.assetListData.length) {
//         throw new Error(`Mismatch between files (${files.length}) and assetListData (${payload.assetListData.length})`);
//       }

//       let caseOverview;
//       if (payload.caseOverviewId) {
//         // Use caseOverviewId if provided
//         if (!Types.ObjectId.isValid(payload.caseOverviewId)) {
//           throw new Error("Invalid caseOverviewId");
//         }
//         caseOverview = await CaseOverviewModel.findOne({
//           _id: new Types.ObjectId(payload.caseOverviewId),
//           client_user_id: new Types.ObjectId(payload.userId),
//           isDeleted: false,
//         }).session(session);
//         if (!caseOverview) {
//           throw new Error(`No case found for caseOverviewId: ${payload.caseOverviewId}`);
//         }
//       } else {
//         // Use clientName and client_user_id
//         const cases = await CaseOverviewModel.find({
//           clientName: payload.clientName,
//           client_user_id: new Types.ObjectId(payload.userId),
//           isDeleted: false,
//         }).session(session);
//         if (cases.length === 0) {
//           throw new Error(`No case found for clientName: ${payload.clientName}`);
//         }
//         if (cases.length > 1) {
//           throw new Error(`Multiple cases found for clientName: ${payload.clientName}. Please provide caseOverviewId to specify the case.`);
//         }
//         caseOverview = cases[0];
//       }

//       caseOverviewId = caseOverview._id;
//       timelineId = caseOverview.timeLine_id || null;
//       assetListId = caseOverview.assetList_id || null;
//     } else if (userRole === "admin") {
//       // Admins can perform all operations
//       if (!payload.caseOverviewId) {
//         // Create new case
//         if (!payload.client_user_id || !payload.clientName || !payload.caseTitle || !payload.caseType || !payload.caseStatus) {
//           throw new Error("client_user_id, clientName, caseTitle, caseType, and caseStatus are required for new case");
//         }
//         if (!Types.ObjectId.isValid(payload.client_user_id)) {
//           throw new Error("Invalid client_user_id");
//         }
//         const caseOverviewData = {
//           user_id: new Types.ObjectId(payload.userId), // Admin ID
//           client_user_id: new Types.ObjectId(payload.client_user_id), // Client ID
//           clientName: payload.clientName,
//           caseTitle: payload.caseTitle,
//           caseType: payload.caseType,
//           case_status: payload.caseStatus,
//           coatDate: payload.coatDate,
//           note: payload.note,
//           isDeleted: false,
//         };

//         const caseOverview = await CaseOverviewModel.create([caseOverviewData], { session });
//         caseOverviewId = caseOverview[0]._id;

//         // Create initial timeline
//         timelineId = await createOrUpdateTimelineList({
//           client_user_id: payload.client_user_id,
//           caseTitle: payload.caseTitle,
//           caseOverviewId,
//           action: "case_started",
//           session,
//         });

//         // Update CaseOverview with timelineId
//         await CaseOverviewModel.updateOne(
//           { _id: caseOverviewId },
//           { $set: { timeLine_id: timelineId } },
//           { session }
//         );

//         // Update user's case_ids (client_user_id)
//         await ProfileModel.updateOne(
//           { _id: new Types.ObjectId(payload.client_user_id) },
//           { $addToSet: { case_ids: caseOverviewId } },
//           { session }
//         );
//       } else {
//         // Update existing case
//         if (!Types.ObjectId.isValid(payload.caseOverviewId)) {
//           throw new Error("Invalid caseOverviewId");
//         }
//         caseOverviewId = new Types.ObjectId(payload.caseOverviewId);
//         const caseOverview = await CaseOverviewModel.findById(caseOverviewId).session(session);
//         if (!caseOverview) {
//           throw new Error("Case not found");
//         }
//         timelineId = caseOverview.timeLine_id || null;
//         assetListId = caseOverview.assetList_id || null;

//         // Update case overview data if provided
//         const updateData: any = {};
//         if (payload.clientName) updateData.clientName = payload.clientName;
//         if (payload.caseTitle) updateData.caseTitle = payload.caseTitle;
//         if (payload.caseType) updateData.caseType = payload.caseType;
//         if (payload.caseStatus) updateData.case_status = payload.caseStatus;
//         if (payload.coatDate) updateData.coatDate = payload.coatDate;
//         if (payload.note) updateData.note = payload.note;
//         if (payload.client_user_id) {
//           if (!Types.ObjectId.isValid(payload.client_user_id)) {
//             throw new Error("Invalid client_user_id");
//           }
//           updateData.client_user_id = new Types.ObjectId(payload.client_user_id);
//         }

//         if (Object.keys(updateData).length > 0) {
//           await CaseOverviewModel.updateOne({ _id: caseOverviewId }, { $set: updateData }, { session });
//           const changes = Object.keys(updateData)
//             .map((key) => `${key}: ${updateData[key]}`)
//             .join(", ");
//           timelineId = await createOrUpdateTimelineList({
//             client_user_id: caseOverview.client_user_id.toString(),
//             caseTitle: caseOverview.caseTitle,
//             caseOverviewId,
//             timelineId,
//             action: "case_overview_updated",
//             additionalData: { changes },
//             session,
//           });
//           if (!caseOverview.timeLine_id) {
//             await CaseOverviewModel.updateOne(
//               { _id: caseOverviewId },
//               { $set: { timeLine_id: timelineId } },
//               { session }
//             );
//           }
//         }
//       }
//     } else {
//       throw new Error("Invalid user role");
//     }

//     // Handle assets if provided (both admin and user)
//     if (payload.assetListData && files && payload.assetListData.length > 0) {
//       const client_user_id = userRole === "user" ? payload.userId : payload.client_user_id || (await CaseOverviewModel.findById(caseOverviewId).session(session))?.client_user_id.toString();
//       if (!client_user_id || !Types.ObjectId.isValid(client_user_id)) {
//         throw new Error("Valid client_user_id is required for asset addition");
//       }
//       const { assetListId: newAssetListId, uploadedAssetUrls } = await createOrUpdateAssetList({
//         client_user_id,
//         caseOverviewId,
//         assetListData: payload.assetListData,
//         files,
//         assetListId,
//         session,
//       });
//       assetListId = newAssetListId;

//       // Update CaseOverview with assetListId if not already set
//       const caseOverview = await CaseOverviewModel.findById(caseOverviewId).session(session);
//       if (!caseOverview?.assetList_id) {
//         await CaseOverviewModel.updateOne(
//           { _id: caseOverviewId },
//           { $set: { assetList_id: assetListId } },
//           { session }
//         );
//       }

//       // Automatically add timeline entry for asset update
//       const caseTitle = payload.caseTitle || caseOverview?.caseTitle || "Unknown";
//       timelineId = await createOrUpdateTimelineList({
//         client_user_id,
//         caseTitle,
//         caseOverviewId,
//         timelineId,
//         action: "asset_updated",
//         additionalData: {
//           assetCount: payload.assetListData.length,
//           assetUrls: uploadedAssetUrls,
//         },
//         session,
//       });

//       // Ensure timelineId is set in CaseOverview
//       if (!caseOverview?.timeLine_id) {
//         await CaseOverviewModel.updateOne(
//           { _id: caseOverviewId },
//           { $set: { timeLine_id: timelineId } },
//           { session }
//         );
//       }
//     }

//     // Handle timeline entry if provided (admin only)
//     if (payload.timelineData && userRole === "admin") {
//       if (!payload.timelineData.title || !payload.timelineData.description) {
//         throw new Error("Timeline entry must include title and description");
//       }
//       const caseOverview = await CaseOverviewModel.findById(caseOverviewId).session(session);
//       const caseTitle = payload.caseTitle || caseOverview?.caseTitle || "Unknown";
//       const client_user_id = caseOverview?.client_user_id.toString();
//       if (!client_user_id || !Types.ObjectId.isValid(client_user_id)) {
//         throw new Error("Valid client_user_id is required for timeline creation");
//       }
//       if (!timelineId) {
//         timelineId = await createOrUpdateTimelineList({
//           client_user_id,
//           caseTitle,
//           caseOverviewId,
//           action: "case_started",
//           session,
//         });
//         await CaseOverviewModel.updateOne(
//           { _id: caseOverviewId },
//           { $set: { timeLine_id: timelineId } },
//           { session }
//         );
//       }
//       await createOrUpdateTimelineList({
//         client_user_id,
//         caseTitle,
//         caseOverviewId,
//         timelineId,
//         action: "timeline_created",
//         additionalData: payload.timelineData,
//         session,
//       });
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return { caseOverviewId };
//   } catch (error: any) {
//     await session.abortTransaction();
//     session.endSession();
//     throw new Error(`Case operation failed: ${error.message}`);
//   }
// };

const manageCase = async (
  payload: ManageCasePayload,
  files?: any[],
  userRole?: string
): Promise<{
  caseOverviewId: Types.ObjectId;
  assetListId?: Types.ObjectId;
  timelineId?: Types.ObjectId;
  caseDetails: any;
}> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let caseOverviewId: Types.ObjectId;
    let assetListId: Types.ObjectId | null = null;
    let timelineId: Types.ObjectId | null = null;

    // Validate inputs
    if (!payload.userId || !Types.ObjectId.isValid(payload.userId)) {
      throw new Error("Valid userId is required");
    }

    // Determine caseOverviewId and client_user_id based on role
    if (userRole === "user") {
      // Users can only add assets using clientName or caseOverviewId
      if (payload.client_user_id || payload.caseTitle || payload.caseType || payload.caseStatus || payload.coatDate || payload.note || payload.timelineData) {
        throw new Error("Users can only add assets");
      }
      if (!payload.clientName && !payload.caseOverviewId) {
        throw new Error("clientName or caseOverviewId is required for users");
      }
      if (!payload.assetListData || payload.assetListData.length === 0 || !files || files.length === 0) {
        throw new Error("assetListData and files are required for users");
      }
      if (files.length !== payload.assetListData.length) {
        throw new Error(`Mismatch between files (${files.length}) and assetListData (${payload.assetListData.length})`);
      }

      let caseOverview;
      if (payload.caseOverviewId) {
        // Use caseOverviewId if provided
        if (!Types.ObjectId.isValid(payload.caseOverviewId)) {
          throw new Error("Invalid caseOverviewId");
        }
        caseOverview = await CaseOverviewModel.findOne({
          _id: new Types.ObjectId(payload.caseOverviewId),
          client_user_id: new Types.ObjectId(payload.userId),
          isDeleted: false,
        }).session(session);
        if (!caseOverview) {
          throw new Error(`No case found for caseOverviewId: ${payload.caseOverviewId}`);
        }
      } else {
        // Use clientName and client_user_id
        const cases = await CaseOverviewModel.find({
          clientName: payload.clientName,
          client_user_id: new Types.ObjectId(payload.userId),
          isDeleted: false,
        }).session(session);
        if (cases.length === 0) {
          throw new Error(`No case found for clientName: ${payload.clientName}`);
        }
        if (cases.length > 1) {
          throw new Error(`Multiple cases found for clientName: ${payload.clientName}. Please provide caseOverviewId to specify the case.`);
        }
        caseOverview = cases[0];
      }

      caseOverviewId = caseOverview._id;
      timelineId = caseOverview.timeLine_id || null;
      assetListId = caseOverview.assetList_id || null;
    } else if (userRole === "admin") {
      // Admins can perform all operations
      if (!payload.caseOverviewId) {
        // Create new case
        if (!payload.client_user_id || !payload.clientName || !payload.caseTitle || !payload.caseType || !payload.caseStatus) {
          throw new Error("client_user_id, clientName, caseTitle, caseType, and caseStatus are required for new case");
        }
        if (!Types.ObjectId.isValid(payload.client_user_id)) {
          throw new Error("Invalid client_user_id");
        }

        // CHANGED: Verify client profile exists using user_id
        const clientProfile = await ProfileModel.findOne({
          user_id: new Types.ObjectId(payload.client_user_id),
          isDeleted: false,
        }).session(session);
        if (!clientProfile) {
          throw new Error(`No profile found for client_user_id: ${payload.client_user_id}`);
        }

        const caseOverviewData = {
          user_id: new Types.ObjectId(payload.userId), // Admin ID
          client_user_id: new Types.ObjectId(payload.client_user_id), // Client ID
          clientName: payload.clientName,
          caseTitle: payload.caseTitle,
          caseType: payload.caseType,
          case_status: payload.caseStatus,
          coatDate: payload.coatDate,
          note: payload.note,
          isDeleted: false,
        };

        const caseOverview = await CaseOverviewModel.create([caseOverviewData], { session });
        caseOverviewId = caseOverview[0]._id;

        // Create initial timeline
        timelineId = await createOrUpdateTimelineList({
          client_user_id: payload.client_user_id,
          caseTitle: payload.caseTitle,
          caseOverviewId,
          action: "case_started",
          session,
        });

        // Update CaseOverview with timelineId
        await CaseOverviewModel.updateOne(
          { _id: caseOverviewId },
          { $set: { timeLine_id: timelineId } },
          { session }
        );

        // CHANGED: Update client's case_ids array using user_id
        await ProfileModel.updateOne(
          { user_id: new Types.ObjectId(payload.client_user_id), isDeleted: false },
          { $addToSet: { case_ids: caseOverviewId } }, // Use $addToSet to prevent duplicates
          { session }
        );
      } else {
        // Update existing case
        if (!Types.ObjectId.isValid(payload.caseOverviewId)) {
          throw new Error("Invalid caseOverviewId");
        }
        caseOverviewId = new Types.ObjectId(payload.caseOverviewId);
        const caseOverview = await CaseOverviewModel.findById(caseOverviewId).session(session);
        if (!caseOverview) {
          throw new Error("Case not found");
        }
        timelineId = caseOverview.timeLine_id || null;
        assetListId = caseOverview.assetList_id || null;

        // Update case overview data if provided
        const updateData: any = {};
        if (payload.clientName) updateData.clientName = payload.clientName;
        if (payload.caseTitle) updateData.caseTitle = payload.caseTitle;
        if (payload.caseType) updateData.caseType = payload.caseType;
        if (payload.caseStatus) updateData.case_status = payload.caseStatus;
        if (payload.coatDate) updateData.coatDate = payload.coatDate;
        if (payload.note) updateData.note = payload.note;
        if (payload.client_user_id) {
          if (!Types.ObjectId.isValid(payload.client_user_id)) {
            throw new Error("Invalid client_user_id");
          }
          updateData.client_user_id = new Types.ObjectId(payload.client_user_id);
        }

        if (Object.keys(updateData).length > 0) {
          await CaseOverviewModel.updateOne({ _id: caseOverviewId }, { $set: updateData }, { session });
          const changes = Object.keys(updateData)
            .map((key) => `${key}: ${updateData[key]}`)
            .join(", ");
          timelineId = await createOrUpdateTimelineList({
            client_user_id: caseOverview.client_user_id.toString(),
            caseTitle: caseOverview.caseTitle,
            caseOverviewId,
            timelineId,
            action: "case_overview_updated",
            additionalData: { changes },
            session,
          });
          if (!caseOverview.timeLine_id) {
            await CaseOverviewModel.updateOne(
              { _id: caseOverviewId },
              { $set: { timeLine_id: timelineId } },
              { session }
            );
          }
        }
      }
    } else {
      throw new Error("Invalid user role");
    }

    // Handle assets if provided (both admin and user)
    if (payload.assetListData && files && payload.assetListData.length > 0) {
      const client_user_id = userRole === "user" ? payload.userId : payload.client_user_id || (await CaseOverviewModel.findById(caseOverviewId).session(session))?.client_user_id.toString();
      if (!client_user_id || !Types.ObjectId.isValid(client_user_id)) {
        throw new Error("Valid client_user_id is required for asset addition");
      }
      const { assetListId: newAssetListId, uploadedAssetUrls } = await createOrUpdateAssetList({
        client_user_id,
        caseOverviewId,
        assetListData: payload.assetListData,
        files,
        assetListId,
        session,
      });
      assetListId = newAssetListId;

      // Update CaseOverview with assetListId if not already set
      const caseOverview = await CaseOverviewModel.findById(caseOverviewId).session(session);
      if (!caseOverview?.assetList_id) {
        await CaseOverviewModel.updateOne(
          { _id: caseOverviewId },
          { $set: { assetList_id: assetListId } },
          { session }
        );
      }

      // Automatically add timeline entry for asset update
      const caseTitle = payload.caseTitle || caseOverview?.caseTitle || "Unknown";
      timelineId = await createOrUpdateTimelineList({
        client_user_id,
        caseTitle,
        caseOverviewId,
        timelineId,
        action: "asset_updated",
        additionalData: {
          assetCount: payload.assetListData.length,
          assetUrls: uploadedAssetUrls,
        },
        session,
      });

      // Ensure timelineId is set in CaseOverview
      if (!caseOverview?.timeLine_id) {
        await CaseOverviewModel.updateOne(
          { _id: caseOverviewId },
          { $set: { timeLine_id: timelineId } },
          { session }
        );
      }
    }

    // Handle timeline entry if provided (admin only)
    if (payload.timelineData && userRole === "admin") {
      if (!payload.timelineData.title || !payload.timelineData.description) {
        throw new Error("Timeline entry must include title and description");
      }
      const caseOverview = await CaseOverviewModel.findById(caseOverviewId).session(session);
      const caseTitle = payload.caseTitle || caseOverview?.caseTitle || "Unknown";
      const client_user_id = caseOverview?.client_user_id.toString();
      if (!client_user_id || !Types.ObjectId.isValid(client_user_id)) {
        throw new Error("Valid client_user_id is required for timeline creation");
      }
      if (!timelineId) {
        timelineId = await createOrUpdateTimelineList({
          client_user_id,
          caseTitle,
          caseOverviewId,
          action: "case_started",
          session,
        });
        await CaseOverviewModel.updateOne(
          { _id: caseOverviewId },
          { $set: { timeLine_id: timelineId } },
          { session }
        );
      }
      await createOrUpdateTimelineList({
        client_user_id,
        caseTitle,
        caseOverviewId,
        timelineId,
        action: "timeline_created",
        additionalData: payload.timelineData,
        session,
      });
    }

    // CHANGED: Fetch full case details with populated fields
    const caseDetails = await CaseOverviewModel.findOne({
      _id: caseOverviewId,
      isDeleted: false,
    })
      .populate({
        path: "assetList_id",
        select: "assets",
      })
      .populate({
        path: "timeLine_id",
        select: "timeLine",
      })
      .lean()
      .session(session)
      .exec();

    if (!caseDetails) {
      throw new Error("Case not found after operation");
    }

    await session.commitTransaction();
    session.endSession();

    return { caseOverviewId, caseDetails };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(`Case operation failed: ${error.message}`);
  }
}

/**
 * Update Case Function
 */
const updateCase = async (payload: UpdateCasePayload): Promise<{
  caseOverviewId: Types.ObjectId;
  timelineId?: Types.ObjectId;
  caseDetails?: any;
}> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { caseOverviewId, userId, ...updateData } = payload;

    if (!Types.ObjectId.isValid(caseOverviewId)) {
      throw new Error("Invalid caseOverviewId");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const caseOverview = await CaseOverviewModel.findOne({
      _id: new Types.ObjectId(caseOverviewId),
      isDeleted: false,
    }).session(session);
    if (!caseOverview) {
      throw new Error("Case not found");
    }

    // Prepare update data
    const updateFields: any = {};
    if (updateData.clientName) updateFields.clientName = updateData.clientName;
    if (updateData.caseTitle) updateFields.caseTitle = updateData.caseTitle;
    if (updateData.caseType) updateFields.caseType = updateData.caseType;
    if (updateData.caseStatus) updateFields.case_status = updateData.caseStatus;
    if (updateData.coatDate) updateFields.coatDate = updateData.coatDate;
    if (updateData.note) updateFields.note = updateData.note;
    if (updateData.client_user_id) {
      if (!Types.ObjectId.isValid(updateData.client_user_id)) {
        throw new Error("Invalid client_user_id");
      }
      updateFields.client_user_id = new Types.ObjectId(updateData.client_user_id);
    }

    if (Object.keys(updateFields).length === 0) {
      throw new Error("No valid fields provided for update");
    }

    // Update case overview
    await CaseOverviewModel.updateOne(
      { _id: new Types.ObjectId(caseOverviewId) },
      { $set: updateFields },
      { session }
    );

    // Update ProfileModel if client_user_id changes
    if (updateData.client_user_id && updateData.client_user_id !== caseOverview.client_user_id.toString()) {
      // Remove case from old client's case_ids
      await ProfileModel.updateOne(
        { _id: caseOverview.client_user_id },
        { $pull: { case_ids: new Types.ObjectId(caseOverviewId) } },
        { session }
      );
      // Add case to new client's case_ids
      await ProfileModel.updateOne(
        { _id: new Types.ObjectId(updateData.client_user_id) },
        { $addToSet: { case_ids: new Types.ObjectId(caseOverviewId) } },
        { session }
      );
    }

    // Add timeline entry for update
    const changes = Object.keys(updateFields)
      .map((key) => `${key}: ${updateFields[key]}`)
      .join(", ");
    const timelineId = await createOrUpdateTimelineList({
      client_user_id: updateFields.client_user_id?.toString() || caseOverview.client_user_id.toString(),
      caseTitle: updateFields.caseTitle || caseOverview.caseTitle,
      caseOverviewId: new Types.ObjectId(caseOverviewId),
      timelineId: caseOverview.timeLine_id || null,
      action: "case_overview_updated",
      additionalData: { changes },
      session,
    });

    // Update CaseOverview with timelineId if not set
    if (!caseOverview.timeLine_id) {
      await CaseOverviewModel.updateOne(
        { _id: new Types.ObjectId(caseOverviewId) },
        { $set: { timeLine_id: timelineId } },
        { session }
      );
    }

    // CHANGED: Fetch full case details with populated fields
    const caseDetails = await CaseOverviewModel.findOne({
      _id: new Types.ObjectId(caseOverviewId),
      isDeleted: false,
    })
      .populate({
        path: "assetList_id",
        select: "assets",
      })
      .populate({
        path: "timeLine_id",
        select: "timeLine",
      })
      .lean()
      .session(session)
      .exec();

    if (!caseDetails) {
      throw new Error("Case not found after update");
    }


    await session.commitTransaction();
    session.endSession();

    return { caseOverviewId: new Types.ObjectId(caseOverviewId), timelineId, caseDetails };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(`Case update failed: ${error.message}`);
  }
};

/**
 * Delete Case Function (Soft Delete)
 */
const deleteCase = async (payload: DeleteCasePayload): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { caseOverviewId, userId } = payload;

    if (!Types.ObjectId.isValid(caseOverviewId)) {
      throw new Error("Invalid caseOverviewId");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const caseOverview = await CaseOverviewModel.findOne({
      _id: new Types.ObjectId(caseOverviewId),
      isDeleted: false,
    }).session(session);
    if (!caseOverview) {
      throw new Error("Case not found");
    }

    // Soft delete CaseOverview
    await CaseOverviewModel.updateOne(
      { _id: new Types.ObjectId(caseOverviewId) },
      { $set: { isDeleted: true } },
      { session }
    );

    // Soft delete associated AssetList
    if (caseOverview.assetList_id) {
      await AssetListModel.updateOne(
        { _id: caseOverview.assetList_id },
        { $set: { isDeleted: true } },
        { session }
      );
    }

    // Soft delete associated TimelineList
    if (caseOverview.timeLine_id) {
      await TimelineListModel.updateOne(
        { _id: caseOverview.timeLine_id },
        { $set: { isDeleted: true } },
        { session }
      );
    }

    // Remove case from client's case_ids
    await ProfileModel.updateOne(
      { _id: caseOverview.client_user_id },
      { $pull: { case_ids: new Types.ObjectId(caseOverviewId) } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(`Case deletion failed: ${error.message}`);
  }
};

/**
 * Find all case overviews with optional filtering by user_id
 */
const findCaseOverviews = async ({
  userId,
  page = 1,
  limit = 10,
}: CaseOverviewQuery): Promise<{
  caseOverviews: any[];
  total: number;
  page: number;
  limit: number;
}> => {
  const query: any = { isDeleted: false };
  if (userId) {
    query.user_id = new Types.ObjectId(userId);
  }
  const skip = (page - 1) * limit;
  const [caseOverviews, total] = await Promise.all([
    CaseOverviewModel.find(query).skip(skip).limit(limit).lean().exec(),
    CaseOverviewModel.countDocuments(query).exec(),
  ]);
  return { caseOverviews, total, page, limit };
};

const findCaseById = async ({
  caseOverviewId,
  userId,
}: CaseByIdQuery): Promise<{
  caseOverview: any;
}> => {
  const query: any = {
    _id: new Types.ObjectId(caseOverviewId),
    user_id: new Types.ObjectId(userId),
    isDeleted: false,
  };

  const caseOverview = await CaseOverviewModel.findOne(query)
    .populate({
      path: "assetList_id",
      select: "assets", // Corrected to match schema field
    })
    .populate({
      path: "timeLine_id",
      select: "timeLine", // Include caseTitle if needed
    })
    .lean()
    .exec();

  if (!caseOverview) {
    throw new Error("Case not found");
  }

  return { caseOverview };
};

const findAllCasesWithDetails = async ({
  userId,
  page = 1,
  limit = 10,
  caseStatus,
}: CaseOverviewQuery): Promise<{
  cases: any[];
  total: number;
  page: number;
  limit: number;
}> => {
  const query: any = { isDeleted: false, user_id: new Types.ObjectId(userId) };

  // Add case-insensitive case_status filter if caseStatus is provided
  if (caseStatus) {
    query.case_status = { $regex: `^${caseStatus}$`, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [cases, total] = await Promise.all([
    CaseOverviewModel.find(query)
      .populate({
        path: "assetList_id",
        select: "assets",
      })
      .populate({
        path: "timeLine_id",
        select: "timeLine",
      })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    CaseOverviewModel.countDocuments(query).exec(),
  ]);

  // Ensure populated fields are not null
  const formattedCases = cases.map(caseOverview => ({
    ...caseOverview,
    assetList_id: caseOverview.assetList_id || { assets: [] },
    timeLine_id: caseOverview.timeLine_id || { timeLine: [], caseTitle: caseOverview.caseTitle },
  }));

  return { cases: formattedCases, total, page, limit };

  // return { cases, total, page, limit };
};

const caseService = {
  manageCase,
  updateCase,
  deleteCase,
  findCaseOverviews,
  findCaseById,
  findAllCasesWithDetails
};

export default caseService;