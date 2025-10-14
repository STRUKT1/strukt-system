-- =========================================================
-- Migration: Add Proactive Coach & Onboarding Fields
-- Date: 2025-10-14
-- Description: Extends user_profiles with rich onboarding data
--              and adds weight_logs table for tracking
-- =========================================================

-- =========================
-- Extend user_profiles table
-- =========================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS why_statement TEXT,
  ADD COLUMN IF NOT EXISTS success_definition TEXT,
  ADD COLUMN IF NOT EXISTS target_event_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pregnant_or_breastfeeding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_recovering_from_surgery BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS faith_based_diet TEXT,
  ADD COLUMN IF NOT EXISTS relationship_with_food TEXT,
  ADD COLUMN IF NOT EXISTS relationship_with_exercise TEXT,
  ADD COLUMN IF NOT EXISTS coaching_persona TEXT DEFAULT 'strategist',
  ADD COLUMN IF NOT EXISTS anything_else_context TEXT;

-- =========================
-- Create weight_logs table
-- =========================
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_weight_logs_userid_created 
  ON public.weight_logs (user_id, created_at DESC);

-- =========================
-- Enable RLS on weight_logs
-- =========================
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS Policies for weight_logs
-- =========================

-- Users can read their own weight logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'weight_logs'
    AND policyname = 'users_read_own_weight_logs'
  ) THEN
    CREATE POLICY users_read_own_weight_logs
      ON public.weight_logs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own weight logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'weight_logs'
    AND policyname = 'users_insert_own_weight_logs'
  ) THEN
    CREATE POLICY users_insert_own_weight_logs
      ON public.weight_logs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own weight logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'weight_logs'
    AND policyname = 'users_update_own_weight_logs'
  ) THEN
    CREATE POLICY users_update_own_weight_logs
      ON public.weight_logs
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own weight logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'weight_logs'
    AND policyname = 'users_delete_own_weight_logs'
  ) THEN
    CREATE POLICY users_delete_own_weight_logs
      ON public.weight_logs
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- Comments for documentation
-- =========================
COMMENT ON COLUMN public.user_profiles.why_statement IS 'User''s deep motivation and "why" for their fitness journey';
COMMENT ON COLUMN public.user_profiles.success_definition IS 'User''s personal definition of success';
COMMENT ON COLUMN public.user_profiles.target_event_date IS 'Date of target event (e.g., wedding, competition)';
COMMENT ON COLUMN public.user_profiles.is_pregnant_or_breastfeeding IS 'Medical safety flag for pregnancy/breastfeeding';
COMMENT ON COLUMN public.user_profiles.is_recovering_from_surgery IS 'Medical safety flag for post-surgery recovery';
COMMENT ON COLUMN public.user_profiles.faith_based_diet IS 'Religious dietary requirements (e.g., halal, kosher)';
COMMENT ON COLUMN public.user_profiles.relationship_with_food IS 'User''s relationship and history with food';
COMMENT ON COLUMN public.user_profiles.relationship_with_exercise IS 'User''s relationship and history with exercise';
COMMENT ON COLUMN public.user_profiles.coaching_persona IS 'Preferred AI coaching style (motivator, strategist, nurturer)';
COMMENT ON COLUMN public.user_profiles.anything_else_context IS 'Additional context from onboarding';

COMMENT ON TABLE public.weight_logs IS 'Weight tracking over time for progress monitoring';
COMMENT ON COLUMN public.weight_logs.weight_kg IS 'Weight in kilograms';
