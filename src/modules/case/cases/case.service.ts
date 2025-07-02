import mongoose, { Types } from "mongoose";
import { AssetListModel, CaseOverviewModel, TimelineListModel } from "../case.model";
import { uploadPdfToCloudinary } from "../../../util/uploadImgToCludinary";
import { ProfileModel } from "../../user/user.model";

interface ManageCasePayload {
  userId: string;
  clientName?: string;
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

interface CaseOverviewQuery {
  userId?: Types.ObjectId;
  page?: number;
  limit?: number;
}

/**
 * Create or Update Timeline List
 */
const createOrUpdateTimelineList = async ({
  userId,
  clientName,
  caseOverviewId,
  timelineId = null,
  action = "case_started",
  additionalData = {},
  session,
}: {
  userId: string;
  clientName: string;
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
          description: `Case for ${clientName} began today.`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "asset_updated":
        timelineEntry = {
          assetUrl: additionalData.assetUrls || [],
          title: "Assets Updated",
          description: `${additionalData.assetCount || "New"} asset(s) added to the case.`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "case_overview_updated":
        timelineEntry = {
          assetUrl: [],
          title: "Case Updated",
          description: `Case details updated. ${additionalData.changes ? "Changes: " + additionalData.changes : ""}`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
        break;
      case "timeline_created":
        timelineEntry = {
          assetUrl: additionalData.assetUrl ? [additionalData.assetUrl] : [],
          title: additionalData.title || "Timeline Entry Added",
          description: additionalData.description || "New timeline entry created.",
          date: additionalData.date || new Date().toISOString(),
          isDeleted: false,
        };
        break;
      default:
        timelineEntry = {
          assetUrl: [],
          title: "Case Activity",
          description: `Activity recorded for ${clientName}.`,
          date: new Date().toISOString(),
          isDeleted: false,
        };
    }

    if (!timelineId) {
      const timelineData = {
        caseOverview_id: caseOverviewId,
        user_id: new Types.ObjectId(userId),
        caseTitle: clientName,
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
  userId,
  caseOverviewId,
  assetListData,
  files,
  assetListId = null,
  session,
}: {
  userId: string;
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
        user_id: new Types.ObjectId(userId),
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
const manageCase = async (
  payload: ManageCasePayload,
  files?: any[]
): Promise<{
  caseOverviewId: Types.ObjectId;
  assetListId?: Types.ObjectId;
  timelineId?: Types.ObjectId;
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
    // if (files && (!payload.assetListData || payload.assetListData.length === 0)) {
    //   throw new Error("No asset details provided with files");
    // }
    if (payload.assetListData && payload.assetListData.length > 0 && (!files || files.length === 0)) {
      throw new Error("No files provided with assetListData");
    }
    if (files && payload.assetListData && files.length !== payload.assetListData.length) {
      throw new Error(`Mismatch between files (${files.length}) and assetListData (${payload.assetListData.length})`);
    }

    if (!payload.caseOverviewId) {
      // Create new case
      if (!payload.clientName || !payload.caseType || !payload.caseStatus) {
        throw new Error("clientName, caseType, and caseStatus are required for new case");
      }

      const caseOverviewData = {
        user_id: new Types.ObjectId(payload.userId),
        clientName: payload.clientName,
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
        userId: payload.userId,
        clientName: payload.clientName,
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

      // Update user's case_ids
      await ProfileModel.updateOne(
        { _id: new Types.ObjectId(payload.userId) },
        { $addToSet: { case_ids: caseOverviewId } },
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
      if (payload.caseType) updateData.caseType = payload.caseType;
      if (payload.caseStatus) updateData.case_status = payload.caseStatus;
      if (payload.coatDate) updateData.coatDate = payload.coatDate;
      if (payload.note) updateData.note = payload.note;

      if (Object.keys(updateData).length > 0) {
        await CaseOverviewModel.updateOne({ _id: caseOverviewId }, { $set: updateData }, { session });
        const changes = Object.keys(updateData)
          .map((key) => `${key}: ${updateData[key]}`)
          .join(", ");
        timelineId = await createOrUpdateTimelineList({
          userId: payload.userId,
          clientName: caseOverview.clientName,
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

    // Handle assets if provided
    if (payload.assetListData && files && payload.assetListData.length > 0) {
      const { assetListId: newAssetListId, uploadedAssetUrls } = await createOrUpdateAssetList({
        userId: payload.userId,
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
      const clientName = payload.clientName || caseOverview?.clientName || "Unknown";
      timelineId = await createOrUpdateTimelineList({
        userId: payload.userId,
        clientName,
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

    // Handle timeline entry if provided
    if (payload.timelineData) {
      if (!payload.timelineData.title || !payload.timelineData.description) {
        throw new Error("Timeline entry must include title and description");
      }
      const clientName =
        payload.clientName || (await CaseOverviewModel.findById(caseOverviewId).session(session))?.clientName || "Unknown";
      if (!timelineId) {
        timelineId = await createOrUpdateTimelineList({
          userId: payload.userId,
          clientName,
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
        userId: payload.userId,
        clientName,
        caseOverviewId,
        timelineId,
        action: "timeline_created",
        additionalData: payload.timelineData,
        session,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return { caseOverviewId };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(`Case operation failed: ${error.message}`);
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

const caseService = {
  manageCase,
  findCaseOverviews,
};

export default caseService;