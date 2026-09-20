import express from "express";
import requireAuth from "../../common/middlewares/auth.middleware.js";
import { 
  startSummarizerController,
  getSummarizerJobStatusController,
  fetchSumamryDataByGroupIdController 
} from "./summarizer.controller.js";
const router = express.Router();

// These routes read and write a workspace's papers and run billable AI
// workflows, so they need the same session check as the CiteWise modules.
router.use(requireAuth);

router.get("/status/:jobId", getSummarizerJobStatusController);
router.post("/:group_id", startSummarizerController);
router.get("/:group_id", fetchSumamryDataByGroupIdController);

export default router;
