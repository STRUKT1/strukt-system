-- =========================================================
-- AI Coach Logs Table
-- Migration: 20251022_create_ai_coach_logs_table
-- =========================================================

-- Create ai_coach_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.ai_coach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  token_usage INTEGER,
  issues TEXT[],
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_coach_logs_user_id 
  ON public.ai_coach_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_coach_logs_timestamp 
  ON public.ai_coach_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_coach_logs_session_id 
  ON public.ai_coach_logs(session_id);

-- Enable Row Level Security
ALTER TABLE public.ai_coach_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own logs
CREATE POLICY user_can_view_own_logs
  ON public.ai_coach_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert logs
CREATE POLICY service_role_can_insert_logs
  ON public.ai_coach_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Service role can view all logs (for admin/debugging)
CREATE POLICY service_role_can_view_all_logs
  ON public.ai_coach_logs
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.ai_coach_logs IS 'Audit log for all AI coach interactions. Tracks user messages, AI responses, success status, and any safety issues detected.';
COMMENT ON COLUMN public.ai_coach_logs.user_id IS 'Reference to the user who initiated the interaction';
COMMENT ON COLUMN public.ai_coach_logs.session_id IS 'Session or conversation identifier for grouping related interactions';
COMMENT ON COLUMN public.ai_coach_logs.user_message IS 'The user''s input message (truncated to 2000 chars)';
COMMENT ON COLUMN public.ai_coach_logs.ai_response IS 'The AI''s generated response (truncated to 5000 chars)';
COMMENT ON COLUMN public.ai_coach_logs.success IS 'Whether the interaction completed successfully';
COMMENT ON COLUMN public.ai_coach_logs.token_usage IS 'Number of tokens used for this interaction';
COMMENT ON COLUMN public.ai_coach_logs.issues IS 'Array of safety issues detected in the response, if any';
COMMENT ON COLUMN public.ai_coach_logs.timestamp IS 'When the interaction occurred';
