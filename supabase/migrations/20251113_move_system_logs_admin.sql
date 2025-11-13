-- Migration: Move system_cron_logs to admin schema
-- Security Audit P0-3: Prevent unauthorized access to system logs
-- Date: 2025-11-13

-- Create admin schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS admin;

-- Move system_cron_logs table to admin schema
ALTER TABLE IF EXISTS public.system_cron_logs SET SCHEMA admin;

-- Revoke all access from public
REVOKE ALL ON admin.system_cron_logs FROM PUBLIC;
REVOKE ALL ON admin.system_cron_logs FROM authenticated;
REVOKE ALL ON admin.system_cron_logs FROM anon;

-- Grant full access only to service_role
GRANT ALL ON admin.system_cron_logs TO service_role;

-- Add comment to table
COMMENT ON TABLE admin.system_cron_logs IS
'System CRON job execution logs. Admin-only access for security. Contains system metrics and execution history.';

-- Verify the table was moved (this will fail if table doesn't exist in admin schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'admin'
    AND table_name = 'system_cron_logs'
  ) THEN
    RAISE EXCEPTION 'Migration failed: system_cron_logs not found in admin schema';
  END IF;
END $$;
