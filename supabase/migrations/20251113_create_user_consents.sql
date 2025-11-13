-- Migration: Create user_consents table for GDPR compliance
-- Security Audit P0-2: User consent for OpenAI data processing
-- Date: 2025-11-13

-- Create user_consents table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('openai_processing', 'analytics', 'marketing')),
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  privacy_policy_version text NOT NULL DEFAULT '1.0',
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure one record per user per consent type
  UNIQUE(user_id, consent_type)
);

-- Add comment
COMMENT ON TABLE public.user_consents IS
'User consent records for GDPR compliance. Tracks consent for data processing activities including OpenAI API usage.';

-- Create indexes for performance
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_consent_type ON public.user_consents(consent_type);
CREATE INDEX idx_user_consents_granted ON public.user_consents(granted) WHERE granted = true;

-- Enable Row Level Security
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own consents
CREATE POLICY "Users can view their own consents"
  ON public.user_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own consents
CREATE POLICY "Users can insert their own consents"
  ON public.user_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own consents
CREATE POLICY "Users can update their own consents"
  ON public.user_consents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_consents_updated_at();
