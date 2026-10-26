/*
  # Fix Admin View All Profiles Policy

  1. Changes
    - Drop and recreate the "Admins can view all profiles" policy
    - This allows admin users to see all profiles in the admin panel

  2. Security
    - Only users with is_admin = true can view all profiles
    - Regular users can still only see their own profile
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate the policy to allow admins to view all profiles
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