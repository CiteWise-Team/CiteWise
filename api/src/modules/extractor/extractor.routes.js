import express from "express";
import { startExtractorController, fetchExtractorDataByGroupIdController} from "./extractor.controller.js";
const router = express.Router();

router.post("/file", startExtractorController);
router.get("/:group_id", fetchExtractorDataByGroupIdController);
export default router;
