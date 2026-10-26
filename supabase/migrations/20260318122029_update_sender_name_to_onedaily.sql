/*
  # Update Sender Name Defaults to OneDaily

  1. Changes
    - Updates the default value for the `sender_name` column in the `profiles` table from 'WhiSPER Learning' to 'OneDaily'
    - Updates any existing profiles that still have 'WhiSPER Learning' or 'DripWise AI' as their sender_name to 'OneDaily'

  2. Security
    - No changes to RLS policies
    - Maintains existing permissions
*/

-- Update existing profiles with old brand names to OneDaily
UPDATE profiles
SET sender_name = 'OneDaily', updated_at = now()
WHERE sender_name IN ('WhiSPER Learning', 'DripWise AI', 'DripWise');

-- Update the default value for future profiles
ALTER TABLE profiles 
ALTER COLUMN sender_name SET DEFAULT 'OneDaily';
