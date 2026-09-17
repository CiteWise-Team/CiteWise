import express from "express";
import { 
  startTopicSuggesterController, 
  getTopicJobStatusController,
  fetchTopicByGroupIdController 
} from "./topic.controller.js";
const router = express.Router();

router.get("/status/:jobId", getTopicJobStatusController);
router.post("/run", startTopicSuggesterController);
router.get("/:group_id", fetchTopicByGroupIdController);

export default router;
