import express from "express";
import auth from "../../middleware/auth";
import { userRole } from "../../constants";
import caseController from "./case.controller";
import { upload } from "../../util/uploadImgToCloudinary";

const caseRoutes = express.Router();

// Route to create a new case
caseRoutes.post(
  "/createCase",
  // auth([userRole.admin]),
  upload.array("files", 5), // Accept up to 5 files in 'files' field
  caseController.createCase
);

// Route to add assets to an existing case
caseRoutes.post(
  "/addAssetToCase",
  // auth([userRole.admin]),
  upload.array("files", 5), // Accept up to 5 files in 'files' field
  caseController.addAssetToCase
);

// Route to add a custom timeline entry
caseRoutes.post(
  "/addCustomTimeline",
  // auth([userRole.admin]),
  caseController.addCustomTimeline
);

// Route to add a custom note to case overview
caseRoutes.post(
  "/addCustomNoteToCase",
  // auth([userRole.admin]),
  caseController.addCustomNoteToCase
);

// Route to update case overview
caseRoutes.post(
  "/updateCaseOverview",
  // auth([userRole.admin]),
  caseController.updateCaseOverview
);

caseRoutes.get(
    "/caseOverviews",
    // auth([userRole.admin]),
    caseController.findCaseOverviews
  );

export default caseRoutes;