import fetch from "node-fetch";
import supabase from "../../common/config/supabaseClient.js";
import { json } from "express";

export async function triggerSummarizerWorkflow(data) {
    // const webhookUrl = process.env.N8N_SUMMARIZER_WEBHOOK_URL;
    const webhookUrl = process.env.N8N_SUMMARIZER_PROD_WEBHOOK_URL;

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
export async function insertSummarizerRepo(groupId, summarizedData) {
  try {
    const {
      title,
      introduction,
      literature_review,
      methodology,
      discussion,
      results,
      conclusion,
    } = summarizedData;

    const { data, error } = await supabase
      .from("Summary")
      .insert([
        {
          title:title,
          group_id: groupId,
          introduction,
          literature_review,
          methodology,
          discussion,
          results,
          conclusion,
        },
      ])
      .select()
      .single();
 
    if (error) {
      throw new Error("Failed to insert summarizer result: " + error.message);
    }

    return data;
  } catch (err) {
    console.error("Summarizer repo error:", err);
    throw err;
  }
}

export async function getSummaryByGroupIdRepo(group_id){
    try {
    const { data, error } = await supabase
      .from("Summary")
      .select("*")
      .eq("group_id", group_id)
      
    if (error) {
      throw new Error("Summary data not found for group: " + error.message);
    }
    return data;
  } catch (err) {
    console.error("Summary Repo Error:", err);
    throw err;
  }

}
export async function getSummaryByIdRepo(id){
  try{
    const {data, error} = await supabase
    .from("Summary")
    .select("*")
    .eq("id", id)
    .single()

    if(error){
      throw new Error("Summary data not found for ID: "+ id)
    }
    return data;
  } catch(err){
    console.error("Summary Repo Error: ",err);
    throw err;
  }
}