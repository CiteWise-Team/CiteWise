import crypto from "crypto";
import { runSummarizerService, fetchSummarizedDataUsingGroupIdService } from "./summarizer.service.js";

// In-memory summarizer job map
const summarizerJobs = new Map();

// Periodic cleanup of jobs older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of summarizerJobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      summarizerJobs.delete(jobId);
    }
  }
}, 15 * 60 * 1000);

export async function startSummarizerController(req, res, next) {
    try {
        const data = req.body;
        if (!data || !data.id) {
            return res.status(400).json({
                success: false,
                message: "Extracted document ID (data.id) is required",
            });
        }

        const jobId = crypto.randomUUID();
        summarizerJobs.set(jobId, {
            id: jobId,
            status: "PROCESSING",
            group_id: data.group_id,
            createdAt: Date.now(),
            data: null,
            error: null,
        });

        // Dispatch background execution (Heroku-safe: responds immediately within ~50ms)
        setImmediate(async () => {
            try {
                console.info(`[summarizer] Starting background summarization job ${jobId}`);
                const result = await runSummarizerService(data);
                if (result.status < 400 && result.data) {
                    console.info(`[summarizer] Job ${jobId} completed successfully`);
                    summarizerJobs.set(jobId, {
                        ...summarizerJobs.get(jobId),
                        status: "COMPLETED",
                        data: result.data,
                    });
                } else {
                    console.error(`[summarizer] Job ${jobId} failed: ${result.message}`);
                    summarizerJobs.set(jobId, {
                        ...summarizerJobs.get(jobId),
                        status: "FAILED",
                        error: result.message || "Summarizer workflow failed",
                    });
                }
            } catch (err) {
                console.error(`[summarizer] Job ${jobId} unexpected error:`, err);
                summarizerJobs.set(jobId, {
                    ...summarizerJobs.get(jobId),
                    status: "FAILED",
                    error: err.message || "Internal summarization error",
                });
            }
        });

        return res.status(202).json({
            success: true,
            status: "PROCESSING",
            jobId,
            message: "Summarization started in the background.",
        });
    } catch (err) {
        console.error("Controller error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }   
}

export async function getSummarizerJobStatusController(req, res, next) {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({ success: false, message: "jobId parameter is required" });
        }

        const job = summarizerJobs.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                status: "NOT_FOUND",
                message: "Summarizer job not found or expired",
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

export async function fetchSumamryDataByGroupIdController(req,res,next){
  try {
    const groupId = req.params.group_id;
    const result = await fetchSummarizedDataUsingGroupIdService(groupId);
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