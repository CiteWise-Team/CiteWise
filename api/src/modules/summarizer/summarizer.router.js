import express from "express";
import { 
  startSummarizerController,
  getSummarizerJobStatusController,
  fetchSumamryDataByGroupIdController 
} from "./summarizer.controller.js";
const router = express.Router();

router.get("/status/:jobId", getSummarizerJobStatusController);
router.post("/:group_id", startSummarizerController);
router.get("/:group_id", fetchSumamryDataByGroupIdController);

export default router;
