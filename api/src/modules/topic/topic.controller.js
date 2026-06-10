import { runTopicSuggesterService, fetchTopicsByGroupIdService } from "./topic.service.js";

export async function startTopicSuggesterController(req,res,next){
    try{
        const data = req.body;
        const result = await runTopicSuggesterService(data);
        return res.status(result.status).json({
            success: result.status < 400,
            message: result.message,
            data: result.data || null,
        });
    } catch(err){
        console.error("Controller error:", err);
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