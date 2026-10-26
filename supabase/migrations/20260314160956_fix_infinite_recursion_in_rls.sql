/*
  # Fix infinite recursion in RLS policies

  1. Changes
    - Drop the "Admins can view all profiles" policy that causes infinite recursion
    - Users can only view and manage their own profile
    - Admin status is determined by the is_admin column in their own profile
  
  2. Security
    - Each user can only access their own profile data
    - Admin privileges are enforced at the application level, not database level
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
