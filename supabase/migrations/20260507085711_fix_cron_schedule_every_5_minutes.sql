-- Fix email delivery cron: change from hourly to every 5 minutes
-- and remove sliding window so missed emails are always retried

SELECT cron.unschedule('send-scheduled-emails');

SELECT cron.schedule(
  'send-scheduled-emails',
  '*/5 * * * *',
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
