/*
  # Course Enhancement Features

  1. New Fields Added
    - `courses` table:
      - `tone` (text) - Instructional tone: instructional, conversational, light-hearted, serious
    
    - `module_lessons` table:
      - `youtube_video_url` (text, nullable) - Optional YouTube video recommendation
      - `youtube_video_title` (text, nullable) - Title/description of the recommended video
    
    - `course_modules` table:
      - `completion_summary` (text, nullable) - Summary of what was covered in this module
      - `next_module_preview` (text, nullable) - Preview of the next module's content
  
  2. Purpose
    - Enhance course quality with tone-appropriate narration
    - Add relevant YouTube video recommendations (1 per module)
    - Improve module transitions with summaries and previews
*/

-- Add tone field to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'tone'
  ) THEN
    ALTER TABLE courses ADD COLUMN tone text DEFAULT 'conversational' CHECK (tone IN ('instructional', 'conversational', 'light-hearted', 'serious'));
  END IF;
END $$;

-- Add YouTube video fields to module_lessons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'youtube_video_url'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN youtube_video_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_lessons' AND column_name = 'youtube_video_title'
  ) THEN
    ALTER TABLE module_lessons ADD COLUMN youtube_video_title text;
  END IF;
END $$;

-- Add transition content fields to course_modules table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_modules' AND column_name = 'completion_summary'
  ) THEN
    ALTER TABLE course_modules ADD COLUMN completion_summary text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_modules' AND column_name = 'next_module_preview'
  ) THEN
    ALTER TABLE course_modules ADD COLUMN next_module_preview text;
  END IF;
END $$;