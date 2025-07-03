import { Types } from "mongoose";
import catchAsync from "../../../util/catchAsync";
import idConverter from "../../../util/idConverter";
import caseService from "./case.service";
import { CaseOverviewQuery } from "../case.interface";

const manageCase = catchAsync(async (req, res) => {
  const payLoad = JSON.parse(req.body.data);
  const files = req.files as any[];
  const userId = req.user?.id; // Extract admin/user ID from auth token
  const userRole = req.user?.role; // Extract role from auth token

  if (!payLoad) {
    throw new Error("No payload data provided");
  }
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing userId from token");
  }

  // Validate based on role and operation
  if (userRole === "user") {
    // Users can only add assets with clientName or caseOverviewId
    if (payLoad.client_user_id || payLoad.caseTitle || payLoad.caseType || payLoad.caseStatus || payLoad.coatDate || payLoad.note || payLoad.timelineData) {
      throw new Error("Users can only add assets");
    }
    if (!payLoad.clientName && !payLoad.caseOverviewId) {
      throw new Error("clientName or caseOverviewId is required for users");
    }
    if (payLoad.caseOverviewId && !Types.ObjectId.isValid(payLoad.caseOverviewId)) {
      throw new Error("Invalid caseOverviewId");
    }
    if (!payLoad.assetListData || !files || payLoad.assetListData.length === 0 || files.length === 0) {
      throw new Error("assetListData and files are required for users");
    }
    if (files.length !== payLoad.assetListData.length) {
      throw new Error(`Mismatch between files (${files.length}) and assetListData (${payLoad.assetListData.length})`);
    }
  } else if (userRole === "admin") {
    if (!payLoad.caseOverviewId) {
      // New case creation
      if (!payLoad.client_user_id || !payLoad.clientName || !payLoad.caseTitle || !payLoad.caseType || !payLoad.caseStatus) {
        throw new Error("client_user_id, clientName, caseTitle, caseType, and caseStatus are required for new case");
      }
      if (!Types.ObjectId.isValid(payLoad.client_user_id)) {
        throw new Error("Invalid client_user_id");
      }
    } else {
      // Case update or asset/timeline addition
      if (payLoad.caseOverviewId && !Types.ObjectId.isValid(payLoad.caseOverviewId)) {
        throw new Error("Invalid caseOverviewId");
      }
      if (payLoad.client_user_id && !Types.ObjectId.isValid(payLoad.client_user_id)) {
        throw new Error("Invalid client_user_id");
      }
      if (payLoad.assetListData && (!files || files.length === 0)) {
        throw new Error("Files are required when assetListData is provided");
      }
      if (payLoad.assetListData && files && files.length !== payLoad.assetListData.length) {
        throw new Error(`Mismatch between files (${files.length}) and assetListData (${payLoad.assetListData.length})`);
      }
      if (payLoad.timelineData && (!payLoad.timelineData.title || !payLoad.timelineData.description)) {
        throw new Error("Timeline entry must include title and description");
      }
    }
  } else {
    throw new Error("Invalid user role");
  }

  const result = await caseService.manageCase({ ...payLoad, userId }, files, userRole);

  res.status(200).json({
    status: "success",
    message: payLoad.caseOverviewId || payLoad.clientName ? "Case updated successfully" : "Case created successfully",
    data: result,
  });
});

const updateCase = catchAsync(async (req, res) => {
  const caseOverviewId = req.params.caseOverviewId;
  const payLoad = req.body;
  const userId = req.user?.id; // Extract admin ID from auth token
  const userRole = req.user?.role; // Extract role from auth token

  if (userRole !== "admin") {
    throw new Error("Only admins can update cases");
  }
  if (!caseOverviewId || !Types.ObjectId.isValid(caseOverviewId)) {
    throw new Error("Invalid or missing caseOverviewId");
  }
  if (!payLoad || Object.keys(payLoad).length === 0) {
    throw new Error("No update data provided");
  }
  if (payLoad.client_user_id && !Types.ObjectId.isValid(payLoad.client_user_id)) {
    throw new Error("Invalid client_user_id");
  }
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing userId from token");
  }

  const result = await caseService.updateCase({
    caseOverviewId,
    userId,
    ...payLoad,
  });

  res.status(200).json({
    status: "success",
    message: "Case updated successfully",
    data: result,
  });
});

