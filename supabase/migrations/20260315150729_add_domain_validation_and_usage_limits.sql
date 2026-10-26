/*
  # Domain Validation and Usage Limits System

  1. New Tables
    - `domain_plans` - Tracks plan status for each domain
      - `domain` (text, primary key) - Email domain (e.g., company.com)
      - `plan_type` (text) - 'free' or 'paid'
      - `course_limit` (integer) - Max courses allowed (2 for free, unlimited for paid)
      - `enrollment_limit_per_course` (integer) - Max enrollments per course (10 for free, unlimited for paid)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `domain_usage` - Tracks actual usage per domain
      - `id` (uuid, primary key)
      - `domain` (text) - Email domain
      - `total_courses` (integer) - Current course count
      - `updated_at` (timestamp)

  2. Purpose
    - Enforce free tier limits: 2 courses, 10 enrollments per course
    - Validate sender and recipient share same domain
    - Block creation/enrollment when limits exceeded
    - Support paid plan upgrades (contact sales)

  3. Security
    - Enable RLS on all tables
    - Users can only view their own domain's usage
    - Admins can view and modify all domains
*/

-- Create domain_plans table
CREATE TABLE IF NOT EXISTS domain_plans (
  domain text PRIMARY KEY,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'paid')),
  course_limit integer NOT NULL DEFAULT 2,
  enrollment_limit_per_course integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create domain_usage table
CREATE TABLE IF NOT EXISTS domain_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  total_courses integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE domain_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domain_plans
CREATE POLICY "Users can view their domain plan"
  ON domain_plans FOR SELECT
  TO authenticated
  USING (
    domain = split_part((SELECT email FROM auth.users WHERE id = auth.uid()), '@', 2)
  );

CREATE POLICY "Admins can view all domain plans"
  ON domain_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert domain plans"
  ON domain_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update domain plans"
  ON domain_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for domain_usage
CREATE POLICY "Users can view their domain usage"
  ON domain_usage FOR SELECT
  TO authenticated
  USING (
    domain = split_part((SELECT email FROM auth.users WHERE id = auth.uid()), '@', 2)
  );

CREATE POLICY "Admins can view all domain usage"
  ON domain_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to get or create domain plan
CREATE OR REPLACE FUNCTION get_or_create_domain_plan(user_domain text)
RETURNS TABLE(
  domain text,
  plan_type text,
  course_limit integer,
  enrollment_limit_per_course integer
) AS $$
BEGIN
  -- Try to get existing plan
  RETURN QUERY
  SELECT dp.domain, dp.plan_type, dp.course_limit, dp.enrollment_limit_per_course
  FROM domain_plans dp
  WHERE dp.domain = user_domain;

  -- If no plan exists, create default free plan
  IF NOT FOUND THEN
    INSERT INTO domain_plans (domain, plan_type, course_limit, enrollment_limit_per_course)
    VALUES (user_domain, 'free', 2, 10)
    ON CONFLICT (domain) DO NOTHING;
    
    RETURN QUERY
    SELECT dp.domain, dp.plan_type, dp.course_limit, dp.enrollment_limit_per_course
    FROM domain_plans dp
    WHERE dp.domain = user_domain;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create domain usage
CREATE OR REPLACE FUNCTION get_or_create_domain_usage(user_domain text)
RETURNS TABLE(
  domain text,
  total_courses integer
) AS $$
BEGIN
  -- Try to get existing usage
  RETURN QUERY
  SELECT du.domain, du.total_courses
  FROM domain_usage du
  WHERE du.domain = user_domain;

  -- If no usage exists, create initial record
  IF NOT FOUND THEN
    INSERT INTO domain_usage (domain, total_courses)
    VALUES (user_domain, 0)
    ON CONFLICT (domain) DO NOTHING;
    
    RETURN QUERY
    SELECT du.domain, du.total_courses
    FROM domain_usage du
    WHERE du.domain = user_domain;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create course
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

  -- Get current course count for this domain
  SELECT COUNT(*) INTO current_courses
  FROM courses c
  INNER JOIN auth.users u ON c.user_id = u.id
  WHERE split_part(u.email, '@', 2) = user_domain;

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

-- Function to check if user can add enrollment to course
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

  -- Check domain match
  IF sender_domain != recipient_domain THEN
    RETURN QUERY SELECT false, 'Recipient must have the same email domain as course creator';
    RETURN;
  END IF;

  -- Get current enrollment count for this course
  SELECT COUNT(*) INTO current_enrollments
  FROM course_enrollments
  WHERE course_id = course_id_param;

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

  -- Paid plans have unlimited enrollments
  IF plan_type = 'paid' THEN
    RETURN QUERY SELECT true, 'OK'::text;
    RETURN;
  END IF;

  -- Check if under limit
  IF current_enrollments >= enrollment_limit THEN
    RETURN QUERY SELECT false, 'Course enrollment limit reached for free plan';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_plans_domain ON domain_plans(domain);
CREATE INDEX IF NOT EXISTS idx_domain_usage_domain ON domain_usage(domain);
