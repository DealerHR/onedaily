/*
  # Create Cron Job for Automated Email Delivery

  1. Purpose
    - Automatically send scheduled emails every hour
    - Calls the send-daily-lesson edge function
    - Runs at the top of every hour (00 minutes)
  
  2. Setup
    - Enables pg_cron extension
    - Creates a cron job that runs hourly
    - Uses pg_net to make HTTP requests to the edge function
*/

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on pg_cron to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create the cron job to send emails every hour
SELECT cron.schedule(
  'send-scheduled-emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-daily-lesson',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);