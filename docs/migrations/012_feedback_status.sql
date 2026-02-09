-- Migration 012: Add status column to feedback table
-- Run in Supabase SQL Editor

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

-- Allow admins to update feedback status via service role (already bypasses RLS)
