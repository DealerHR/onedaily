/*
  # Create Email Sending Function and Cron Job

  1. Purpose
    - Create a database function to call the edge function
    - Set up automated hourly cron job
  
  2. Changes
    - Creates a stored function to invoke the edge function
    - Sets up cron job to run every hour
*/

-- Drop existing cron job if it exists
SELECT cron.unschedule('send-scheduled-emails') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-emails'
);

-- Create a function to send scheduled emails
CREATE OR REPLACE FUNCTION send_scheduled_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Get Supabase configuration from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);
  
  -- If settings are not available, try alternative approach
  IF supabase_url IS NULL THEN
    supabase_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co';
  END IF;
  
  -- Make HTTP request to edge function
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-daily-lesson',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := '{}'::jsonb
    ) INTO request_id;
    
    RAISE NOTICE 'Email sending triggered, request ID: %', request_id;
  ELSE
    RAISE NOTICE 'Supabase configuration not found, skipping email send';
  END IF;
END;
$$;

-- Schedule the cron job to run every hour at minute 0
SELECT cron.schedule(
  'send-scheduled-emails',
  '0 * * * *',
  'SELECT send_scheduled_emails();'
);

-- Verify cron job was created
DO $$
DECLARE
  job_count int;
BEGIN
  SELECT COUNT(*) INTO job_count FROM cron.job WHERE jobname = 'send-scheduled-emails';
  IF job_count > 0 THEN
    RAISE NOTICE 'Cron job "send-scheduled-emails" created successfully - runs every hour at :00';
  ELSE
    RAISE NOTICE 'Failed to create cron job';
  END IF;
END $$;