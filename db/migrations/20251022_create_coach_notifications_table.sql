-- =========================================================
-- Coach Notifications Table
-- Migration: 20251022_create_coach_notifications_table
-- =========================================================

-- Create coach_notifications table for proactive coaching messages
CREATE TABLE IF NOT EXISTS public.coach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ai_coach_proactive')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_coach_notifications_user_id 
  ON public.coach_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_coach_notifications_created_at 
  ON public.coach_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_notifications_read 
  ON public.coach_notifications(read);

-- Enable Row Level Security
ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY user_can_view_own_notifications
  ON public.coach_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY user_can_update_own_notifications
  ON public.coach_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Service role can insert notifications
CREATE POLICY service_role_can_insert_notifications
  ON public.coach_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Service role can view all notifications (for admin/debugging)
CREATE POLICY service_role_can_view_all_notifications
  ON public.coach_notifications
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.coach_notifications IS 'Proactive coaching notifications triggered by user patterns and behaviors.';
COMMENT ON COLUMN public.coach_notifications.user_id IS 'Reference to the user receiving the notification';
COMMENT ON COLUMN public.coach_notifications.message IS 'The notification message content';
COMMENT ON COLUMN public.coach_notifications.type IS 'Type of notification (currently only ai_coach_proactive)';
COMMENT ON COLUMN public.coach_notifications.read IS 'Whether the user has read this notification';
COMMENT ON COLUMN public.coach_notifications.created_at IS 'When the notification was created';
