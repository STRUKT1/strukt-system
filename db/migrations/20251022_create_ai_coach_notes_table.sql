-- =========================================================
-- AI Coach Notes Table
-- Migration: 20251022_create_ai_coach_notes_table
-- =========================================================

-- Create ai_coach_notes table for weekly summaries and long-term memory
CREATE TABLE IF NOT EXISTS public.ai_coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weekly_summary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_coach_notes_user_id 
  ON public.ai_coach_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_coach_notes_created_at 
  ON public.ai_coach_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_coach_notes_type 
  ON public.ai_coach_notes(type);

-- Enable Row Level Security
ALTER TABLE public.ai_coach_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notes
CREATE POLICY user_can_view_own_notes
  ON public.ai_coach_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert notes
CREATE POLICY service_role_can_insert_notes
  ON public.ai_coach_notes
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Service role can view all notes (for admin/debugging)
CREATE POLICY service_role_can_view_all_notes
  ON public.ai_coach_notes
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.ai_coach_notes IS 'Long-term memory notes for AI coach, including weekly summaries of user activity and patterns.';
COMMENT ON COLUMN public.ai_coach_notes.user_id IS 'Reference to the user this note is about';
COMMENT ON COLUMN public.ai_coach_notes.note IS 'Natural language summary or note content';
COMMENT ON COLUMN public.ai_coach_notes.type IS 'Type of note (currently only weekly_summary)';
COMMENT ON COLUMN public.ai_coach_notes.created_at IS 'When the note was created';
