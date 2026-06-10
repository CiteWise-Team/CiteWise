import fetch from 'node-fetch'
import supabase from "../../common/config/supabaseClient.js";

export async function triggerGapExtractorWorkflow(data) {
    const webhookUrl = process.env.N8N_GAPEXTRACTOR_PROD_WEBHOOK_URL;
    // const webhookUrl = process.env.N8N_GAPEXTRACTOR_TEST_WEBHOOK_URL;

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

export async function insertDataToGapRepository(group_id,title, gapResults){
    try {
        const {
        gaps,keywords
        } = gapResults;
        const { data, error } = await supabase
            .from("GapResult")
            .insert([
                {
                group_id:group_id,
                title:title,
                gap:gaps,
                keywords:keywords
                },
            ])
            .select()
            .single();

        if (error) {
        throw new Error("Failed to insert gap result: " + error.message);
        }

        return data;
    } catch (err) {
        console.error("Gaps repo error:", err);
        throw err;
    }
}
export async function getGapUsingGroupIdRepo(group_id){
    try {
        const { data, error } = await supabase
            .from("GapResult")
            .select("*")
            .eq("group_id", group_id)
      
        if (error) {
        throw new Error("Gap result data not found for group: " + error.message);
        }
        return data;
    } catch (err) {
        console.error("Gap Repo Error:", err);
        throw err;
    }

}