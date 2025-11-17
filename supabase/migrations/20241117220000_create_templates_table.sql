-- Create templates table for Quick Add Templates feature
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('meal_breakfast', 'meal_lunch', 'meal_dinner', 'meal_snack', 'workout')),
  data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT template_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
  CONSTRAINT template_name_user_unique UNIQUE (user_id, name)
);

-- Indexes for performance
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_type ON templates(user_id, type);
CREATE INDEX idx_templates_usage_count ON templates(user_id, usage_count DESC);
CREATE INDEX idx_templates_created_at ON templates(user_id, created_at DESC);

-- Row Level Security Policies
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- Comments for documentation
COMMENT ON TABLE templates IS 'Stores user meal and workout templates for quick logging';
COMMENT ON COLUMN templates.name IS 'User-defined name for template (e.g., "My usual breakfast")';
COMMENT ON COLUMN templates.type IS 'Template category: meal_breakfast, meal_lunch, meal_dinner, meal_snack, or workout';
COMMENT ON COLUMN templates.data IS 'JSONB storage for meal foods or workout details';
COMMENT ON COLUMN templates.usage_count IS 'Number of times template has been used (increments on use)';
COMMENT ON COLUMN templates.last_used_at IS 'Timestamp of last template usage';

-- Meal Template Data Example:
-- {
--   "foods": [
--     {
--       "name": "scrambled eggs",
--       "amount": "3 large eggs",
--       "calories": 216,
--       "protein": 18,
--       "carbs": 2,
--       "fat": 15
--     }
--   ],
--   "totals": {
--     "calories": 376,
--     "protein": 26,
--     "carbs": 32,
--     "fat": 17
--   }
-- }

-- Workout Template Data Example:
-- {
--   "workout": {
--     "exercise": "Strength Training",
--     "duration": 60,
--     "calories": 320,
--     "notes": "Upper body day"
--   }
-- }
