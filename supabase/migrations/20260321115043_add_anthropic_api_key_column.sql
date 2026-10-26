/*
  # Add Anthropic API Key Support

  1. Changes
    - Add `anthropic_api_key` column to `openai_settings` table to store Anthropic API key separately
    - Rename `api_key` to `openai_api_key` for clarity (keeping original for backward compatibility)
    - Make both API keys nullable so users can configure just one provider

  2. Notes
    - Existing `api_key` field remains for backward compatibility
    - New `anthropic_api_key` field added for Anthropic provider
    - Both keys are optional, allowing users to configure only the provider they want to use
*/

-- Add new column for Anthropic API key
ALTER TABLE openai_settings 
ADD COLUMN IF NOT EXISTS anthropic_api_key text;

-- Make the existing api_key column nullable for flexibility
ALTER TABLE openai_settings 
ALTER COLUMN api_key DROP NOT NULL;
