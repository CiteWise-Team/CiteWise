-- =========================================================================
-- Migration: 007_validation_evidence_telemetry.sql
-- Description: Closes remaining T2, T3, T6, T7, T8, and Questions B/C/F
--              validation evidence gaps:
--                - T2: import_fidelity_json snapshot on research_baselines
--                - Question C: user_id on research_baselines & uploaded_documents
--                - T3: independent extraction_status on uploaded_documents +
--                      upload_rejections table for rejected pre-insert files
--                - Question B: approved_at on uploaded_documents &
--                              generation_completed_at on generated_draft
--                - T6: gaps_used_json & primary_focus_gap on generated_draft
--                - T7/T8/F: rrl_usage_json on generated_draft +
--                           immutable draft_snapshots table for as-generated
--                           evidence preservation and server-side history
-- =========================================================================

-- 1. Participant linking (Question C) & T2 source import fidelity snapshot
ALTER TABLE "research_baselines"
ADD COLUMN IF NOT EXISTS "user_id"              TEXT,
ADD COLUMN IF NOT EXISTS "import_fidelity_json" JSONB;

CREATE INDEX IF NOT EXISTS "idx_research_baselines_user_id"
ON "research_baselines" ("user_id");

-- 2. Participant linking (Question C), independent T3 extraction_status, and approval timestamp (Question B)
ALTER TABLE "uploaded_documents"
ADD COLUMN IF NOT EXISTS "user_id"           TEXT,
ADD COLUMN IF NOT EXISTS "extraction_status" TEXT,        -- 'OK' | 'EMPTY_TEXT' | 'EXTRACTION_FAILED' | 'EXTRACTING'
ADD COLUMN IF NOT EXISTS "approved_at"       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "idx_uploaded_documents_user_id"
ON "uploaded_documents" ("user_id");

-- 3. T3 rejected pre-insert upload log (recovers full parse-rate denominator)
CREATE TABLE IF NOT EXISTS "upload_rejections" (
  "id"               BIGSERIAL PRIMARY KEY,
  "session_id"       TEXT NOT NULL,
  "user_id"          TEXT,
  "file_name"        TEXT NOT NULL,
  "size_bytes"       BIGINT,
  "mime_type"        TEXT,
  "rejection_reason" TEXT NOT NULL, -- 'UNSUPPORTED_TYPE' | 'OVERSIZE' | 'EMPTY' | 'INVALID_MAGIC_BYTES' | 'DUPLICATE_FILENAME' | 'DUPLICATE_HASH'
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_upload_rejections_session"
ON "upload_rejections" ("session_id", "created_at" DESC);

-- 4. T6 gap provenance, positive rrlUsage persistence (Fix #15), and generation completion timestamp (Question B)
ALTER TABLE "generated_draft"
ADD COLUMN IF NOT EXISTS "gaps_used_json"          JSONB,
ADD COLUMN IF NOT EXISTS "primary_focus_gap"       TEXT,
ADD COLUMN IF NOT EXISTS "rrl_usage_json"          JSONB,
ADD COLUMN IF NOT EXISTS "generation_completed_at" TIMESTAMPTZ;

-- 5. T7/T8/F immutable draft_snapshots (preserves as-generated draft before regenerate/edits + server-side version history)
CREATE TABLE IF NOT EXISTS "draft_snapshots" (
  "id"                         BIGSERIAL PRIMARY KEY,
  "session_id"                 TEXT NOT NULL,
  "user_id"                    TEXT,
  "version_number"             INTEGER NOT NULL DEFAULT 1,
  "snapshot_type"              TEXT NOT NULL, -- 'generated' | 'pre_regenerate' | 'manual_save' | 'paraphrase_accept'
  "validation_status"          TEXT,
  "content_text"               TEXT,
  "references_text"            TEXT,
  "background_text"            TEXT,
  "rationale_text"             TEXT,
  "gap_text"                   TEXT,
  "approved_document_ids_json" JSONB,
  "rrl_usage_json"             JSONB,
  "gaps_used_json"             JSONB,
  "primary_focus_gap"          TEXT,
  "citation_integrity_json"    JSONB,
  "apa_check_json"             JSONB,
  "gap_coverage_json"          JSONB,
  "metrics_json"               JSONB,
  "created_at"                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_draft_snapshots_session_version"
ON "draft_snapshots" ("session_id", "version_number" DESC);
