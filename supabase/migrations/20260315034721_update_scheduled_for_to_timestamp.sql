/*
  # Update scheduled_for to timestamp with timezone

  1. Changes
    - Change `scheduled_for` column from date to timestamptz to support specific send times
    - This allows scheduling emails at specific times of day, not just dates
  
  2. Purpose
    - Enable precise scheduling of email delivery times
    - Support different timezones
*/

-- Update scheduled_for column to timestamptz
DO $$
BEGIN
  -- First check if the column is not already timestamptz
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_deliveries'
    AND column_name = 'scheduled_for'
    AND data_type = 'date'
  ) THEN
    -- Convert existing date values to timestamptz (using 9am UTC as default time)
    ALTER TABLE lesson_deliveries 
    ALTER COLUMN scheduled_for TYPE timestamptz 
    USING (scheduled_for::date + interval '9 hours')::timestamptz;
  END IF;
END $$;