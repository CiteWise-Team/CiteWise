import express from "express";
import { startTopicSuggesterController, fetchTopicByGroupIdController } from "./topic.controller.js";
const router = express.Router();

router.post("/run", startTopicSuggesterController);
router.get("/:group_id", fetchTopicByGroupIdController);

export default router;
