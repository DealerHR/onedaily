/*
  # Fix Admin Profile Access with SECURITY DEFINER Function

  1. Changes
    - Create a SECURITY DEFINER function to check admin status without triggering RLS
    - Update the SELECT policy to use this function
    - This avoids circular dependency issues

  2. Security
    - Function runs with elevated privileges to bypass RLS
    - Only checks the is_admin flag for the current user
    - Users can always see their own profile
    - Admins can see all profiles
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create a function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
END;
$$;

-- Create new policy using the function
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    is_current_user_admin() = true
  );