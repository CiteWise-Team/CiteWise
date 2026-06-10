import { insertDataToTopicRepository, triggerTopicSuggesterWorkflow, fetchTopicDataByGroupIdRepo } from "./topic.repository.js";
export async function runTopicSuggesterService(data){
    if(!data){
        return { status: 400, message: "Data is required"};
    }
    // return { status: 400, message: "Data is required"};
    try{
        const topic = await triggerTopicSuggesterWorkflow(data.gaps);
        
       
        const insertedTopic = await insertDataToTopicRepository(data.group_id,topic);
        return {
            status: 200,
            message: "Topic service completed",
            data: insertedTopic,
        };
    }catch(err){
        console.error("Service error: ",err);
        return {
        status: 500,
        message: "Failed to trigger workflow: " + err.message,
        };        
    }

}

export async function fetchTopicsByGroupIdService(group_id){
    try {
        const data = await fetchTopicDataByGroupIdRepo(group_id);
        if (!data || data.length === 0) {
            return { status: 404, message: "No data found for the given group ID" };
        }
        return { status: 200, message: "Data retrieved successfully", data: data };
    } catch (err) {
        console.error("Service error:", err);
        return { status: 500, message: "Failed to retrieve data: " + err.message };
    }
}