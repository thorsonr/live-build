-- Migration 013: Fix SECURITY DEFINER views
-- Supabase linter flags admin_analytics and admin_usage as SECURITY DEFINER views.
-- Recreate them with security_invoker = true so RLS of the querying role applies.
-- These views are only queried via supabaseAdmin (service role), so no functional change.

-- Drop and recreate admin_analytics with security_invoker
DROP VIEW IF EXISTS admin_analytics;
CREATE VIEW admin_analytics
WITH (security_invoker = true)
AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscriptions
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Drop and recreate admin_usage with security_invoker
DROP VIEW IF EXISTS admin_usage;
CREATE VIEW admin_usage
WITH (security_invoker = true)
AS
SELECT
  DATE(created_at) as date,
  feature,
  COUNT(*) as call_count,
  SUM(tokens_in) as total_tokens_in,
  SUM(tokens_out) as total_tokens_out,
  SUM(cost_cents) as total_cost_cents
FROM usage_logs
GROUP BY DATE(created_at), feature
ORDER BY date DESC;
