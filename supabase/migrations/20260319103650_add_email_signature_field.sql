/*
  # Add Email Signature Field

  1. Changes
    - Add `email_signature` column to `profiles` table
      - Allows users to customize how their emails are signed off
      - Default signature includes sender name and organization
    
  2. Security
    - No RLS changes needed (already protected by existing policies)
*/

-- Add email signature field to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_signature'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_signature text DEFAULT 'Best regards,
{sender_name}
{organization}';
  END IF;
END $$;