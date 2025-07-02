import mongoose, { Types } from "mongoose";
import { uploadPdfToCloudinary } from "../../util/uploadImgToCludinary";
import { AssetListModel, CaseOverviewModel, TimelineListModel } from "./case.model";
import { ProfileModel } from "../user/user.model";

/**
 * Create or Update Timeline List (Automatically generated based on actions)
 */
const createOrUpdateTimelineList = async ({
  userId,
  clientName,
  caseOverviewId = null,
  timelineId = null,
  action = "case_started",
  additionalData = {},
  session: providedSession,
}: {
  userId: string;
  clientName: string;
  caseOverviewId?: Types.ObjectId | null;
  timelineId?: Types.ObjectId | null;
  action?: "case_started" | "asset_updated" | "case_overview_updated" | "timeline_created";
  additionalData?: any;
  session?: mongoose.ClientSession;
}): Promise<Types.ObjectId> => {
  // Start a new session if none is provided
  const session = providedSession || (await mongoose.startSession());
  if (!providedSession) session.startTransaction();

  try {
    // Generate timeline entry based on action
    let timelineEntry;

    switch (action) {
      case "case_started":
        timelineEntry = {
          assetUrl: [], // Initialize as empty array
          title: "Case Started",
          description: `Case for ${clientName} began today.`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "asset_updated":
        timelineEntry = {
          assetUrl: additionalData.assetUrls || [], // Use array of URLs
          title: "Assets Updated",
          description: `${additionalData.assetCount || "New"} asset(s) have been added to the case.`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "case_overview_updated":
        timelineEntry = {
          assetUrl: [], // No assets involved
          title: "Case Updated",
          description: `Case details have been updated. ${additionalData.changes ? "Changes: " + additionalData.changes : ""}`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "timeline_created":
        timelineEntry = {
          assetUrl: additionalData.assetUrl ? [additionalData.assetUrl] : [], // Convert single URL to array
          title: additionalData.title || "Timeline Entry Added",
          description: additionalData.description || "New timeline entry created by user.",
          date: additionalData.date || new Date().toISOString(),
          isDeleted: false,
        };
        break;
      default:
        timelineEntry = {
          assetUrl: [], // Default to empty array
          title: "Case Activity",
          description: `Activity recorded for ${clientName}.`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
    }

    let result: Types.ObjectId;

    if (!timelineId) {
      // Create new timeline
      const timelineData = {
        caseOverview_id: caseOverviewId,
        user_id: new Types.ObjectId(userId),
        caseTitle: clientName,
        timeLine: [timelineEntry],
      };

      const timeline = await TimelineListModel.create([timelineData], { session });
      result = timeline[0]._id;
    } else {
      // Update existing timeline by adding new entry
      await TimelineListModel.updateOne(
        { _id: timelineId },
        {
          $set: {
            caseOverview_id: caseOverviewId,
          },
          $push: {
            timeLine: timelineEntry,
          },
        },
        { session }
      );
      result = timelineId;
    }

    // Commit transaction if session was created here
    if (!providedSession) {
      await session.commitTransaction();
      session.endSession();
    }

    return result;
  } catch (error: any) {
    if (!providedSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw new Error(`Timeline operation failed: ${error.message}`);
  }
};

/**
 * Create or Update Asset List
 */
const createOrUpdateAssetList = async ({
  userId,
  caseOverviewId = null,
  assetListData,
  files,
  assetListId = null,
  session: providedSession,
}: {
  userId: string;
  caseOverviewId?: Types.ObjectId | null;
  assetListData: Array<{
    assetUrl: string;
    assetName: string;
    uploadDate: string;
  }>;
  files: any[];
  assetListId?: Types.ObjectId | null;
  session?: mongoose.ClientSession;
}): Promise<{ assetListId: Types.ObjectId; uploadedAssetUrls: string[] }> => {
  // Start a new session if none is provided
  const session = providedSession || (await mongoose.startSession());
  if (!providedSession) session.startTransaction();

  try {
    // Validate inputs
    if (!files || files.length === 0 || !assetListData || assetListData.length === 0) {
      throw new Error("Files and assetListData are required");
    }
    if (files.length !== assetListData.length) {
      throw new Error(`Mismatch between files (${files.length}) and assetListData (${assetListData.length})`);
    }

    // Upload assets to Cloudinary
    const uploadedAssets = await Promise.all(
      assetListData.map(async (asset, index) => {
        try {
          const file = files[index];
          if (!file || !file.path) {
            throw new Error(`Invalid file at index ${index}`);
          }
          console.log(`Uploading file: ${file.path}`); // Debug log
          const uploadResult = await uploadPdfToCloudinary(asset.assetName, file.path);
          return {
            assetUrl: uploadResult.secure_url,
            assetName: asset.assetName,
            uploadDate: asset.uploadDate || new Date().toISOString(),
          };
        } catch (error: any) {
          throw new Error(`Failed to upload asset '${asset.assetName}' at index ${index}: ${error.message}`);
        }
      })
    );

    // Extract uploaded asset URLs
    const uploadedAssetUrls = uploadedAssets.map((asset) => asset.assetUrl);

    let result: { assetListId: Types.ObjectId; uploadedAssetUrls: string[] };

    if (!assetListId) {
      // Create new asset list
      const assetListPayload = {
        user_id: new Types.ObjectId(userId),
        caseOverview_id: caseOverviewId,
        assets: uploadedAssets,
      };

      const assetList = await AssetListModel.create([assetListPayload], { session });
      result = { assetListId: assetList[0]._id, uploadedAssetUrls };
    } else {
      // Update existing asset list
      await AssetListModel.updateOne(
        { _id: assetListId },
        {
          $set: {
            caseOverview_id: caseOverviewId,
          },
          $push: {
            assets: { $each: uploadedAssets },
          },
        },
        { session }
      );
      result = { assetListId, uploadedAssetUrls };
    }

    // Commit transaction if session was created here
    if (!providedSession) {
      await session.commitTransaction();
      session.endSession();
    }

    return result;
  } catch (error: any) {
    if (!providedSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw new Error(`Asset list operation failed: ${error.message}`);
  }
};

/**
 * Create Case Overview
 */
const createCaseOverview = async ({
  userId,
  clientName,
  caseType,
  caseStatus,
  coatDate,
  note,
  assetListId = null,
  timelineId = null,
  session: providedSession,
}: {
  userId: string;
  clientName: string;
  caseType: string;
  caseStatus: string;
  coatDate?: string;
  note?: string;
  assetListId?: Types.ObjectId | null;
  timelineId?: Types.ObjectId | null;
  session?: mongoose.ClientSession;
}): Promise<Types.ObjectId> => {
  // Start a new session if none is provided
  const session = providedSession || (await mongoose.startSession());
  if (!providedSession) session.startTransaction();

  try {
    const caseOverviewData = {
      user_id: new Types.ObjectId(userId),
      clientName,
      caseType,
      case_status: caseStatus,
      coatDate,
      note,
      assetList_id: assetListId,
      timeLine_id: timelineId,
      isDeleted: false,
    };

    const caseOverview = await CaseOverviewModel.create([caseOverviewData], { session });
    const result = caseOverview[0]._id;

    // Commit transaction if session was created here
    if (!providedSession) {
      await session.commitTransaction();
      session.endSession();
    }

    return result;
  } catch (error: any) {
    if (!providedSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw new Error(`Case overview creation failed: ${error.message}`);
  }
};

/**
 * Main Create Case Function - Orchestrates all operations
 */
const createCase = async (
  payLoad: {
    user_id: string;
    clientName: string;
    caseType: string;
    case_status: string;
    coatDate?: string;
    note?: string;
    assetList?: Array<{
      assetUrl: string;
      assetName: string;
      uploadDate: string;
    }>;
  },
  files?: any[]
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let assetListId: Types.ObjectId | null = null;
    let timelineId: Types.ObjectId | null = null;

    // Validate files and assetList consistency
    if (files && (!payLoad.assetList || payLoad.assetList.length === 0)) {
      throw new Error("No asset details provided with files");
    }
    if (payLoad.assetList && payLoad.assetList.length > 0 && (!files || files.length === 0)) {
      throw new Error("No files provided with assetList");
    }
    if (files && payLoad.assetList && files.length !== payLoad.assetList.length) {
      throw new Error(`Mismatch between files (${files.length}) and assetList (${payLoad.assetList.length})`);
    }

    // Create CaseOverview first to get caseOverviewId
    const caseOverviewId = await createCaseOverview({
      userId: payLoad.user_id,
      clientName: payLoad.clientName,
      caseType: payLoad.caseType,
      caseStatus: payLoad.case_status,
      coatDate: payLoad.coatDate,
      note: payLoad.note,
      session,
    });

    // Create timeline with caseOverviewId
    timelineId = await createOrUpdateTimelineList({
      userId: payLoad.user_id,
      clientName: payLoad.clientName,
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

    // Handle assetList if files and payLoad.assetList are provided
    if (files && payLoad.assetList && payLoad.assetList.length > 0) {
      const { assetListId: newAssetListId, uploadedAssetUrls } = await createOrUpdateAssetList({
        userId: payLoad.user_id,
        caseOverviewId,
        assetListData: payLoad.assetList,
        files,
        session,
      });
      assetListId = newAssetListId;

      // Update CaseOverview with assetListId
      await CaseOverviewModel.updateOne(
        { _id: caseOverviewId },
        { $set: { assetList_id: assetListId } },
        { session }
      );

      // Add timeline entry for asset upload
      await createOrUpdateTimelineList({
        userId: payLoad.user_id,
        clientName: payLoad.clientName,
        caseOverviewId,
        timelineId,
        action: "asset_updated",
        additionalData: {
          assetCount: payLoad.assetList.length,
          assetUrls: uploadedAssetUrls,
        },
        session,
      });
    }

    // Update user's case_ids
    await ProfileModel.updateOne(
      { _id: new Types.ObjectId(payLoad.user_id) },
      { $addToSet: { case_ids: caseOverviewId } }, // Use $addToSet to avoid duplicates
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      caseOverviewId,
      assetListId,
      timelineId,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(`Case creation failed: ${error.message}`);
  }
};

/**
 * Update Case Overview (with automatic timeline Ascending Timeline entry)
 */
const updateCaseOverview = async ({
  caseOverviewId,
  updateData,
  userId,
  clientName,
  timelineId,
  session: providedSession,
}: {
  caseOverviewId: Types.ObjectId;
  updateData: {
    clientName?: string;
    caseType?: string;
    case_status?: string;
    coatDate?: string;
    note?: string;
  };
  userId: string;
  clientName: string;
  timelineId: Types.ObjectId;
  session?: mongoose.ClientSession;
}): Promise<void> => {
  // Start a new session if none is provided
  const session = providedSession || (await mongoose.startSession());
  if (!providedSession) session.startTransaction();

  try {
    // Validate updateData
    if (!Object.keys(updateData).length) {
      throw new Error("No update data provided");
    }

    // Update case overview
    await CaseOverviewModel.updateOne(
      { _id: caseOverviewId },
      { $set: updateData },
      { session }
    );

    // Automatically add timeline entry for case overview update
    const changes = Object.keys(updateData)
      .map((key) => `${key}: ${updateData[key as keyof typeof updateData]}`)
      .join(", ");
    await createOrUpdateTimelineList({
      userId,
      clientName,
      caseOverviewId,
      timelineId,
      action: "case_overview_updated",
      additionalData: { changes },
      session,
    });

    // Commit transaction if session was created here
    if (!providedSession) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (error: any) {
    if (!providedSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw new Error(`Case overview update failed: ${error.message}`);
  }
};

/**
 * Add Timeline Entry (when user creates timeline data)
 */
const addTimelineEntry = async ({
  userId,
  clientName,
  caseOverviewId,
  timelineId,
  timelineData,
  session: providedSession,
}: {
  userId: string;
  clientName: string;
  caseOverviewId: Types.ObjectId;
  timelineId: Types.ObjectId;
  timelineData: {
    title: string;
    description: string;
    date?: string;
    assetUrl?: string;
  };
  session?: mongoose.ClientSession;
}): Promise<void> => {
  // Start a new session if none is provided
  const session = providedSession || (await mongoose.startSession());
  if (!providedSession) session.startTransaction();

  try {
    // Validate timelineData
    if (!timelineData.title || !timelineData.description) {
      throw new Error("Timeline entry must include title and description");
    }

    await createOrUpdateTimelineList({
      userId,
      clientName,
      caseOverviewId,
      timelineId,
      action: "timeline_created",
      additionalData: timelineData,
      session,
    });

    // Commit transaction if session was created here
    if (!providedSession) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (error: any) {
    if (!providedSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw new Error(`Timeline entry addition failed: ${error.message}`);
  }
};

/**
 * Add Assets to Existing Case (with automatic timeline entry)
 */
const addAssetsToCase = async ({
  assetListId,
  userId,
  clientName,
  caseOverviewId,
  timelineId,
  newAssetData,
  files,
  session: providedSession,
}: {
  assetListId: Types.ObjectId;
  userId: string;
  clientName: string;
  caseOverviewId: Types.ObjectId;
  timelineId: Types.ObjectId;
  newAssetData: Array<{
    assetUrl: string;
    assetName: string;
    uploadDate: string;
  }>;
  files: any[];
  session?: mongoose.ClientSession;
}): Promise<void> => {
  // Start a new session if none is provided
  const session = providedSession || (await mongoose.startSession());
  if (!providedSession) session.startTransaction();

  try {
    // Validate inputs
    if (!files || files.length === 0 || !newAssetData || newAssetData.length === 0) {
      throw new Error("Files and newAssetData are required");
    }
    if (files.length !== newAssetData.length) {
      throw new Error(`Mismatch between files (${files.length}) and newAssetData (${newAssetData.length})`);
    }

    // Upload new assets and update asset list
    const { uploadedAssetUrls } = await createOrUpdateAssetList({
      userId,
      caseOverviewId,
      assetListData: newAssetData,
      files,
      assetListId,
      session,
    });

    // Automatically add timeline entry for asset update
    await createOrUpdateTimelineList({
      userId,
      clientName,
      caseOverviewId,
      timelineId,
      action: "asset_updated",
      additionalData: {
        assetCount: newAssetData.length,
        assetUrls: uploadedAssetUrls,
      },
      session,
    });

    // Commit transaction if session was created here
    if (!providedSession) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (error: any) {
    if (!providedSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw new Error(`Asset addition failed: ${error.message}`);
  }
};



interface CaseOverviewQuery {
    userId?: Types.ObjectId;
    page?: number;
    limit?: number;
  }
  
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
  
    // Add userId filter if provided
    if (userId) {
      query.user_id = new Types.ObjectId(userId);
    }
  
    // Calculate pagination parameters
    const skip = (page - 1) * limit;
  
    // Execute query with pagination
    const [caseOverviews, total] = await Promise.all([
      CaseOverviewModel.find(query)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      CaseOverviewModel.countDocuments(query).exec(),
    ]);
  
    return {
      caseOverviews,
      total,
      page,
      limit,
    };
  };

const caseService = {
    findCaseOverviews,
  createCase,
  createCaseOverview,
  createOrUpdateTimelineList,
  updateCaseOverview,
  addTimelineEntry,
  addAssetsToCase,
};

export default caseService;