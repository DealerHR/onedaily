/*
  # Configure Automated Email Delivery Cron Job

  1. Purpose
    - Set up automated hourly email delivery
    - Uses pg_cron and pg_net to call the edge function
  
  2. Changes
    - Configures cron job with proper edge function URL
    - Runs every hour to send scheduled emails
*/

-- Remove old cron job if exists
SELECT cron.unschedule('send-scheduled-emails') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-emails'
);

-- Create cron job that calls the edge function every hour
SELECT cron.schedule(
  'send-scheduled-emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ewlqkafjyrwhfziifjbc.supabase.co/functions/v1/send-daily-lesson',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify the cron job
DO $$
DECLARE
  job_record record;
BEGIN
  SELECT * INTO job_record FROM cron.job WHERE jobname = 'send-scheduled-emails';
  
  IF FOUND THEN
    RAISE NOTICE '✓ Cron job configured successfully!';
    RAISE NOTICE 'Name: %', job_record.jobname;
    RAISE NOTICE 'Schedule: % (every hour at :00)', job_record.schedule;
    RAISE NOTICE 'Next run: Will check for emails scheduled in the past hour';
    RAISE NOTICE 'Edge function: https://ewlqkafjyrwhfziifjbc.supabase.co/functions/v1/send-daily-lesson';
  ELSE
    RAISE WARNING 'Cron job creation may have failed';
  END IF;
END $$;