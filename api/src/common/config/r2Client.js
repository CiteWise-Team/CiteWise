import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'citewise-papers';

export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey);

let s3Client = null;
if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  console.info(`[r2Client] Initialized Cloudflare R2 client for bucket "${bucketName}".`);
} else {
  console.warn('[r2Client] R2 credentials not set. Operating in graceful fallback mode (Postgres/inline storage).');
}

/**
 * Upload a PDF binary buffer to R2
 * @param {Buffer|Uint8Array} buffer 
 * @param {string} key 
 * @param {string} [mimeType='application/pdf'] 
 * @returns {Promise<{ success: boolean, key: string|null, fallback?: boolean }>}
 */
export async function uploadPdfToR2(buffer, key, mimeType = 'application/pdf') {
  if (!isR2Configured || !s3Client) {
    return { success: false, fallback: true, key: null };
  }

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }));
    return { success: true, key };
  } catch (err) {
    console.error(`[r2Client] Failed to upload PDF "${key}":`, err.message);
    throw err;
  }
}

/**
 * Upload extracted text / markdown to R2
 * @param {string} text 
 * @param {string} key 
 * @returns {Promise<{ success: boolean, key: string|null, fallback?: boolean }>}
 */
export async function uploadTextToR2(text, key) {
  if (!isR2Configured || !s3Client) {
    return { success: false, fallback: true, key: null };
  }

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(text, 'utf-8'),
      ContentType: 'text/markdown; charset=utf-8',
    }));
    return { success: true, key };
  } catch (err) {
    console.error(`[r2Client] Failed to upload text "${key}":`, err.message);
    throw err;
  }
}

/**
 * Retrieve text content from R2
 * @param {string} key 
 * @returns {Promise<string|null>}
 */
export async function getTextFromR2(key) {
  if (!isR2Configured || !s3Client || !key) {
    return null;
  }

  try {
    const res = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    return await res.Body.transformToString('utf-8');
  } catch (err) {
    console.error(`[r2Client] Failed to get text for key "${key}":`, err.message);
    return null;
  }
}

/**
 * Generate a pre-signed download URL for a file in R2
 * @param {string} key 
 * @param {number} [expiresInSeconds=3600] 
 * @returns {Promise<string|null>}
 */
export async function getPresignedDownloadUrl(key, expiresInSeconds = 3600) {
  if (!isR2Configured || !s3Client || !key) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.error(`[r2Client] Failed to sign URL for key "${key}":`, err.message);
    return null;
  }
}

/**
 * Delete an object from R2
 * @param {string} key 
 * @returns {Promise<boolean>}
 */
export async function deleteFromR2(key) {
  if (!isR2Configured || !s3Client || !key) {
    return false;
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    return true;
  } catch (err) {
    console.warn(`[r2Client] Failed to delete key "${key}":`, err.message);
    return false;
  }
}

export default {
  isR2Configured,
  uploadPdfToR2,
  uploadTextToR2,
  getTextFromR2,
  getPresignedDownloadUrl,
  deleteFromR2,
};
