import { Types } from "mongoose";
import catchAsync from "../../util/catchAsync";import idConverter from "../../util/idConverter";
;
import caseService from "./case.service";


const createCase = catchAsync(async (req , res) => {
    const payLoad = JSON.parse(req.body.data)
    const files = req.files as any[]; // Assuming files are provided as an array
  
    // Validate payload existence
    if (!payLoad) {
      throw new Error("No payload data provided");
    }
  
    const result = await caseService.createCase(payLoad, files);
  
    res.status(200).json({
      status: "success",
      message: "Case created successfully",
      data: result,
    });
  });



  const addAssetToCase = catchAsync(async (req, res) => {
    const payLoad = JSON.parse(req.body.data);
    const files = req.files as any[]; // Assuming files are provided as an array
  
    // Validate payload existence
    if (!payLoad) {
      throw new Error("No payload data provided");
    }
  
    // Validate required fields
    if (
      !payLoad.userId ||
      !payLoad.clientName ||
      !payLoad.caseOverviewId ||
      !payLoad.timelineId ||
      !payLoad.assetListId ||
      !payLoad.newAssetData
    ) {
      throw new Error("Missing required fields in payload");
    }
  
    await caseService.addAssetsToCase({
      assetListId: payLoad.assetListId,
      userId: payLoad.userId,
      clientName: payLoad.clientName,
      caseOverviewId: payLoad.caseOverviewId,
      timelineId: payLoad.timelineId,
      newAssetData: payLoad.newAssetData,
      files,
    });
  
    res.status(200).json({
      status: "success",
      message: "Assets added to case successfully",
    });
  });
  
  /**
   * Add a custom timeline entry
   */
  const addCustomTimeline = catchAsync(async (req, res) => {
    const payLoad = JSON.parse(req.body.data);
  
    // Validate payload existence
    if (!payLoad) {
      throw new Error("No payload data provided");
    }
  
    // Validate required fields
    if (
      !payLoad.userId ||
      !payLoad.clientName ||
      !payLoad.caseOverviewId ||
      !payLoad.timelineId ||
      !payLoad.timelineData
    ) {
      throw new Error("Missing required fields in payload");
    }
  
    await caseService.addTimelineEntry({
      userId: payLoad.userId,
      clientName: payLoad.clientName,
      caseOverviewId: payLoad.caseOverviewId,
      timelineId: payLoad.timelineId,
      timelineData: payLoad.timelineData,
    });
  
    res.status(200).json({
      status: "success",
      message: "Custom timeline entry added successfully",
    });
  });
  
  /**
   * Add a custom note to case overview
   */
  const addCustomNoteToCase = catchAsync(async (req, res) => {
    const payLoad = JSON.parse(req.body.data);
  
    // Validate payload existence
    if (!payLoad) {
      throw new Error("No payload data provided");
    }
  
    // Validate required fields
    if (
      !payLoad.caseOverviewId ||
      !payLoad.userId ||
      !payLoad.clientName ||
      !payLoad.timelineId ||
      !payLoad.note
    ) {
      throw new Error("Missing required fields in payload");
    }
  
    await caseService.updateCaseOverview({
      caseOverviewId: payLoad.caseOverviewId,
      updateData: { note: payLoad.note },
      userId: payLoad.userId,
      clientName: payLoad.clientName,
      timelineId: payLoad.timelineId,
    });
  
    res.status(200).json({
      status: "success",
      message: "Note added to case successfully",
    });
  });
  
  /**
   * Update case overview
   */
  const updateCaseOverview = catchAsync(async (req, res) => {
    const payLoad = JSON.parse(req.body.data);
  
    // Validate payload existence
    if (!payLoad) {
      throw new Error("No payload data provided");
    }
  
    // Validate required fields
    if (
      !payLoad.caseOverviewId ||
      !payLoad.userId ||
      !payLoad.clientName ||
      !payLoad.timelineId ||
      !payLoad.updateData
    ) {
      throw new Error("Missing required fields in payload");
    }
  
    await caseService.updateCaseOverview({
      caseOverviewId: payLoad.caseOverviewId,
      updateData: payLoad.updateData,
      userId: payLoad.userId,
      clientName: payLoad.clientName,
      timelineId: payLoad.timelineId,
    });
  
    res.status(200).json({
      status: "success",
      message: "Case overview updated successfully",
    });
  });

  const findCaseOverviews = catchAsync(async (req, res) => {
    const payLoad = req.query; // Use query parameters for filtering
  
    // Extract and validate query parameters
    const userId = typeof payLoad.userId === "string" && idConverter(payLoad.userId) as Types.ObjectId;
    if( !userId ) {
      throw new Error("Invalid or missing userId");
    }
    const page = typeof payLoad.page === "string" ? parseInt(payLoad.page, 10) : 1;
    const limit = typeof payLoad.limit === "string" ? parseInt(payLoad.limit, 10) : 10;
  
    // Validate pagination parameters
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
    findCaseOverviews,
    createCase,
    addAssetToCase,
    addCustomTimeline,
    addCustomNoteToCase,
    updateCaseOverview,
  };

export default caseController;