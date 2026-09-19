import express from "express";
import requireAuth from "../../common/middlewares/auth.middleware.js";
import { 
  startTopicSuggesterController, 
  getTopicJobStatusController,
  fetchTopicByGroupIdController 
} from "./topic.controller.js";
const router = express.Router();

// These routes read and write a workspace's papers and run billable AI
// workflows, so they need the same session check as the CiteWise modules.
router.use(requireAuth);

router.get("/status/:jobId", getTopicJobStatusController);
router.post("/run", startTopicSuggesterController);
router.get("/:group_id", fetchTopicByGroupIdController);

export default router;
