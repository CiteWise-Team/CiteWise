import crypto from "crypto";
import { runGapExtractorService, fetchGapsDataUsingGroupIdService } from "./gap.service.js";

// In-memory gap job map
const gapJobs = new Map();

// Periodic cleanup of jobs older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of gapJobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      gapJobs.delete(jobId);
    }
  }
}, 15 * 60 * 1000);

export async function startGapExtractorController(req,res,next){
    try{
        const data = req.body;
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Data payload is required",
            });
        }

        const jobId = crypto.randomUUID();
        gapJobs.set(jobId, {
            id: jobId,
            status: "PROCESSING",
            createdAt: Date.now(),
            data: null,
            error: null,
        });

        // Dispatch background execution (Heroku-safe: responds immediately within ~50ms)
        setImmediate(async () => {
            try {
                console.info(`[gap] Starting background gap analysis job ${jobId}`);
                const result = await runGapExtractorService(data);
                if (result.status < 400 && result.data) {
                    console.info(`[gap] Job ${jobId} completed successfully`);
                    gapJobs.set(jobId, {
                        ...gapJobs.get(jobId),
                        status: "COMPLETED",
                        data: result.data,
                    });
                } else {
                    console.error(`[gap] Job ${jobId} failed: ${result.message}`);
                    gapJobs.set(jobId, {
                        ...gapJobs.get(jobId),
                        status: "FAILED",
                        error: result.message || "Gap extraction workflow failed",
                    });
                }
            } catch (err) {
                console.error(`[gap] Job ${jobId} unexpected error:`, err);
                gapJobs.set(jobId, {
                    ...gapJobs.get(jobId),
                    status: "FAILED",
                    error: err.message || "Internal gap extraction error",
                });
            }
        });

        return res.status(202).json({
            success: true,
            status: "PROCESSING",
            jobId,
            message: "Gap extraction started in the background.",
        });
    } catch(err){
        console.error("Controller error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export async function getGapJobStatusController(req, res, next) {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({ success: false, message: "jobId parameter is required" });
        }

        const job = gapJobs.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                status: "NOT_FOUND",
                message: "Gap extraction job not found or expired",
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

export async function fetchGapDataByGroupIdController(req,res,next){
  try {
    const groupId = req.params.group_id;
    const result = await fetchGapsDataUsingGroupIdService(groupId);
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