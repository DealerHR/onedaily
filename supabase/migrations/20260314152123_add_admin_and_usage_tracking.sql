/*
  # Add Admin Role and Usage Tracking

  1. Table Modifications
    - Add `is_admin` column to `profiles` table (boolean, default false)
    - Add `last_active` column to `profiles` table (timestamptz)
  
  2. New Tables
    - `tool_usage`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `tool_name` (text, not null)
      - `accessed_at` (timestamptz, default now())
  
  3. Functions
    - Create trigger to automatically make first user admin
    - Create function to get usage statistics per user
  
  4. Security
    - Enable RLS on `tool_usage` table
    - Add policies for users to insert their own usage
    - Add policies for admins to view all profiles and usage
*/

-- Add admin and last_active columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;
END $$;

-- Create tool_usage table
CREATE TABLE IF NOT EXISTS tool_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tool_name text NOT NULL,
  accessed_at timestamptz DEFAULT now()
);

ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tool_usage
CREATE POLICY "Users can insert own usage"
  ON tool_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own usage"
  ON tool_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON tool_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Update RLS policies for profiles to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.is_admin = true
    )
  );

-- Function to make first user admin
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles) = 1 THEN
    UPDATE profiles
    SET is_admin = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after profile insert
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

-- Function to update last_active
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_active = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_active on tool usage
DROP TRIGGER IF EXISTS on_tool_usage ON tool_usage;
CREATE TRIGGER on_tool_usage
  AFTER INSERT ON tool_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_accessed_at ON tool_usage(accessed_at DESC);