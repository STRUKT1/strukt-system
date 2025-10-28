-- =========================================================
-- System CRON Logs Table
-- Migration: 20251028_create_system_cron_logs
-- =========================================================
-- Tracks execution of scheduled Edge Functions (CRON jobs)
-- Provides monitoring, debugging, and reliability tracking

CREATE TABLE IF NOT EXISTS public.system_cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  run_status TEXT NOT NULL CHECK (run_status IN ('success', 'error', 'partial_success')),
  run_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB,
  
  -- Performance metrics
  duration_ms INTEGER,
  attempts INTEGER DEFAULT 1,
  
  -- Error tracking
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_system_cron_logs_function_name 
  ON public.system_cron_logs(function_name);

CREATE INDEX IF NOT EXISTS idx_system_cron_logs_run_time 
  ON public.system_cron_logs(run_time DESC);

CREATE INDEX IF NOT EXISTS idx_system_cron_logs_run_status 
  ON public.system_cron_logs(run_status);

-- Enable Row Level Security
ALTER TABLE public.system_cron_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert logs
CREATE POLICY service_role_can_insert_cron_logs
  ON public.system_cron_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Service role can view all logs (for monitoring)
CREATE POLICY service_role_can_view_all_cron_logs
  ON public.system_cron_logs
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.system_cron_logs IS 'Execution logs for scheduled CRON jobs and Edge Functions. Tracks success/failure, performance metrics, and error details.';
COMMENT ON COLUMN public.system_cron_logs.function_name IS 'Name of the Edge Function that was executed';
COMMENT ON COLUMN public.system_cron_logs.run_status IS 'Execution status: success, error, or partial_success';
COMMENT ON COLUMN public.system_cron_logs.run_time IS 'When the function was executed';
COMMENT ON COLUMN public.system_cron_logs.details IS 'JSON details about execution (e.g., users processed, notifications sent)';
COMMENT ON COLUMN public.system_cron_logs.duration_ms IS 'Execution duration in milliseconds';
COMMENT ON COLUMN public.system_cron_logs.attempts IS 'Number of retry attempts made';
COMMENT ON COLUMN public.system_cron_logs.error_message IS 'Error message if execution failed';
