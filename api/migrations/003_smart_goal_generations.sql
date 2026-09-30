CREATE TABLE IF NOT EXISTS "smart_goal_generations" (
  "session_id" UUID PRIMARY KEY,
  "generation_json" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "smart_goal_generations" ENABLE ROW LEVEL SECURITY;