/*
  # Add Domain Course Count Function

  1. Purpose
    - Create a function to get the total course count for a domain
    - This allows frontend to display accurate domain-wide course usage
    - Works for both admin and regular users

  2. Function
    - `get_domain_course_count(user_domain text)` - Returns count of courses for a domain
*/

-- Function to get course count for a domain
CREATE OR REPLACE FUNCTION get_domain_course_count(user_domain text)
RETURNS integer AS $$
DECLARE
  course_count integer;
BEGIN
  -- Count all courses where user email domain matches
  SELECT COUNT(*) INTO course_count
  FROM courses c
  INNER JOIN auth.users u ON c.user_id = u.id
  WHERE split_part(u.email, '@', 2) = user_domain;

  RETURN course_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
