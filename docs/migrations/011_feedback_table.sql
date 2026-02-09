-- 011: Feedback table for user feedback submissions
-- Run in Supabase SQL Editor before deploying

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  category TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "feedback_insert_own" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Index for admin queries
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
