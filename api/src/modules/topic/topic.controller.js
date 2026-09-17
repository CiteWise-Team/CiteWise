import crypto from "crypto";
import { runTopicSuggesterService, fetchTopicsByGroupIdService } from "./topic.service.js";

// In-memory topic job map
const topicJobs = new Map();

// Periodic cleanup of jobs older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of topicJobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      topicJobs.delete(jobId);
    }
  }
}, 15 * 60 * 1000);

export async function startTopicSuggesterController(req,res,next){
    try{
        const data = req.body;
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Data payload is required",
            });
        }

        const jobId = crypto.randomUUID();
        topicJobs.set(jobId, {
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
                console.info(`[topic] Starting background topic suggestion job ${jobId}`);
                const result = await runTopicSuggesterService(data);
                if (result.status < 400 && result.data) {
                    console.info(`[topic] Job ${jobId} completed successfully`);
                    topicJobs.set(jobId, {
                        ...topicJobs.get(jobId),
                        status: "COMPLETED",
                        data: result.data,
                    });
                } else {
                    console.error(`[topic] Job ${jobId} failed: ${result.message}`);
                    topicJobs.set(jobId, {
                        ...topicJobs.get(jobId),
                        status: "FAILED",
                        error: result.message || "Topic suggester workflow failed",
                    });
                }
            } catch (err) {
                console.error(`[topic] Job ${jobId} unexpected error:`, err);
                topicJobs.set(jobId, {
                    ...topicJobs.get(jobId),
                    status: "FAILED",
                    error: err.message || "Internal topic suggestion error",
                });
            }
        });

        return res.status(202).json({
            success: true,
            status: "PROCESSING",
            jobId,
            message: "Topic suggestion started in the background.",
        });
    } catch(err){
        console.error("Controller error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export async function getTopicJobStatusController(req, res, next) {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({ success: false, message: "jobId parameter is required" });
        }

        const job = topicJobs.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                status: "NOT_FOUND",
                message: "Topic job not found or expired",
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
export async function fetchTopicByGroupIdController(req,res,next){
  try {
    const groupId = req.params.group_id;
    const result = await fetchTopicsByGroupIdService(groupId);
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