/*
  # OpenRouter Settings and Objectives Writer Schema

  1. New Tables
    - `openrouter_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `api_key` (text, encrypted) - OpenRouter API key
      - `selected_model` (text) - Currently selected AI model
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (uuid) - Admin who updated settings
    
    - `learning_objectives`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - User who created the objective
      - `subject` (text) - Subject/topic area
      - `grade_level` (text) - Grade level or education level
      - `bloom_level` (text) - Bloom's taxonomy level
      - `input_prompt` (text) - User's input/prompt
      - `generated_objectives` (jsonb) - Array of generated objectives
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Only admins can manage OpenRouter settings
    - Users can only view/manage their own objectives
*/

-- Create openrouter_settings table
CREATE TABLE IF NOT EXISTS openrouter_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text,
  selected_model text DEFAULT 'meta-llama/llama-3.2-3b-instruct:free',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create learning_objectives table
CREATE TABLE IF NOT EXISTS learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  grade_level text,
  bloom_level text,
  input_prompt text NOT NULL,
  generated_objectives jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE openrouter_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for openrouter_settings
CREATE POLICY "Only admins can view OpenRouter settings"
  ON openrouter_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can insert OpenRouter settings"
  ON openrouter_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update OpenRouter settings"
  ON openrouter_settings FOR UPDATE
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

-- RLS Policies for learning_objectives
CREATE POLICY "Users can view own objectives"
  ON learning_objectives FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own objectives"
  ON learning_objectives FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own objectives"
  ON learning_objectives FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own objectives"
  ON learning_objectives FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_objectives_user_id ON learning_objectives(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_objectives_created_at ON learning_objectives(created_at DESC);

-- Insert default settings (if none exist)
INSERT INTO openrouter_settings (selected_model)
SELECT 'meta-llama/llama-3.2-3b-instruct:free'
WHERE NOT EXISTS (SELECT 1 FROM openrouter_settings LIMIT 1);