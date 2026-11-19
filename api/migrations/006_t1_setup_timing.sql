-- =========================================================================
-- Migration: 006_t1_setup_timing.sql
-- Description: Adds T1 setup-time telemetry columns to research_baselines
--              for comparing automated CATalyst import ('auto') vs.
--              ?mode=manual entry ('manual').
-- =========================================================================

ALTER TABLE "research_baselines"
ADD COLUMN IF NOT EXISTS "setup_mode"         TEXT,
ADD COLUMN IF NOT EXISTS "setup_started_at"   TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "setup_completed_at" TIMESTAMPTZ;
