import express from "express";
import auth from "../../middleware/auth";
import { userRole } from "../../constants";
import caseController from "./case.controller";
import { upload } from "../../util/uploadImgToCloudinary";


const caseRoutes = express.Router()

caseRoutes.post(
    "/createCase",
    auth([userRole.admin]),
    upload.array("files", 5), // Accept up to 5 files in 'files' field
    caseController.createCase
  );

export default caseRoutes