/*
  # Simplify Profiles RLS Policies

  1. Changes
    - Drop all existing SELECT policies on profiles
    - Create a single, simple policy that allows users to view their own profile
    - Admin viewing of all profiles will be handled at the application level with service role

  2. Security
    - Users can view their own profile
    - Admin features use service role key for elevated access
*/

DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);