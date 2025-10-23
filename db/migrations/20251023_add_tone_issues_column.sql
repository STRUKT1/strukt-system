-- =========================================================
-- Add tone_issues column to ai_coach_logs
-- Migration: 20251023_add_tone_issues_column
-- =========================================================

-- Add tone_issues column to track tone safety violations
ALTER TABLE public.ai_coach_logs 
ADD COLUMN IF NOT EXISTS tone_issues TEXT[];

-- Create index for querying logs with tone issues
CREATE INDEX IF NOT EXISTS idx_ai_coach_logs_tone_issues 
  ON public.ai_coach_logs USING gin(tone_issues) 
  WHERE tone_issues IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_coach_logs.tone_issues IS 'Array of tone safety issues detected in the response (e.g., judgmental language, sarcasm, harmful advice)';
