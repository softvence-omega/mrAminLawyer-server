import mongoose, { Types } from "mongoose";
import { uploadPdfToCloudinary } from "../../util/uploadImgToCludinary";
import { AssetListModel, CaseOverviewModel, TimelineListModel } from "./case.model";

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
  session,
}: {
  userId: string;
  clientName: string;
  caseOverviewId?: Types.ObjectId | null;
  timelineId?: Types.ObjectId | null;
  action?: "case_started" | "asset_updated" | "case_overview_updated" | "timeline_created";
  additionalData?: any;
  session: mongoose.ClientSession;
}): Promise<Types.ObjectId> => {
  // Generate timeline entry based on action
  let timelineEntry;
  
  switch (action) {
    case "case_started":
      timelineEntry = {
        title: "Case Started",
        description: `Case for ${clientName} began today.`,
        date: new Date().toISOString(),
        isDeleted: false,
      };
      break;
    case "asset_updated":
      timelineEntry = {
        assetUrl: additionalData.assetUrl || "",
        title: "Assets Updated",
        description: `${additionalData.assetCount || 'New'} asset(s) have been added to the case.`,
        date: new Date().toISOString(),
        isDeleted: false,
      };
      break;
    case "case_overview_updated":
      timelineEntry = {
        title: "Case Updated",
        description: `Case details have been updated. ${additionalData.changes ? 'Changes: ' + additionalData.changes : ''}`,
        date: new Date().toISOString(),
        isDeleted: false,
      };
      break;
    case "timeline_created":
      timelineEntry = {
        assetUrl: additionalData.assetUrl || "",
        title: additionalData.title || "Timeline Entry Added",
        description: additionalData.description || "New timeline entry created by user.",
        date: additionalData.date || new Date().toISOString(),
        isDeleted: false,
      };
      break;
    default:
      timelineEntry = {
        assetUrl: additionalData.assetUrl || "",
        title: "Case Activity",
        description: `Activity recorded for ${clientName}.`,
        date: new Date().toISOString(),
        isDeleted: false,
      };
  }

  if (!timelineId) {
    // Create new timeline
    const timelineData = {
      caseOverview_id: caseOverviewId,
      user_id: new Types.ObjectId(userId),
      caseTitle: clientName,
      timeLine: [timelineEntry],
    };

    const timeline = await TimelineListModel.create([timelineData], { session });
    return timeline[0]._id;
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
    return timelineId;
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
  session,
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
  session: mongoose.ClientSession;
}): Promise<Types.ObjectId> => {
  // Upload assets to cloudinary
  const uploadedAssets = await Promise.all(
    assetListData.map(async (asset, index) => {
      const file = files[index];
      const uploadResult = await uploadPdfToCloudinary(asset.assetName, file.path);
      return {
        assetUrl: uploadResult.secure_url,
        assetName: asset.assetName,
        uploadDate: asset.uploadDate,
      };
    })
  );

  if (!assetListId) {
    // Create new asset list
    const assetListPayload = {
      user_id: new Types.ObjectId(userId),
      caseOverview_id: caseOverviewId,
      assets: uploadedAssets,
    };

    const assetList = await AssetListModel.create([assetListPayload], { session });
    return assetList[0]._id;
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
    return assetListId;
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
  session,
}: {
  userId: string;
  clientName: string;
  caseType: string;
  caseStatus: string;
  coatDate?: string;
  note?: string;
  assetListId?: Types.ObjectId | null;
  timelineId?: Types.ObjectId | null;
  session: mongoose.ClientSession;
}): Promise<Types.ObjectId> => {
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
  return caseOverview[0]._id;
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
      throw new Error("Mismatch between provided files and assetList details");
    }

    // Handle assetList if files and payLoad.assetList are provided
    if (files && payLoad.assetList && payLoad.assetList.length > 0) {
      assetListId = await createOrUpdateAssetList({
        userId: payLoad.user_id,
        assetListData: payLoad.assetList,
        files,
        session,
      });
    }

    // Create timeline (automatically generated)
    timelineId = await createOrUpdateTimelineList({
      userId: payLoad.user_id,
      clientName: payLoad.clientName,
      action: "case_started",
      session,
    });

    // Create CaseOverview
    const caseOverviewId = await createCaseOverview({
      userId: payLoad.user_id,
      clientName: payLoad.clientName,
      caseType: payLoad.caseType,
      caseStatus: payLoad.case_status,
      coatDate: payLoad.coatDate,
      note: payLoad.note,
      assetListId,
      timelineId,
      session,
    });

    // Update assetList with caseOverview_id if it was created
    if (assetListId) {
      await AssetListModel.updateOne(
        { _id: assetListId },
        { caseOverview_id: caseOverviewId },
        { session }
      );
    }

    // Update timeline with caseOverview_id
    await createOrUpdateTimelineList({
      userId: payLoad.user_id,
      clientName: payLoad.clientName,
      caseOverviewId,
      timelineId,
      action: "case_started",
      session,
    });

    // Add timeline entry for asset upload if assets were added
    if (assetListId) {
      // Get the first uploaded asset URL for timeline entry
      const firstAssetUrl = payLoad.assetList?.[0]?.assetUrl || "";
      await createOrUpdateTimelineList({
        userId: payLoad.user_id,
        clientName: payLoad.clientName,
        caseOverviewId,
        timelineId,
        action: "asset_updated",
        additionalData: { 
          assetCount: payLoad.assetList?.length,
          assetUrl: firstAssetUrl
        },
        session,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return {
      caseOverviewId,
      assetListId,
      timelineId,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Update Case Overview (with automatic timeline entry)
 */
const updateCaseOverview = async ({
  caseOverviewId,
  updateData,
  userId,
  clientName,
  timelineId,
  session,
}: {
  caseOverviewId: Types.ObjectId;
  updateData: any;
  userId: string;
  clientName: string;
  timelineId: Types.ObjectId;
  session: mongoose.ClientSession;
}): Promise<void> => {
  // Update case overview
  await CaseOverviewModel.updateOne(
    { _id: caseOverviewId },
    { $set: updateData },
    { session }
  );

  // Automatically add timeline entry for case overview update
  const changes = Object.keys(updateData).join(', ');
  await createOrUpdateTimelineList({
    userId,
    clientName,
    caseOverviewId,
    timelineId,
    action: "case_overview_updated",
    additionalData: { changes },
    session,
  });
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
  session,
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
  session: mongoose.ClientSession;
}): Promise<void> => {
  await createOrUpdateTimelineList({
    userId,
    clientName,
    caseOverviewId,
    timelineId,
    action: "timeline_created",
    additionalData: timelineData,
    session,
  });
};

/**
 * Update Asset List (with automatic timeline entry)
 */
const updateAssetList = async ({
  assetListId,
  userId,
  clientName,
  caseOverviewId,
  timelineId,
  newAssetData,
  files,
  session,
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
  session: mongoose.ClientSession;
}): Promise<void> => {
  // Upload new assets
  const uploadedAssets = await Promise.all(
    newAssetData.map(async (asset, index) => {
      const file = files[index];
      const uploadResult = await uploadPdfToCloudinary(asset.assetName, file.path);
      return {
        assetUrl: uploadResult.secure_url,
        assetName: asset.assetName,
        uploadDate: asset.uploadDate,
      };
    })
  );

  // Update asset list
  await AssetListModel.updateOne(
    { _id: assetListId },
    {
      $push: {
        assets: { $each: uploadedAssets },
      },
    },
    { session }
  );

  // Automatically add timeline entry for asset update
  await createOrUpdateTimelineList({
    userId,
    clientName,
    caseOverviewId,
    timelineId,
    action: "asset_updated",
    additionalData: { 
      assetCount: newAssetData.length,
      assetUrl: uploadedAssets[0]?.assetUrl || "" // Use first uploaded asset URL
    },
    session,
  });
};

const caseService = {
  createCase,
  createCaseOverview,
  createOrUpdateTimelineList,
  createOrUpdateAssetList,
  updateCaseOverview,
  addTimelineEntry,
  updateAssetList,
};

export default caseService;