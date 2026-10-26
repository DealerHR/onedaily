/*
  # Add User Deactivation and Email Tracking

  1. User Deactivation
    - Add `is_active` column to profiles table
    - Defaults to `true` for all existing users
    - Admin can deactivate users to block access
    - Deactivated users cannot sign in or use the platform

  2. Email Tracking
    - Create `email_events` table to track email opens, clicks, bounces
    - Links to lesson_deliveries table
    - Stores event type, timestamp, and metadata from Resend

  3. Purpose
    - Admin control over user access
    - Track email engagement metrics
    - Monitor course delivery effectiveness
*/

-- Add is_active column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create email_events table for tracking
CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES lesson_deliveries(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  email_id text,
  recipient_email text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on email_events
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_events
CREATE POLICY "Users can view their own email events"
  ON email_events FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT ld.id FROM lesson_deliveries ld
      INNER JOIN course_enrollments ce ON ld.enrollment_id = ce.id
      INNER JOIN courses c ON ce.course_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all email events"
  ON email_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert email events"
  ON email_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_events_delivery_id ON email_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Function to check if user is active
CREATE OR REPLACE FUNCTION is_user_active(user_id uuid)
RETURNS boolean AS $$
DECLARE
  active boolean;
BEGIN
  SELECT is_active INTO active
  FROM profiles
  WHERE id = user_id;
  
  RETURN COALESCE(active, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add tracking columns to lesson_deliveries if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_deliveries' AND column_name = 'email_id'
  ) THEN
    ALTER TABLE lesson_deliveries ADD COLUMN email_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_deliveries' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE lesson_deliveries ADD COLUMN opened_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_deliveries' AND column_name = 'clicked_at'
  ) THEN
    ALTER TABLE lesson_deliveries ADD COLUMN clicked_at timestamptz;
  END IF;
END $$;
