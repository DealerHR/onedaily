/*
  # Remove Domain Restriction for Paid Users

  1. Changes
    - Update `can_add_enrollment` function to skip domain validation for paid users
    - Free users remain restricted to same-domain enrollments
    - Paid users can add enrollments from any email domain
  
  2. Logic
    - Check sender's plan type first
    - If plan type is 'paid', skip domain validation and allow enrollment
    - If plan type is 'free', enforce domain matching as before
  
  3. Security
    - Maintains existing RLS policies
    - Preserves enrollment limits for free users
    - Paid users still respect their unlimited enrollment allowance
*/

-- Update function to skip domain validation for paid users
CREATE OR REPLACE FUNCTION can_add_enrollment(course_id_param uuid, recipient_email_param text)
RETURNS TABLE(
  allowed boolean,
  reason text
) AS $$
DECLARE
  sender_domain text;
  recipient_domain text;
  current_enrollments integer;
  enrollment_limit integer;
  plan_type text;
BEGIN
  -- Get sender's domain from course owner
  SELECT split_part(u.email, '@', 2) INTO sender_domain
  FROM courses c
  INNER JOIN auth.users u ON c.user_id = u.id
  WHERE c.id = course_id_param;

  -- Get recipient's domain
  recipient_domain := split_part(recipient_email_param, '@', 2);

  -- Get plan details
  SELECT dp.enrollment_limit_per_course, dp.plan_type INTO enrollment_limit, plan_type
  FROM domain_plans dp
  WHERE dp.domain = sender_domain;

  -- If no plan exists, create free plan
  IF enrollment_limit IS NULL THEN
    PERFORM get_or_create_domain_plan(sender_domain);
    enrollment_limit := 10;
    plan_type := 'free';
  END IF;

  -- Paid plans have unlimited enrollments and no domain restrictions
  IF plan_type = 'paid' THEN
    RETURN QUERY SELECT true, 'OK'::text;
    RETURN;
  END IF;

  -- For free users: Check domain match
  IF sender_domain != recipient_domain THEN
    RETURN QUERY SELECT false, 'Recipient must have the same email domain as course creator. Upgrade to a paid plan to add users from any domain.'::text;
    RETURN;
  END IF;

  -- Get current enrollment count for this course
  SELECT COUNT(*) INTO current_enrollments
  FROM course_enrollments
  WHERE course_id = course_id_param;

  -- Check if under limit for free users
  IF current_enrollments >= enrollment_limit THEN
    RETURN QUERY SELECT false, 'Course enrollment limit reached for free plan. Upgrade to add unlimited enrollments.'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;