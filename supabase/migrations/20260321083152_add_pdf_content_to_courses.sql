/*
  # Add PDF Content Storage to Courses

  1. Changes
    - Add `pdf_content` column to `courses` table to store extracted PDF text
    - This allows AI to reference the training material when generating lessons
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'pdf_content'
  ) THEN
    ALTER TABLE courses ADD COLUMN pdf_content text;
  END IF;
END $$;