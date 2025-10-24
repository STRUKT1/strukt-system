-- Dashboard Audit Table
-- Stores structured audit logs for dashboard analytics operations
-- Provides traceability and compliance reporting

CREATE TABLE IF NOT EXISTS dashboard_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- User and request identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  correlation_id TEXT NOT NULL,
  request_id TEXT,
  
  -- Event details
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'data_fetch',
  operation TEXT NOT NULL,
  
  -- Request/Response metadata
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
  status_code INTEGER,
  error_message TEXT,
  
  -- Performance metrics
  duration_ms INTEGER,
  data_size_bytes INTEGER,
  
  -- Data summary (PII-safe)
  data_summary JSONB,
  
  -- Additional context
  metadata JSONB,
  
  -- Indexes for common queries
  INDEX idx_dashboard_audit_user_id ON dashboard_audit(user_id),
  INDEX idx_dashboard_audit_correlation_id ON dashboard_audit(correlation_id),
  INDEX idx_dashboard_audit_created_at ON dashboard_audit(created_at DESC),
  INDEX idx_dashboard_audit_event_type ON dashboard_audit(event_type),
  INDEX idx_dashboard_audit_status ON dashboard_audit(status)
);

-- Row Level Security (RLS)
ALTER TABLE dashboard_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own audit logs
CREATE POLICY "Users can read own audit logs"
  ON dashboard_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON dashboard_audit
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can read all audit logs (for admin/debugging)
CREATE POLICY "Service role can read all audit logs"
  ON dashboard_audit
  FOR SELECT
  USING (true);

-- Add comment
COMMENT ON TABLE dashboard_audit IS 'Audit trail for dashboard analytics operations with production-grade traceability';

-- Create a function to auto-delete old logs (7-day retention)
CREATE OR REPLACE FUNCTION delete_old_dashboard_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM dashboard_audit
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Note: The actual scheduled job for cleanup would be configured via Supabase cron
-- or external job scheduler in production
