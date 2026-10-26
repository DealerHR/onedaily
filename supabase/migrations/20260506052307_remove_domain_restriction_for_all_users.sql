/*
  # Remove Email Domain Restriction for All Users

  1. Changes
    - Update `can_add_enrollment` function to remove domain matching check entirely
    - All users (free and paid) can now enroll recipients with any email domain,
      including personal domains like gmail.com, yahoo.com, hotmail.com, etc.
    - Free users still respect the enrollment limit per course (10 enrollments)
    - Paid users continue to have unlimited enrollments

  2. Notes
    - Previously, free users could only enroll recipients whose email domain
      matched the course creator's domain (i.e. same corporate domain only)
    - This change removes that restriction so any email address can be enrolled
*/

CREATE OR REPLACE FUNCTION can_add_enrollment(course_id_param uuid, recipient_email_param text)
RETURNS TABLE(
  allowed boolean,
  reason text
) AS $$
DECLARE
  sender_domain text;
  current_enrollments integer;
  enrollment_limit integer;
  plan_type text;
BEGIN
  -- Get sender's domain from course owner
  SELECT split_part(u.email, '@', 2) INTO sender_domain
  FROM courses c
  INNER JOIN auth.users u ON c.user_id = u.id
  WHERE c.id = course_id_param;

  -- Get plan details for the course owner's domain
  SELECT dp.enrollment_limit_per_course, dp.plan_type INTO enrollment_limit, plan_type
  FROM domain_plans dp
  WHERE dp.domain = sender_domain;

  -- If no plan exists, create free plan defaults
  IF enrollment_limit IS NULL THEN
    PERFORM get_or_create_domain_plan(sender_domain);
    enrollment_limit := 10;
    plan_type := 'free';
  END IF;

  -- Paid plans have unlimited enrollments
  IF plan_type = 'paid' THEN
    RETURN QUERY SELECT true, 'OK'::text;
    RETURN;
  END IF;

  -- For free users: check enrollment count limit only (no domain restriction)
  SELECT COUNT(*) INTO current_enrollments
  FROM course_enrollments
  WHERE course_id = course_id_param;

  IF current_enrollments >= enrollment_limit THEN
    RETURN QUERY SELECT false, 'Course enrollment limit reached for free plan. Upgrade to add unlimited enrollments.'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
