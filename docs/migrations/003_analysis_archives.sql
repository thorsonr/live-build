-- Migration 003: Analysis Archives
-- Stores snapshots of past analyses so users can view history after clearing data

CREATE TABLE analysis_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_count INT,
  ai_analysis JSONB,
  analytics_summary JSONB,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_archives_user ON analysis_archives(user_id);

-- RLS policies
ALTER TABLE analysis_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archives"
  ON analysis_archives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own archives"
  ON analysis_archives FOR DELETE
  USING (auth.uid() = user_id);
