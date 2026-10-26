/*
  # Add Sender Name Configuration
  
  1. Purpose
    - Allow platform users to configure the sender name for course emails
    - Defaults to "WhiSPER Learning" if not set
  
  2. Changes
    - Add sender_name column to profiles table
    - Add sender_email column to profiles table
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sender_name text DEFAULT 'WhiSPER Learning',
ADD COLUMN IF NOT EXISTS sender_email text DEFAULT 'courses@resend.dev';