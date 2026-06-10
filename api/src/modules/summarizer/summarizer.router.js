import express from "express";
import { startSummarizerController,fetchSumamryDataByGroupIdController } from "./summarizer.controller.js";
const router = express.Router();

router.post("/:group_id", startSummarizerController);
router.get("/:group_id", fetchSumamryDataByGroupIdController);

export default router;
