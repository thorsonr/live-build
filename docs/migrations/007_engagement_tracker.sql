-- Migration 007: Engagement Tracker table
-- Adds a mini-CRM for Max/BYOK users to track outreach pipeline

CREATE TABLE engagement_tracker (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT NOT NULL,
  contact_company TEXT,
  contact_position TEXT,
  status TEXT NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified','contacted','replied','meeting','closed','parked')),
  notes TEXT,
  last_action_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE engagement_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tracker" ON engagement_tracker
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_tracker_user ON engagement_tracker(user_id);
