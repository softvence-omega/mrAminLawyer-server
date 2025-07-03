import express from "express";
import caseController from "./case.controller";
import { upload } from "../../../util/uploadImgToCludinary";
import auth from "../../../middleware/auth";
import { userRole } from "../../../constants";

const caseRoutes = express.Router();

// Route to create or update a case
caseRoutes.post(
  "/manageCase",
  auth([userRole.admin, userRole.user]),
  upload.array("files", 5), // Accept up to 5 files
  caseController.manageCase
);

// Route to update a case
caseRoutes.patch(
  "/manageCase/:caseOverviewId",
  auth([userRole.admin]),
  caseController.updateCase
);

// Route to delete a case
caseRoutes.delete(
  "/manageCase/:caseOverviewId",
  auth([userRole.admin]),
  caseController.deleteCase
);

// Route to fetch case overviews
caseRoutes.get(
  "/caseOverviews",
  auth([userRole.admin]),
  caseController.findCaseOverviews
);

caseRoutes.get(
  "/case/:caseOverviewId",
  auth([userRole.admin]),
  upload.none(),
  caseController.findCaseById
);

caseRoutes.get(
  "/all-cases",
  auth([userRole.admin]),
  upload.none(),
  caseController.findAllCasesWithDetails
);

export default caseRoutes;