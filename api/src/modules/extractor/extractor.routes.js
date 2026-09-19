import express from "express";
import requireAuth from "../../common/middlewares/auth.middleware.js";
import { 
  startExtractorController, 
  getExtractionJobStatusController, 
  fetchExtractorDataByGroupIdController, 
  viewExtractorFileController 
} from "./extractor.controller.js";
const router = express.Router();

// These routes read and write a workspace's papers and run billable AI
// workflows, so they need the same session check as the CiteWise modules.
router.use(requireAuth);

router.get("/file/view", viewExtractorFileController);
router.post("/file", startExtractorController);
router.get("/status/:jobId", getExtractionJobStatusController);
router.get("/:group_id", fetchExtractorDataByGroupIdController);
export default router;
