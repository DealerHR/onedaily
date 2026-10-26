/*
  # Fix Domain Plans RLS Policy

  1. Changes
    - Drop the existing "Users can view their domain plan" policy
    - Recreate it to use profiles table instead of auth.users
    - This fixes the "permission denied for table users" error

  2. Security
    - Users can only view their own domain plan based on their email domain
    - Policy now correctly references profiles table which is accessible
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their domain plan" ON domain_plans;

-- Recreate the policy using profiles table instead of auth.users
CREATE POLICY "Users can view their domain plan"
  ON domain_plans
  FOR SELECT
  TO authenticated
  USING (
    domain = split_part(
      (SELECT email FROM profiles WHERE id = auth.uid()),
      '@',
      2
    )
  );
