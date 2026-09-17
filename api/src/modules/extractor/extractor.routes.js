import express from "express";
import { 
  startExtractorController, 
  getExtractionJobStatusController, 
  fetchExtractorDataByGroupIdController, 
  viewExtractorFileController 
} from "./extractor.controller.js";
const router = express.Router();

router.get("/file/view", viewExtractorFileController);
router.post("/file", startExtractorController);
router.get("/status/:jobId", getExtractionJobStatusController);
router.get("/:group_id", fetchExtractorDataByGroupIdController);
export default router;
