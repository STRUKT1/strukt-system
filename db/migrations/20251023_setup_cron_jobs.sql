-- =========================================================
-- AI Coach CRON Jobs Setup
-- Migration: 20251023_setup_cron_jobs
-- =========================================================
-- 
-- This migration sets up CRON jobs for AI Coach Edge Functions:
-- 1. generateWeeklyDigest - Weekly summaries (Sundays 8 PM UTC)
-- 2. checkUserStatus - Daily proactive checks (Daily 8 AM UTC)
--
-- Prerequisites:
-- - pg_cron extension must be enabled
-- - Edge Functions must be deployed first
-- - Replace placeholder values before running
-- =========================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =========================================================
-- CRON Job 1: Generate Weekly Digest
-- =========================================================
-- Schedule: Every Sunday at 20:00 UTC (8 PM London GMT / 9 PM BST)
-- Purpose: Generate weekly summaries for all active users
-- =========================================================

SELECT cron.schedule(
  'generate-weekly-digest',           -- Job name
  '0 20 * * SUN',                     -- CRON expression (Sundays at 8 PM UTC)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generateWeeklyDigest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =========================================================
-- CRON Job 2: Check User Status
-- =========================================================
-- Schedule: Daily at 08:00 UTC (8 AM London GMT / 9 AM BST)
-- Purpose: Detect stress patterns and queue proactive notifications
-- =========================================================

SELECT cron.schedule(
  'check-user-status',                -- Job name
  '0 8 * * *',                        -- CRON expression (Daily at 8 AM UTC)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/checkUserStatus',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =========================================================
-- Verification Queries
-- =========================================================

-- View all scheduled jobs
-- SELECT * FROM cron.job ORDER BY jobname;

-- View job execution history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =========================================================
-- Management Commands (Commented - use as needed)
-- =========================================================

-- Unschedule jobs (use if you need to remove/update)
-- SELECT cron.unschedule('generate-weekly-digest');
-- SELECT cron.unschedule('check-user-status');

-- Update job schedule (alternative: unschedule then reschedule)
-- SELECT cron.alter_job(
--   job_id := (SELECT jobid FROM cron.job WHERE jobname = 'generate-weekly-digest'),
--   schedule := '0 19 * * SUN'  -- New schedule
-- );

-- =========================================================
-- Notes
-- =========================================================
--
-- IMPORTANT: Before running this migration, replace:
--   - YOUR_PROJECT_REF with your actual Supabase project reference
--   - YOUR_SERVICE_ROLE_KEY with your actual service role key
--
-- Timezone Notes:
--   - All CRON schedules run in UTC
--   - London time: GMT (UTC+0) in winter, BST (UTC+1) in summer
--   - 8 AM UTC = 8 AM GMT (winter) or 9 AM BST (summer)
--   - 8 PM UTC = 8 PM GMT (winter) or 9 PM BST (summer)
--
-- Testing:
--   - Test functions manually before scheduling:
--     supabase functions invoke generateWeeklyDigest
--     supabase functions invoke checkUserStatus
--
-- Monitoring:
--   - View job run history: SELECT * FROM cron.job_run_details;
--   - View Edge Function logs: supabase functions logs <function-name>
--
-- Troubleshooting:
--   - If jobs don't run, check pg_cron is enabled
--   - Verify Edge Functions are deployed
--   - Check service role key has correct permissions
--   - View logs for error details
--
-- =========================================================
