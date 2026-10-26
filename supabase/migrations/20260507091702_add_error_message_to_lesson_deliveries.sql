-- Add error_message column to lesson_deliveries for failure visibility

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_deliveries' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE lesson_deliveries ADD COLUMN error_message text;
  END IF;
END $$;
