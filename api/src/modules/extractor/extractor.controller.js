import crypto from "crypto";
import multer from "multer";
import { runExtractorService, fetchExtractedDataUsingGroupIdService } from "./extractor.service.js";
import { getPresignedDownloadUrl } from "../../common/config/r2Client.js";

const upload = multer({ storage: multer.memoryStorage() });

// In-memory extraction job map
// jobId -> { id, status: 'PROCESSING' | 'COMPLETED' | 'FAILED', data: null, error: null, group_id, fileName, createdAt }
const extractionJobs = new Map();

// Periodic cleanup of jobs older than 1 hour to prevent memory leaks
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of extractionJobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      extractionJobs.delete(jobId);
    }
  }
}, 15 * 60 * 1000);

export const startExtractorController = [
  upload.single("file"), 
  async (req, res, next) => {
    try {
      const file = req.file?.buffer;
      const filename = req.file?.originalname;
      const group_id = req.body.group_id;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "File is required",
        });
      }

      if (!group_id) {
        return res.status(400).json({
          success: false,
          message: "group_id is required",
        });
      }

      const jobId = crypto.randomUUID();
      extractionJobs.set(jobId, {
        id: jobId,
        status: "PROCESSING",
        group_id,
        fileName: filename,
        createdAt: Date.now(),
        data: null,
        error: null,
      });

      // Dispatch async background extraction (Heroku-safe: responds immediately within ~50ms)
      setImmediate(async () => {
        try {
          console.info(`[extractor] Starting background extraction job ${jobId} for "${filename}" (group: ${group_id})`);
          const result = await runExtractorService(file, filename, group_id);
          if (result.status < 400 && result.data) {
            console.info(`[extractor] Extraction job ${jobId} succeeded`);
            extractionJobs.set(jobId, {
              ...extractionJobs.get(jobId),
              status: "COMPLETED",
              data: result.data,
            });
          } else {
            console.error(`[extractor] Extraction job ${jobId} failed: ${result.message}`);
            extractionJobs.set(jobId, {
              ...extractionJobs.get(jobId),
              status: "FAILED",
              error: result.message || "Extraction workflow failed",
            });
          }
        } catch (err) {
          console.error(`[extractor] Extraction job ${jobId} unexpected error:`, err);
          extractionJobs.set(jobId, {
            ...extractionJobs.get(jobId),
            status: "FAILED",
            error: err.message || "Internal extraction error",
          });
        }
      });

      return res.status(202).json({
        success: true,
        status: "PROCESSING",
        jobId,
        message: "File received. Extraction started in background.",
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

export async function getExtractionJobStatusController(req, res, next) {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ success: false, message: "jobId parameter is required" });
    }

    const job = extractionJobs.get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        status: "NOT_FOUND",
        message: "Extraction job not found or expired",
      });
    }

    return res.status(200).json({
      success: true,
      jobId: job.id,
      status: job.status,
      data: job.data,
      error: job.error,
    });
  } catch (err) {
    console.error("Job status controller error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
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
