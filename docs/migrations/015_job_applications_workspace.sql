-- Migration 015: Unified Job Applications workspace
-- Supports LinkedIn-imported and manually tracked external applications

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  external_key TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'linkedin_export'
    CHECK (source IN ('linkedin_export', 'external_manual', 'external_url')),
  company_name TEXT NOT NULL,
  company_website TEXT,
  job_title TEXT NOT NULL,
  job_url TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('saved', 'applied', 'screen', 'interview', 'final', 'offer', 'rejected', 'withdrawn', 'closed')),
  applied_via TEXT,
  application_date TIMESTAMPTZ,
  saved_date TIMESTAMPTZ,
  follow_up_date DATE,
  hiring_manager TEXT,
  recruiter_name TEXT,
  recruiter_contact TEXT,
  resume_name TEXT,
  question_count INT,
  screening_summary TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  last_action_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, external_key)
);

CREATE INDEX IF NOT EXISTS idx_job_apps_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_status ON job_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_apps_source ON job_applications(user_id, source);
CREATE INDEX IF NOT EXISTS idx_job_apps_company ON job_applications(user_id, company_name);
CREATE INDEX IF NOT EXISTS idx_job_apps_follow_up ON job_applications(user_id, follow_up_date);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own job applications" ON job_applications;
CREATE POLICY "Users manage own job applications" ON job_applications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
