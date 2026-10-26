/*
  # Allow Admins to View All Profiles

  1. Changes
    - Update the SELECT policy on profiles to allow admins to view all profiles
    - Regular users can only view their own profile
    - Admins can view all profiles

  2. Security
    - Uses a subquery to check if the current user is an admin
    - Avoids circular dependency by directly checking is_admin on the user's own row
*/

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    (
      SELECT is_admin 
      FROM profiles 
      WHERE id = auth.uid()
      LIMIT 1
    ) = true
  );