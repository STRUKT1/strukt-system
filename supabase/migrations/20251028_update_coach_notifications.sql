-- =========================================================
-- Update Coach Notifications Table - Phase 3
-- Migration: 20251028_update_coach_notifications
-- =========================================================
-- Adds priority, delivery_channel, and status fields for
-- enhanced notification management

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add priority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coach_notifications' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.coach_notifications 
    ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  -- Add delivery_channel column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coach_notifications' 
    AND column_name = 'delivery_channel'
  ) THEN
    ALTER TABLE public.coach_notifications 
    ADD COLUMN delivery_channel TEXT DEFAULT 'in-app' CHECK (delivery_channel IN ('in-app', 'push', 'email', 'sms'));
  END IF;

  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coach_notifications' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.coach_notifications 
    ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'cancelled'));
  END IF;
END $$;

-- Update the type column constraint to support 'nudge' type
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE public.coach_notifications 
    DROP CONSTRAINT IF EXISTS coach_notifications_type_check;
  
  -- Add new constraint with extended types
  ALTER TABLE public.coach_notifications 
    ADD CONSTRAINT coach_notifications_type_check 
    CHECK (type IN ('ai_coach_proactive', 'nudge', 'reminder', 'achievement'));
END $$;

-- Add comments for new columns
COMMENT ON COLUMN public.coach_notifications.priority IS 'Notification priority: low, normal, high, or urgent';
COMMENT ON COLUMN public.coach_notifications.delivery_channel IS 'Channel for notification delivery: in-app, push, email, or sms';
COMMENT ON COLUMN public.coach_notifications.status IS 'Delivery status: pending, delivered, failed, or cancelled';
