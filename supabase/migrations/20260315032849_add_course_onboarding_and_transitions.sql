/*
  # Add Course Onboarding and Module Transitions

  1. Changes
    - Add `onboarding_email` field to courses table for welcome/introduction email
    - Add `conclusion_email` field to courses table for course completion email
    - Add `module_summary` field to course_modules for module wrap-up content
    - Add `module_introduction` field to course_modules for next module preview
  
  2. Purpose
    - Support structured email course with:
      - Day 0: Onboarding email introducing the course
      - Daily lessons (Day 1-N)
      - Module transitions (summary of completed + intro to next)
      - Course completion email
*/

-- Add onboarding and conclusion emails to courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'onboarding_email'
  ) THEN
    ALTER TABLE courses ADD COLUMN onboarding_email text DEFAULT '' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'conclusion_email'
  ) THEN
    ALTER TABLE courses ADD COLUMN conclusion_email text DEFAULT '' NOT NULL;
  END IF;
END $$;

-- Add module summary and introduction to course_modules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_modules' AND column_name = 'module_summary'
  ) THEN
    ALTER TABLE course_modules ADD COLUMN module_summary text DEFAULT '' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_modules' AND column_name = 'module_introduction'
  ) THEN
    ALTER TABLE course_modules ADD COLUMN module_introduction text DEFAULT '' NOT NULL;
  END IF;
END $$;