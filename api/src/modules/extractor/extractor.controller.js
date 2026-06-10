import multer from "multer";
import { runExtractorService, fetchExtractedDataUsingGroupIdService } from "./extractor.service.js";

const upload = multer({ storage: multer.memoryStorage() });

export const startExtractorController = [
  upload.single("file"), 
  async (req, res, next) => {
    try {
      const file = req.file?.buffer;
      const filename = req.file?.originalname;
      // ========
      const group_id = req.body.group_id;

      // ========
      const result = await runExtractorService(file, filename,group_id);

      return res.status(result.status).json({
        success: result.status < 400,
        message: result.message,
        data: result.data || null,
      });
    } catch (err) {
      console.error("Controller error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
];
export async function fetchExtractorDataByGroupIdController(req, res, next) {
  try {
    const groupId = req.params.group_id;
    const result = await fetchExtractedDataUsingGroupIdService(groupId);
    return res.status(result.status).json({
      success: result.status < 400,
      message: result.message,
      data: result.data || null,
    });
  } catch (err) {
    console.error("Controller error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } 
}
