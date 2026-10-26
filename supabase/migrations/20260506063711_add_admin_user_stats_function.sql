/*
  # Admin user stats function

  ## Purpose
  Returns per-user campaign/enrollment/email stats for the admin panel in a
  single round-trip, bypassing RLS via SECURITY DEFINER so admins can see
  counts for all users (not just their own data).

  ## Returns
  One row per profile with:
  - user_id
  - campaign_count   : total campaigns (all statuses)
  - enrollment_count : total unique enrollments across all campaigns
  - emails_sent      : total lesson_deliveries with status = 'sent'
*/

CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  user_id        uuid,
  campaign_count bigint,
  enrollment_count bigint,
  emails_sent    bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id                                              AS user_id,
    COUNT(DISTINCT c.id)                              AS campaign_count,
    COUNT(DISTINCT ce.id)                             AS enrollment_count,
    COUNT(DISTINCT ld.id) FILTER (WHERE ld.status = 'sent') AS emails_sent
  FROM profiles p
  LEFT JOIN courses c        ON c.user_id = p.id
  LEFT JOIN course_enrollments ce ON ce.course_id = c.id
  LEFT JOIN lesson_deliveries ld  ON ld.enrollment_id = ce.id
  GROUP BY p.id;
$$;

-- Only admins should be able to call this function
REVOKE EXECUTE ON FUNCTION get_admin_user_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_user_stats() TO authenticated;
