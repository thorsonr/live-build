-- Migration: Add preferred_model column to users table + update default AI model
-- Run after deploying the code changes for prompt streamlining + BYOK model switching

-- Add preferred_model column for BYOK users to choose their model
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_model TEXT;

-- Update platform default model from Sonnet to Haiku 4.5
UPDATE platform_config
SET value = '"claude-haiku-4-5-20251001"', updated_at = now()
WHERE key = 'ai_model';

-- If no ai_model row exists yet, insert it
INSERT INTO platform_config (key, value, updated_at)
VALUES ('ai_model', '"claude-haiku-4-5-20251001"', now())
ON CONFLICT (key) DO NOTHING;

-- Fix ai_insights constraint to include 'full_analysis'
ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_insight_type_check;
ALTER TABLE ai_insights ADD CONSTRAINT ai_insights_insight_type_check
  CHECK (insight_type IN ('outreach_draft', 'network_strategy', 'content_coach', 'full_analysis'));

-- Make password_hash nullable (Supabase Auth handles passwords, not this table)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
