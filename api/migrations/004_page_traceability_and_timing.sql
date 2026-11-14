-- =========================================================================
-- Migration: 004_page_traceability_and_timing.sql
-- Description: Page-level traceability for excerpts/citations and timing of
--              every assessment run, so processing time can be related to
--              page count.
-- =========================================================================

-- 1. Per-document page map and timing
--    page_offsets_json: character index where each PDF page starts in the
--                       extracted text (pages are 1-based by array position)
ALTER TABLE "uploaded_documents"
ADD COLUMN IF NOT EXISTS "page_count"          INTEGER,
ADD COLUMN IF NOT EXISTS "page_offsets_json"   JSONB,
ADD COLUMN IF NOT EXISTS "extraction_method"   TEXT,      -- 'local' (pdf-parse) | 'llamaparse'
ADD COLUMN IF NOT EXISTS "extraction_ms"       INTEGER,
ADD COLUMN IF NOT EXISTS "scoring_duration_ms" INTEGER;

-- 2. Whether an excerpt's page was confirmed by locating the quote in the
--    extracted text (true) or is only the AI's estimate (false)
ALTER TABLE "evidence_excerpts"
ADD COLUMN IF NOT EXISTS "page_verified" BOOLEAN DEFAULT FALSE;

-- 3. One row per assessment run (re-assessments included)
CREATE TABLE IF NOT EXISTS "assessment_timings" (
  "id"                 BIGSERIAL PRIMARY KEY,
  "document_id"        BIGINT,
  "session_id"         TEXT,
  "page_count"         INTEGER,
  "character_count"    INTEGER,
  "extraction_method"  TEXT,
  "extraction_ms"      INTEGER,
  "ai_ms"              INTEGER,      -- n8n/AI scoring call only
  "assessment_ms"      INTEGER,      -- whole scoring run, start to COMPLETE
  "total_ms"           INTEGER,      -- extraction_ms + assessment_ms
  "reused_ai_response" BOOLEAN DEFAULT FALSE, -- weight-only re-score, no AI call
  "status"             TEXT,
  "error_message"      TEXT,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_assessment_timings_pages"
ON "assessment_timings" (page_count, extraction_method);
