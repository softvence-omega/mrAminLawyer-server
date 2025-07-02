import express from "express";
import caseController from "./case.controller";
import { upload } from "../../../util/uploadImgToCludinary";

const caseRoutes = express.Router();

// Route to create or update a case
caseRoutes.post(
  "/manageCase",
  // auth([userRole.admin]),
  upload.array("files", 5), // Accept up to 5 files
  caseController.manageCase
);

// Route to fetch case overviews
caseRoutes.get(
  "/caseOverviews",
  // auth([userRole.admin]),
  caseController.findCaseOverviews
);

export default caseRoutes;