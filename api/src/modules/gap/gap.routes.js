import express from "express";
import { 
  startGapExtractorController, 
  getGapJobStatusController,
  fetchGapDataByGroupIdController 
} from "./gap.controller.js";
const router = express.Router();

router.get("/status/:jobId", getGapJobStatusController);
router.post("/:group_id", startGapExtractorController);
router.get("/:group_id", fetchGapDataByGroupIdController );

export default router;
