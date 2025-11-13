-- Migration: Schedule weekly cleanup of old embeddings
-- Security Audit P0-4: Automate retention policy enforcement
-- Date: 2025-11-13
-- Schedule: Every Sunday at 3:00 AM UTC

-- Schedule the cleanup job (weekly)
SELECT cron.schedule(
  'cleanup-old-embeddings-weekly',
  '0 3 * * 0',  -- Every Sunday at 3:00 AM UTC
  $$
  SELECT cleanup_old_embeddings();
  $$
);

-- Verify the CRON job was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'cleanup-old-embeddings-weekly'
  ) THEN
    RAISE EXCEPTION 'CRON job creation failed: cleanup-old-embeddings-weekly not found';
  END IF;

  RAISE NOTICE 'CRON job successfully created: cleanup-old-embeddings-weekly';
END $$;

-- Add comment to cron.job entry
COMMENT ON EXTENSION pg_cron IS
'Scheduled jobs include: cleanup-old-embeddings-weekly (Sundays 3 AM UTC) - Deletes log_embeddings older than 90 days';
