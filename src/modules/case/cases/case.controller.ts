import { Types } from "mongoose";
import caseService from "./case.service";
import catchAsync from "../../../util/catchAsync";
import idConverter from "../../../util/idConverter";

const manageCase = catchAsync(async (req, res) => {
  const payLoad = JSON.parse(req.body.data);
  const files = req.files as any[];

  if (!payLoad) {
    throw new Error("No payload data provided");
  }

  // Validate required fields for new case
  if (!payLoad.caseOverviewId) {
    if (!payLoad.userId || !payLoad.clientName || !payLoad.caseType || !payLoad.caseStatus) {
      throw new Error("userId, clientName, caseType, and caseStatus are required for new case");
    }
    if (!Types.ObjectId.isValid(payLoad.userId)) {
      throw new Error("Invalid userId");
    }
  } else {
    // Validate caseOverviewId for updates
    if (!Types.ObjectId.isValid(payLoad.caseOverviewId)) {
      throw new Error("Invalid caseOverviewId");
    }
    if (!Types.ObjectId.isValid(payLoad.userId)) {
      throw new Error("Invalid userId");
    }
  }

  const result = await caseService.manageCase(payLoad, files);

  res.status(200).json({
    status: "success",
    message: payLoad.caseOverviewId ? "Case updated successfully" : "Case created successfully",
    data: result,
  });
});

const findCaseOverviews = catchAsync(async (req, res) => {
  const payLoad = req.query;
  const userId = typeof payLoad.userId === "string" && idConverter(payLoad.userId) as Types.ObjectId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing userId");
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

const caseController = {
  manageCase,
  findCaseOverviews,
};

export default caseController;