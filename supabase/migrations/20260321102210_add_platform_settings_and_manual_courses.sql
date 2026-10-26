/*
  # Add Platform Settings and Manual Course Support

  1. New Tables
    - `platform_settings` - Stores global platform configuration
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - Setting identifier
      - `setting_value` (text) - Setting value
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
  2. Changes to Existing Tables
    - Add `creation_mode` to `courses` table ('ai' or 'manual')
    - Add `email_content_html` to `module_lessons` table for manual HTML content
    - Add `email_content_text` to `module_lessons` table for manual text content
    
  3. Security
    - Enable RLS on `platform_settings` table
    - Only admins can update platform settings
    - All authenticated users can read platform settings
    
  4. Initial Data
    - Set default AI provider to 'openai'
*/

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read platform settings"
  ON platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert platform settings"
  ON platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update platform settings"
  ON platform_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add creation_mode to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'creation_mode'
  ) THEN
    ALTER TABLE courses ADD COLUMN creation_mode text DEFAULT 'ai' CHECK (creation_mode IN ('ai', 'manual'));
  END IF;
END $$;

-- Add email content fields to module_lessons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'email_content_html'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN email_content_html text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'email_content_text'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN email_content_text text;
  END IF;
END $$;

-- Insert default AI provider setting
INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('ai_provider', 'openai')
ON CONFLICT (setting_key) DO NOTHING;