-- =========================================================================
-- Schema Migration: Extracted from Old Supabase (oiubskgsfpdecnzjbxqr)
-- Apply this in the Supabase SQL Editor for new project (pnfydokoyibonjemagyc)
-- =========================================================================

-- 1. Profile Table
CREATE TABLE IF NOT EXISTS "Profile" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Drop UUID default values before converting ID columns to BIGINT
ALTER TABLE "uploaded_documents" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "uploaded_documents" DROP CONSTRAINT IF EXISTS "uploaded_documents_pkey" CASCADE;
ALTER TABLE "uploaded_documents" ALTER COLUMN "id" TYPE BIGINT USING (
  CASE WHEN "id"::text ~ '^[0-9]+$' THEN "id"::text::bigint ELSE NULL END
);
ALTER TABLE "uploaded_documents" ADD PRIMARY KEY ("id");

ALTER TABLE "document_insights" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "document_insights" DROP CONSTRAINT IF EXISTS "document_insights_pkey" CASCADE;
ALTER TABLE "document_insights" ALTER COLUMN "id" TYPE BIGINT USING (
  CASE WHEN "id"::text ~ '^[0-9]+$' THEN "id"::text::bigint ELSE NULL END
);
ALTER TABLE "document_insights" ALTER COLUMN "document_id" TYPE BIGINT USING (
  CASE WHEN "document_id"::text ~ '^[0-9]+$' THEN "document_id"::text::bigint ELSE NULL END
);
ALTER TABLE "document_insights" ADD PRIMARY KEY ("id");

ALTER TABLE "evidence_excerpts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "evidence_excerpts" DROP CONSTRAINT IF EXISTS "evidence_excerpts_pkey" CASCADE;
ALTER TABLE "evidence_excerpts" ALTER COLUMN "id" TYPE BIGINT USING (
  CASE WHEN "id"::text ~ '^[0-9]+$' THEN "id"::text::bigint ELSE NULL END
);
ALTER TABLE "evidence_excerpts" ALTER COLUMN "document_insight_id" TYPE BIGINT USING (
  CASE WHEN "document_insight_id"::text ~ '^[0-9]+$' THEN "document_insight_id"::text::bigint ELSE NULL END
);
ALTER TABLE "evidence_excerpts" ADD PRIMARY KEY ("id");

-- 3. Make Group foreign key constraint optional or non-blocking for historical data migration
ALTER TABLE "Group" DROP CONSTRAINT IF EXISTS "Group_owner_id_fkey";

-- 4. research_baselines Columns
ALTER TABLE "research_baselines" ADD COLUMN IF NOT EXISTS "catalyst_workspace_id" TEXT;
ALTER TABLE "research_baselines" ADD COLUMN IF NOT EXISTS "project_title" TEXT;
ALTER TABLE "research_baselines" ADD COLUMN IF NOT EXISTS "rationale" TEXT;
ALTER TABLE "research_baselines" ADD COLUMN IF NOT EXISTS "research_gaps" TEXT;
ALTER TABLE "research_baselines" ADD COLUMN IF NOT EXISTS "source_system" TEXT;

-- 5. uploaded_documents Columns
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "file_hash" TEXT;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "size_bytes" BIGINT;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "character_count" BIGINT;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "uploaded_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "parsed_text" TEXT;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "scoring_started_at" TIMESTAMPTZ;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "scoring_completed_at" TIMESTAMPTZ;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "citation_metadata_json" TEXT;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "storage_path" TEXT;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "r2_file_key" TEXT;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "r2_text_key" TEXT;

-- 6. document_insights Columns
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "gap_alignment_score" DOUBLE PRECISION;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "methodology_score" DOUBLE PRECISION;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "theoretical_score" DOUBLE PRECISION;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "citation_score" DOUBLE PRECISION;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "overall_score" DOUBLE PRECISION;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "average_overall_score" DOUBLE PRECISION;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "recommendation_status" TEXT;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "confidence_level" TEXT;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "relevance_level" TEXT;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "mismatch_flags_json" TEXT;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "weakness_flags_json" TEXT;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "validation_flags_json" TEXT;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "raw_ai_response_json" TEXT;
ALTER TABLE "document_insights" ADD COLUMN IF NOT EXISTS "generated_at" TIMESTAMPTZ DEFAULT NOW();

-- 7. generated_draft Columns
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "content_text" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "references_text" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "background_text" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "rationale_text" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "gap_text" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "citations_used_json" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "validation_status" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "validation_flags_json" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "unsupported_claim_flags_json" TEXT;
ALTER TABLE "generated_draft" ADD COLUMN IF NOT EXISTS "metrics_json" TEXT;

-- 8. evidence_excerpts Columns
ALTER TABLE "evidence_excerpts" ADD COLUMN IF NOT EXISTS "quote_text" TEXT;
ALTER TABLE "evidence_excerpts" ADD COLUMN IF NOT EXISTS "page_number" BIGINT;
ALTER TABLE "evidence_excerpts" ADD COLUMN IF NOT EXISTS "relevance_level" TEXT;
ALTER TABLE "evidence_excerpts" ADD COLUMN IF NOT EXISTS "criterion" TEXT;
ALTER TABLE "evidence_excerpts" ADD COLUMN IF NOT EXISTS "evidence_type" TEXT;

-- 9. group_members Columns
ALTER TABLE "group_members" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
