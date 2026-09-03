import multer from "multer";
import { runExtractorService, fetchExtractedDataUsingGroupIdService } from "./extractor.service.js";
import { getPresignedDownloadUrl } from "../../common/config/r2Client.js";

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

export async function viewExtractorFileController(req, res, next) {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).send("File key is required");
    const downloadUrl = await getPresignedDownloadUrl(key, 3600);
    if (!downloadUrl) return res.status(404).send("File not found or storage unconfigured");
    return res.redirect(downloadUrl);
  } catch (err) {
    console.error("View file error:", err);
    return res.status(500).send("Failed to retrieve file");
  }
}
