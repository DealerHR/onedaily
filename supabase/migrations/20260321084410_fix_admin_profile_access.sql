/*
  # Fix Admin Profile Access

  1. Changes
    - Drop the circular "Admins can view all profiles" policy
    - Update "Users can view own profile" to also allow admins to view all profiles
    - This prevents circular dependency issues

  2. Security
    - Users can always view their own profile
    - Admins can view all profiles
*/

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    (
      SELECT is_admin FROM profiles WHERE id = auth.uid()
    ) = true
  );