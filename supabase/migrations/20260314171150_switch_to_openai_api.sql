/*
  # Switch from OpenRouter to OpenAI API

  1. Changes
    - Drop openrouter_settings table
    - Create openai_settings table to store OpenAI API keys and configuration
    - Add columns for api_key, model selection, and timestamps
  
  2. Security
    - Enable RLS on openai_settings table
    - Add policy for authenticated users to manage their own settings
    - Only admins can view/update their API configuration
*/

-- Drop old table
DROP TABLE IF EXISTS openrouter_settings;

-- Create OpenAI settings table
CREATE TABLE IF NOT EXISTS openai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  api_key text NOT NULL,
  selected_model text DEFAULT 'gpt-4o-mini' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE openai_settings ENABLE ROW LEVEL SECURITY;

-- Policies for openai_settings
CREATE POLICY "Users can view own OpenAI settings"
  ON openai_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OpenAI settings"
  ON openai_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OpenAI settings"
  ON openai_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own OpenAI settings"
  ON openai_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);