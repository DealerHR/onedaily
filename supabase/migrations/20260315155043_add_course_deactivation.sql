/*
  # Add Course Deactivation Feature

  1. Changes
    - Add `is_active` column to courses table
    - Defaults to `true` for all existing courses
    - Allows courses to be deactivated without deletion
    - Deactivated courses won't count toward domain limits

  2. Purpose
    - Preserve course data while removing from active usage
    - Allow users to archive/deactivate courses
    - Deactivated courses don't count against free tier limits
*/

-- Add is_active column to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE courses ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Update can_create_course to only count active courses
CREATE OR REPLACE FUNCTION can_create_course(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_domain text;
  current_courses integer;
  plan_limit integer;
  plan_type text;
BEGIN
  -- Get user's domain
  SELECT split_part(email, '@', 2) INTO user_domain
  FROM auth.users WHERE id = user_id;

  -- Get current ACTIVE course count for this domain
  SELECT COUNT(*) INTO current_courses
  FROM courses c
  INNER JOIN auth.users u ON c.user_id = u.id
  WHERE split_part(u.email, '@', 2) = user_domain
  AND c.is_active = true;

  -- Get plan details
  SELECT dp.course_limit, dp.plan_type INTO plan_limit, plan_type
  FROM domain_plans dp
  WHERE dp.domain = user_domain;

  -- If no plan exists, create free plan
  IF plan_limit IS NULL THEN
    PERFORM get_or_create_domain_plan(user_domain);
    plan_limit := 2;
    plan_type := 'free';
  END IF;

  -- Paid plans have unlimited courses
  IF plan_type = 'paid' THEN
    RETURN true;
  END IF;

  -- Check if under limit
  RETURN current_courses < plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_domain_course_count to only count active courses
CREATE OR REPLACE FUNCTION get_domain_course_count(user_domain text)
RETURNS integer AS $$
DECLARE
  course_count integer;
BEGIN
  -- Count all ACTIVE courses where user email domain matches
  SELECT COUNT(*) INTO course_count
  FROM courses c
  INNER JOIN auth.users u ON c.user_id = u.id
  WHERE split_part(u.email, '@', 2) = user_domain
  AND c.is_active = true;

  RETURN course_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);
