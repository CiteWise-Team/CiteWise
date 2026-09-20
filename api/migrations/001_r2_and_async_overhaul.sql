-- =========================================================================
-- Migration: 001_r2_and_async_overhaul.sql
-- Description: Adds R2 object keys and supports async draft generation
-- =========================================================================

-- 1. Add Cloudflare R2 object keys to uploaded_documents
ALTER TABLE "uploaded_documents" 
ADD COLUMN IF NOT EXISTS "r2_file_key" TEXT,
ADD COLUMN IF NOT EXISTS "r2_text_key" TEXT;

-- 2. Relax NOT NULL constraint on generated_draft.content_text so that an initial
-- row with validation_status = 'GENERATING' can be created before synthesis finishes.
ALTER TABLE "generated_draft" 
ALTER COLUMN "content_text" DROP NOT NULL;

-- 3. Ensure indexing on session_id for fast lookups during async polling
CREATE INDEX IF NOT EXISTS "idx_uploaded_documents_session_scoring" 
ON "uploaded_documents" (session_id, scoring_status);

CREATE INDEX IF NOT EXISTS "idx_generated_draft_session" 
ON "generated_draft" (session_id);
