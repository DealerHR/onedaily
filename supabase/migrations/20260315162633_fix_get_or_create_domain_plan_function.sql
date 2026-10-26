/*
  # Fix get_or_create_domain_plan Function

  1. Purpose
    - Fix ambiguous column reference error in get_or_create_domain_plan function
    - Ensure function properly creates domain plans when they don't exist
    - Fix ON CONFLICT clause to avoid column ambiguity

  2. Changes
    - Drop and recreate get_or_create_domain_plan function with fixed SQL
    - Use table-qualified column names to avoid ambiguity
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_or_create_domain_plan(text);

-- Recreate with fixed SQL
CREATE OR REPLACE FUNCTION get_or_create_domain_plan(user_domain text)
RETURNS TABLE (
  domain text,
  plan_type text,
  course_limit integer,
  enrollment_limit_per_course integer
) AS $$
DECLARE
  plan_exists boolean;
BEGIN
  -- Check if plan exists
  SELECT EXISTS(SELECT 1 FROM domain_plans WHERE domain_plans.domain = user_domain) INTO plan_exists;

  -- If no plan exists, create default free plan
  IF NOT plan_exists THEN
    INSERT INTO domain_plans (domain, plan_type, course_limit, enrollment_limit_per_course)
    VALUES (user_domain, 'free', 2, 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Return the plan
  RETURN QUERY
  SELECT dp.domain, dp.plan_type, dp.course_limit, dp.enrollment_limit_per_course
  FROM domain_plans dp
  WHERE dp.domain = user_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
