import express from "express";
import requireAuth from "../../common/middlewares/auth.middleware.js";
import { requireGroupAccess } from "../../common/middlewares/groupAccess.middleware.js";
import { 
  startGapExtractorController, 
  getGapJobStatusController,
  fetchGapDataByGroupIdController 
} from "./gap.controller.js";
const router = express.Router();

// These routes read and write a workspace's papers and run billable AI
// workflows, so they need the same session check as the CiteWise modules.
router.use(requireAuth);

router.get("/status/:jobId", getGapJobStatusController);
router.post("/:group_id", requireGroupAccess((req) => [req.params.group_id, req.body?.group_id, req.body?.id?.group_id]), startGapExtractorController);
router.get("/:group_id", requireGroupAccess((req) => req.params.group_id), fetchGapDataByGroupIdController );

export default router;
