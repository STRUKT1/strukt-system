-- =========================================================
-- Enhance meals table for voice-based meal logging
-- Adds support for GPT-4 parsed food items, meal types, and metadata
-- =========================================================

-- Add new columns for voice logging (idempotent)
DO $$
BEGIN
  -- Add meal_type column (breakfast, lunch, dinner, snack)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE public.meals
    ADD COLUMN meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));
  END IF;

  -- Add foods column (JSONB array of parsed food items with nutrition)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'foods'
  ) THEN
    ALTER TABLE public.meals
    ADD COLUMN foods JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add source column (voice, manual, photo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.meals
    ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('voice', 'manual', 'photo'));
  END IF;

  -- Add confidence column (high, medium, low) for GPT-4 parsing confidence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'confidence'
  ) THEN
    ALTER TABLE public.meals
    ADD COLUMN confidence TEXT CHECK (confidence IN ('high', 'medium', 'low'));
  END IF;

  -- Add timestamp column (more precise than date) for meal logging
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE public.meals
    ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add transcription column (original voice transcription)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'transcription'
  ) THEN
    ALTER TABLE public.meals
    ADD COLUMN transcription TEXT;
  END IF;
END $$;

-- Create index on meal_type for filtering
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON public.meals(meal_type);

-- Create index on source for analytics
CREATE INDEX IF NOT EXISTS idx_meals_source ON public.meals(source);

-- Create index on timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_meals_timestamp ON public.meals(user_id, timestamp DESC);

-- Add comment explaining the enhanced schema
COMMENT ON COLUMN public.meals.meal_type IS 'Type of meal: breakfast, lunch, dinner, or snack';
COMMENT ON COLUMN public.meals.foods IS 'Array of parsed food items with nutrition data: [{name, amount, calories, protein, carbs, fat, estimated, source}]';
COMMENT ON COLUMN public.meals.source IS 'How the meal was logged: voice, manual, or photo';
COMMENT ON COLUMN public.meals.confidence IS 'GPT-4 parsing confidence: high, medium, or low';
COMMENT ON COLUMN public.meals.timestamp IS 'Precise timestamp of when meal was consumed';
COMMENT ON COLUMN public.meals.transcription IS 'Original voice transcription for voice-logged meals';

-- Backward compatibility: Update existing records to have a timestamp based on date
UPDATE public.meals
SET timestamp = (date || ' 12:00:00')::timestamptz
WHERE timestamp IS NULL AND date IS NOT NULL;
