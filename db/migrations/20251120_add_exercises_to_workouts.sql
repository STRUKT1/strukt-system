-- Add exercises field and enhanced fields to workouts table
-- Supports detailed exercise tracking with sets, reps, weights, etc.

-- Add exercises column (JSONB array)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workouts'
    AND column_name = 'exercises'
  ) THEN
    ALTER TABLE public.workouts ADD COLUMN exercises JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add workout_type column (separate from type for categorization)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workouts'
    AND column_name = 'workout_type'
  ) THEN
    ALTER TABLE public.workouts ADD COLUMN workout_type TEXT;
  END IF;
END $$;

-- Add perceived_exertion column (1-10 scale)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workouts'
    AND column_name = 'perceived_exertion'
  ) THEN
    ALTER TABLE public.workouts ADD COLUMN perceived_exertion INTEGER CHECK (perceived_exertion >= 1 AND perceived_exertion <= 10);
  END IF;
END $$;

-- Add workout_date column (timestamptz for more precise tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workouts'
    AND column_name = 'workout_date'
  ) THEN
    ALTER TABLE public.workouts ADD COLUMN workout_date TIMESTAMPTZ;
  END IF;
END $$;

-- Add distance_km column if it doesn't exist (for cardio workouts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workouts'
    AND column_name = 'distance_km'
  ) THEN
    ALTER TABLE public.workouts ADD COLUMN distance_km NUMERIC(6,2);
  END IF;
END $$;

-- Create index on workout_date for faster queries
CREATE INDEX IF NOT EXISTS idx_workouts_workout_date ON public.workouts(workout_date DESC);

-- Comment on new columns
COMMENT ON COLUMN public.workouts.exercises IS 'JSONB array of exercise objects with sets, reps, weight, etc.';
COMMENT ON COLUMN public.workouts.workout_type IS 'Type of workout: strength, cardio, flexibility, mixed, sports, other';
COMMENT ON COLUMN public.workouts.perceived_exertion IS 'Subjective exertion rating from 1-10';
COMMENT ON COLUMN public.workouts.workout_date IS 'Precise timestamp of when workout occurred';
