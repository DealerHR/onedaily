/*
  # Add Course Draft Mode and Editable Lesson Content

  1. Changes to Existing Tables
    - `courses`
      - Add `status` column (text) - 'draft', 'published', 'archived'
      - Add `published_at` column (timestamptz) - timestamp when course was published
    
    - `module_lessons`
      - Add `email_subject` column (text) - subject line for the lesson email
      - Add `email_content` column (text) - full HTML/text content for the lesson email
      - Add `content_generated_at` column (timestamptz) - when AI generated the content
      - Add `last_edited_at` column (timestamptz) - when content was last manually edited
      - Add `edited_by` column (uuid) - user who last edited the content

  2. New Functionality
    - Courses start in 'draft' status by default
    - Lessons store their email content separately for editing
    - Track when content is AI-generated vs manually edited
    - Only published courses trigger email deliveries

  3. Security
    - Update existing RLS policies to handle new columns
    - No new policies needed as ownership is already enforced
*/

-- Add status tracking to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'status'
  ) THEN
    ALTER TABLE courses ADD COLUMN status text DEFAULT 'draft' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Add email content fields to module_lessons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'email_subject'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN email_subject text DEFAULT '' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'email_content'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN email_content text DEFAULT '' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'content_generated_at'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN content_generated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN last_edited_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'edited_by'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN edited_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index on course status for filtering
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Add check constraint for valid course statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'courses_status_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_status_check 
    CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;
