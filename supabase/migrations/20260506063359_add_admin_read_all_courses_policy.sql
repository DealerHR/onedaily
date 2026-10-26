/*
  # Allow admins to read all courses

  ## Problem
  The admin panel counts each user's campaigns by querying the courses table
  for each profile. Because RLS restricts reads to the row owner, the admin
  user can only see their own courses — every other user shows 0.

  ## Fix
  Add a SELECT policy that allows users whose profile has is_admin = true to
  read all rows in the courses table.
*/

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
