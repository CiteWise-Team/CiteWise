-- =========================================================================
-- Migration: 000_base_schema_reference.sql
-- Description: Idempotent base schema reference for core CiteWise tables
--              (Fix #16: makes base column definitions reviewable in VCS).
--              Safe to run on an existing database because every statement
--              uses CREATE TABLE IF NOT EXISTS.
-- =========================================================================

CREATE TABLE IF NOT EXISTS "research_baselines" (
  "id"                     BIGSERIAL PRIMARY KEY,
  "session_id"             TEXT UNIQUE NOT NULL,
  "catalyst_workspace_id"  TEXT,
  "project_title"          TEXT,
  "rationale"              TEXT,
  "research_gaps"          JSONB,
  "source_system"          TEXT DEFAULT 'CATalyst',
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "uploaded_documents" (
  "id"                      BIGSERIAL PRIMARY KEY,
  "session_id"              TEXT NOT NULL,
  "file_name"               TEXT NOT NULL,
  "file_hash"               TEXT,
  "size_bytes"              BIGINT,
  "character_count"         INTEGER DEFAULT 0,
  "uploaded_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "parsed_text"             TEXT,
  "approved"                BOOLEAN NOT NULL DEFAULT FALSE,
  "scoring_status"          TEXT DEFAULT 'PENDING',
  "scoring_started_at"      TIMESTAMPTZ,
  "scoring_completed_at"    TIMESTAMPTZ,
  "scoring_error_message"   TEXT,
  "metric_weights_json"     JSONB,
  "citation_metadata_json"  JSONB
);

CREATE TABLE IF NOT EXISTS "document_insights" (
  "id"                    BIGSERIAL PRIMARY KEY,
  "document_id"           BIGINT NOT NULL REFERENCES "uploaded_documents"("id") ON DELETE CASCADE,
  "gap_alignment_score"   DOUBLE PRECISION,
  "methodology_score"     DOUBLE PRECISION,
  "theoretical_score"     DOUBLE PRECISION,
  "citation_score"        DOUBLE PRECISION,
  "overall_score"         DOUBLE PRECISION,
  "average_overall_score" DOUBLE PRECISION,
  "recommendation_status" TEXT,
  "confidence_level"      TEXT,
  "relevance_level"       TEXT,
  "mismatch_flags_json"   TEXT,
  "weakness_flags_json"   TEXT,
  "validation_flags_json" TEXT,
  "raw_ai_response_json"  TEXT,
  "generated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "evidence_excerpts" (
  "id"                  BIGSERIAL PRIMARY KEY,
  "document_insight_id" BIGINT NOT NULL REFERENCES "document_insights"("id") ON DELETE CASCADE,
  "quote_text"          TEXT NOT NULL,
  "page_number"         INTEGER,
  "relevance_level"     TEXT,
  "criterion"           TEXT,
  "evidence_type"       TEXT,
  "display_order"       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "generated_draft" (
  "id"                           BIGSERIAL PRIMARY KEY,
  "session_id"                   TEXT NOT NULL,
  "content_text"                 TEXT,
  "references_text"              TEXT,
  "background_text"              TEXT,
  "rationale_text"               TEXT,
  "gap_text"                     TEXT,
  "citations_used_json"          TEXT,
  "validation_status"            TEXT DEFAULT 'PASSED',
  "validation_flags_json"        TEXT,
  "unsupported_claim_flags_json" TEXT,
  "metrics_json"                 TEXT,
  "created_at"                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "mvp_validation_logs" (
  "id"              BIGSERIAL PRIMARY KEY,
  "test_run_id"     TEXT NOT NULL,
  "metric_name"     TEXT NOT NULL,
  "expected_target" TEXT,
  "actual_result"   TEXT,
  "raw_data_json"   JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
