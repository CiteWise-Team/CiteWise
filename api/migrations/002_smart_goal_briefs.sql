CREATE TABLE IF NOT EXISTS "smart_goal_briefs" (
  "session_id" UUID PRIMARY KEY,
  "brief_version" INTEGER NOT NULL,
  "context_fingerprint" TEXT NOT NULL,
  "input_fingerprint" TEXT NOT NULL,
  "brief_json" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "smart_goal_briefs" ENABLE ROW LEVEL SECURITY;