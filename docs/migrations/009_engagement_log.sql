-- Add engagement log (JSONB array) to engagement_tracker
-- Each entry: {date: "2026-02-06", type: "Email"|"Call"|"Text"|"In-Person"|"LinkedIn"|"Other"}
ALTER TABLE engagement_tracker ADD COLUMN engagement_log JSONB DEFAULT '[]';
