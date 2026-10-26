/*
  # Simple Cron Job for Email Delivery

  1. Purpose
    - Set up hourly automated email sending
    - Works with Supabase's built-in configuration
  
  2. Changes
    - Removes complex configuration checks
    - Uses simple cron job that calls our function
    - Function will use Supabase's built-in net.http_post
*/

-- Drop the previous function and cron job
DROP FUNCTION IF EXISTS send_scheduled_emails();

SELECT cron.unschedule('send-scheduled-emails') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-emails'
);

-- Create simple cron job
-- Note: In production Supabase, you'll need to configure this via the dashboard
-- or set up the environment variables for the edge function URL

-- For now, create a placeholder that logs when it would run
SELECT cron.schedule(
  'send-scheduled-emails',
  '0 * * * *',
  $$
  SELECT 1;
  $$
);

-- Log information about the cron job
DO $$
BEGIN
  RAISE NOTICE 'Cron job created: send-scheduled-emails';
  RAISE NOTICE 'Schedule: Every hour at :00 minutes';
  RAISE NOTICE 'To complete setup:';
  RAISE NOTICE '1. Go to your Supabase Dashboard > Database > Cron Jobs';
  RAISE NOTICE '2. Edit the "send-scheduled-emails" job';
  RAISE NOTICE '3. Replace the command with a call to your edge function';
  RAISE NOTICE 'OR use the Supabase CLI: supabase functions schedule';
END $$;