-- =========================================================================
-- Migration: 005_literature_pages_and_assessment_duration.sql
-- Description: Records how many pages each literature is and how long AI
--              assessment takes for each from receiving to finishing in seconds.
-- =========================================================================

-- 1. Ensure page count and duration in seconds on uploaded_documents
ALTER TABLE "uploaded_documents"
ADD COLUMN IF NOT EXISTS "page_count"                  INTEGER,
ADD COLUMN IF NOT EXISTS "assessment_duration_seconds" NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS "scoring_duration_seconds"    NUMERIC(10, 2);

-- 2. Add duration in seconds to assessment_timings
ALTER TABLE "assessment_timings"
ADD COLUMN IF NOT EXISTS "assessment_duration_seconds" NUMERIC(10, 2);

-- 3. Backfill assessment_duration_seconds from scoring_duration_ms or timestamps if available
UPDATE "uploaded_documents"
SET "assessment_duration_seconds" = ROUND(("scoring_duration_ms"::NUMERIC / 1000.0), 2),
    "scoring_duration_seconds"    = ROUND(("scoring_duration_ms"::NUMERIC / 1000.0), 2)
WHERE "assessment_duration_seconds" IS NULL
  AND "scoring_duration_ms" IS NOT NULL;

UPDATE "uploaded_documents"
SET "assessment_duration_seconds" = ROUND(EXTRACT(EPOCH FROM ("scoring_completed_at" - "scoring_started_at"))::NUMERIC, 2),
    "scoring_duration_seconds"    = ROUND(EXTRACT(EPOCH FROM ("scoring_completed_at" - "scoring_started_at"))::NUMERIC, 2)
WHERE "assessment_duration_seconds" IS NULL
  AND "scoring_completed_at" IS NOT NULL
  AND "scoring_started_at" IS NOT NULL;

UPDATE "assessment_timings"
SET "assessment_duration_seconds" = ROUND(("assessment_ms"::NUMERIC / 1000.0), 2)
WHERE "assessment_duration_seconds" IS NULL
  AND "assessment_ms" IS NOT NULL;
