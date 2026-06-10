import { runGapExtractorService, fetchGapsDataUsingGroupIdService } from "./gap.service.js";
export async function startGapExtractorController(req,res,next){
    try{
        const data = req.body;
        const result = await runGapExtractorService(data);
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