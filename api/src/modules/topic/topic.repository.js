import fetch from 'node-fetch'
import supabase from "../../common/config/supabaseClient.js";

export async function triggerTopicSuggesterWorkflow(data) {
    const webhookUrl = process.env.N8N_TOPIC_PROD_WEBHOOK_URL;
    // const webhookUrl = process.env.N8N_TOPIC_TEST_WEBHOOK_URL;

    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to trigger workflow: ${res.status} - ${errorText}`);
    }
    const result = await res.json();
    return result

}

export async function insertDataToTopicRepository(group_id,topicResult){
    try {
        const {
        topic,rationale
        } = topicResult;
        const { data, error } = await supabase
            .from("Topic")
            .insert([
                {
                group_id:group_id,
                title:topic,
                rationale: rationale
                },
            ])
            .select()
            .single();
        if (error) {
        throw new Error("Failed to insert topic result: " + error.message);
        }

        return data;
    } catch (err) {
        console.error("Topic repo error:", err);
        throw err;
    }
}

export async function fetchTopicDataByGroupIdRepo(group_id){
    try {
        const { data, error } = await supabase
        .from("Topic")
        .select("*")
        .eq("group_id", group_id)
        
        if (error) {
        throw new Error("Topic data not found for group: " + error.message);
        }
        return data;
  } catch (err) {
    console.error("Topic Repo Error:", err);
    throw err;
  }

}