const deleteCase = catchAsync(async (req, res) => {
  const caseOverviewId = req.params.caseOverviewId;
  const userId = req.user?.id; // Extract admin ID from auth token
  const userRole = req.user?.role; // Extract role from auth token

  if (userRole !== "admin") {
    throw new Error("Only admins can delete cases");
  }
  if (!caseOverviewId || !Types.ObjectId.isValid(caseOverviewId)) {
    throw new Error("Invalid or missing caseOverviewId");
  }
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing userId from token");
  }

  await caseService.deleteCase({
    caseOverviewId,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Case deleted successfully",
    data: null,
  });
});

const findCaseOverviews = catchAsync(async (req, res) => {
  const userId = req.user?.id; // Extract admin ID from auth token
  const userRole = req.user?.role; // Extract role from auth token
  const payLoad = req.query;

  if (userRole !== "admin") {
    throw new Error("Only admins can retrieve case overviews");
  }
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing userId from token");
  }

  const page = typeof payLoad.page === "string" ? parseInt(payLoad.page, 10) : 1;
  const limit = typeof payLoad.limit === "string" ? parseInt(payLoad.limit, 10) : 10;

  if (isNaN(page) || page < 1) {
    throw new Error("Invalid page number");
  }
  if (isNaN(limit) || limit < 1) {
    throw new Error("Invalid limit value");
  }

  const result = await caseService.findCaseOverviews({
    userId,
    page,
    limit,
  });

  res.status(200).json({
    status: "success",
    message: "Case overviews retrieved successfully",
    data: result,
  });
});

const findCaseById = catchAsync(async (req, res) => {
  const caseOverviewId = req.params.caseOverviewId;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (userRole !== "admin") {
    throw new Error("Only admins can retrieve case details");
  }
  if (!caseOverviewId || !Types.ObjectId.isValid(caseOverviewId)) {
    throw new Error("Invalid or missing caseOverviewId");
  }
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing userId from token");
  }

  const result = await caseService.findCaseById({
    caseOverviewId,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Case retrieved successfully",
    data: result,
  });
});

const findAllCasesWithDetails = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { page, limit, caseStatus } = req.query;

  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing userId from token");
  }

  const pageNum = typeof page === "string" ? parseInt(page, 10) : 1;
  const limitNum = typeof limit === "string" ? parseInt(limit, 10) : 10;

  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error("Invalid page number");
  }
  if (isNaN(limitNum) || limitNum < 1) {
    throw new Error("Invalid limit value");
  }

  // // Validate caseStatus
  // const validStatuses = ["Letter_sent_to_insurance", "In_Progress", "Closed", "Pending"];
  // if (caseStatus && typeof caseStatus === "string" && !validStatuses.includes(caseStatus)) {
  //   throw new Error(`Invalid caseStatus. Must be one of: ${validStatuses.join(", ")}`);
  // }

  // Validate caseStatus case-insensitively
  const validStatuses = ["Letter_sent_to_insurance", "In_Progress", "Closed", "Pending"];
  if (caseStatus && typeof caseStatus === "string") {
    const isValid = validStatuses.some(
      status => status.toLowerCase() === caseStatus.toLowerCase()
    );
    if (!isValid) {
      throw new Error(`Invalid caseStatus. Must be one of: ${validStatuses.join(", ")}`);
    }
  }

  const result = await caseService.findAllCasesWithDetails({
    userId,
    page: pageNum,
    limit: limitNum,
    caseStatus: caseStatus as CaseOverviewQuery['caseStatus'],
  });

  res.status(200).json({
    status: "success",
    message: "Cases with details retrieved successfully",
    data: result,
  });
});

const caseController = {
  manageCase,
  updateCase,
  deleteCase,
  findCaseOverviews,
  findCaseById,
  findAllCasesWithDetails
};

export default caseController;