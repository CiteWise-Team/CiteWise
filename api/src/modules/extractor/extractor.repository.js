import fetch from "node-fetch";
import FormData from "form-data";
import supabase from "../../common/config/supabaseClient.js";

/**
 * Trigger n8n workflow with a file
 * @param {Buffer|Stream} file - uploaded file
 * @param {string} filename - original file name
 */
export async function   triggerExtractorWorkflow(file, filename) {
  const webhookUrl = process.env.N8N_EXTRACTOR_WEBHOOK;
  // const webhookUrl = process.env.N8N_EXTRACTOR_TEST_WEBHOOK;

  try {
    const formData = new FormData();
    formData.append("file", file, filename);

    const res = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(), // multipart/form-data headers
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`n8n webhook failed: ${res.status} ${text}`);
    }

    const data = await res.json(); 
    return data;
  } catch (err) {
    console.error("Workflow repo error:", err);
    throw err;
  }
}

export async function insertExtractorRepo(group_id, extractedData, fileMeta = null) {
  try {
    const {
      title,
      abstract,
      introduction,
      methodology,
      discussion,
      results,
      conclusion,
      keywords,
    } = extractedData;

    // special mapping for the weird key
    const literature_review = extractedData["literature review"];

    const { data, error } = await supabase
      .from("Extractor")
      .insert([
        {
          group_id: group_id,
          title,
          abstract,
          introduction,
          literature_review,  // clean DB column
          methodology,
          discussion,
          results,
          conclusion,
          keywords,
          file_url: fileMeta?.fileUrl || null,
          file_name: fileMeta?.fileName || null,
        },
      ])
      .select()
      .single();
    // const data = {yay:group_id}
    if (error) {
      throw new Error("Failed to insert extractor result: " + error.message);
    }

    return data;
  } catch (err) {
    console.error("Extractor Repo Error:", err);
    throw err;
  }
}

const EXTRACTOR_BUCKET = process.env.SUPABASE_EXTRACTOR_BUCKET || "extractor-files";

/**
 * Uploads the original PDF to Supabase Storage so it survives page refreshes
 * (previously only the extracted text fields were persisted).
 */
export async function uploadExtractorFileToStorage(group_id, file, filename) {
  const safeName = (filename || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${group_id}/${Date.now()}-${safeName}`;

  const doUpload = () =>
    supabase.storage.from(EXTRACTOR_BUCKET).upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  let { error } = await doUpload();

  if (error && /bucket not found/i.test(error.message || "")) {
    const { error: createError } = await supabase.storage.createBucket(EXTRACTOR_BUCKET, {
      public: true,
    });
    if (createError && !/already exists/i.test(createError.message || "")) {
      throw new Error("Failed to create storage bucket: " + createError.message);
    }
    ({ error } = await doUpload());
  }

  if (error) {
    throw new Error("Failed to upload file to storage: " + error.message);
  }

  const { data: publicUrlData } = supabase.storage.from(EXTRACTOR_BUCKET).getPublicUrl(path);

  return { fileUrl: publicUrlData?.publicUrl || null, fileName: filename || safeName };
}

export async function getExtractorDataByGroupIdRepo(groupId) {
  try {
    const { data, error } = await supabase
      .from("Extractor")
      .select("*")
      .eq("group_id", groupId)
      
    if (error) {
      throw new Error("Extractor data not found for group: " + error.message);
    }
    return data;
  } catch (err) {
    console.error("Get Extractor Repo Error:", err);
    throw err;
  }
}
export async function getExtractedDataByIdRepo(id) {
  try {
    const { data, error } = await supabase
      .from("Extractor")
      .select("*")
      .eq("id", id)
      .single();  
    if (error) {
      throw new Error("Extractor data not found for id: " + error.message);
    }
    return data;
  }
  catch (err) {
    console.error("Get Extractor by ID Repo Error:", err);
    throw err;
  }
}
