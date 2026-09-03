import fetch from "node-fetch";
import FormData from "form-data";
import supabase from "../../common/config/supabaseClient.js";
import { isR2Configured, uploadPdfToR2, getPresignedDownloadUrl } from "../../common/config/r2Client.js";

/**
 * Trigger n8n workflow with a file
 * @param {Buffer|Stream} file - uploaded file
 * @param {string} filename - original file name
 */
export async function triggerExtractorWorkflow(file, filename) {
  const webhookUrl = process.env.N8N_EXTRACTOR_WEBHOOK;

  try {
    const formData = new FormData();
    formData.append("file", file, filename);

    const res = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    // Read body as text first — n8n returns an empty body when the workflow
    // errors mid-run (before the Respond to Webhook node fires), which causes
    // res.json() to throw "Unexpected end of JSON input".
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`n8n webhook failed: ${res.status} ${text}`);
    }

    if (!text || !text.trim()) {
      throw new Error(
        "n8n workflow did not return a response. " +
        "The workflow may have errored before reaching the Respond node. " +
        "Check the n8n execution log for details."
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`n8n returned invalid JSON: ${text.slice(0, 200)}`);
    }

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
 * Uploads the original PDF to Cloudflare R2 (or Supabase Storage as fallback)
 * so it survives page refreshes and avoids Supabase database / storage limits.
 */
export async function uploadExtractorFileToStorage(group_id, file, filename) {
  const safeName = (filename || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const r2Key = `catalyst/${group_id}/${Date.now()}-${safeName}`;

  if (isR2Configured) {
    try {
      await uploadPdfToR2(file, r2Key, "application/pdf");
      const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
      const fileUrl = publicBase
        ? `${publicBase}/${r2Key}`
        : `/api/extractor/file/view?key=${encodeURIComponent(r2Key)}`;

      console.info(`[extractor] Uploaded "${filename}" to Cloudflare R2 (${r2Key})`);
      return { fileUrl, fileName: filename || safeName, r2Key };
    } catch (r2Err) {
      console.warn("[extractor] R2 upload failed, falling back to Supabase Storage:", r2Err.message);
    }
  }

  // Graceful fallback to Supabase Storage
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
