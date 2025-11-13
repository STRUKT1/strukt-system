-- Migration: Add retention policy for log_embeddings
-- Security Audit P0-4: Implement automatic deletion of old embeddings
-- Date: 2025-11-13
-- Retention Period: 90 days

-- Create function to cleanup old embeddings
CREATE OR REPLACE FUNCTION cleanup_old_embeddings()
RETURNS TABLE (
  deleted_count INTEGER,
  oldest_deleted TIMESTAMPTZ,
  execution_time INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_oldest_deleted TIMESTAMPTZ;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_start_time := NOW();

  -- Get the oldest record we're about to delete (for logging)
  SELECT MIN(created_at) INTO v_oldest_deleted
  FROM log_embeddings
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Delete embeddings older than 90 days
  WITH deleted AS (
    DELETE FROM log_embeddings
    WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  v_end_time := NOW();

  -- Log the cleanup operation
  INSERT INTO admin.system_cron_logs (
    function_name,
    execution_time,
    status,
    details
  ) VALUES (
    'cleanup_old_embeddings',
    v_start_time,
    'success',
    jsonb_build_object(
      'deleted_count', v_deleted_count,
      'oldest_deleted', v_oldest_deleted,
      'execution_duration_ms', EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000,
      'retention_days', 90
    )
  );

  -- Return results
  RETURN QUERY SELECT
    v_deleted_count,
    v_oldest_deleted,
    v_end_time - v_start_time;
END;
$$;

-- Add comment
COMMENT ON FUNCTION cleanup_old_embeddings() IS
'Deletes log_embeddings older than 90 days for GDPR compliance. Logs cleanup activity to admin.system_cron_logs. Returns count of deleted records.';

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION cleanup_old_embeddings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_embeddings() TO service_role;
