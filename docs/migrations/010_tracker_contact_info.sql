-- Add email and phone fields to engagement tracker
ALTER TABLE engagement_tracker ADD COLUMN contact_email TEXT;
ALTER TABLE engagement_tracker ADD COLUMN contact_phone TEXT;
