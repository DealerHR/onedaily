/*
  # Add delivery_type to lesson_deliveries

  1. Changes
    - Add `delivery_type` column to track email type (onboarding, lesson, transition, completion)
    - Update existing records to have 'lesson' as default type
  
  2. Purpose
    - Support different email formats for different stages of the course
    - Enable proper email template selection based on delivery type
*/

-- Add delivery_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_deliveries' AND column_name = 'delivery_type'
  ) THEN
    ALTER TABLE lesson_deliveries ADD COLUMN delivery_type text DEFAULT 'lesson' NOT NULL;
  END IF;
END $$;

-- Update existing records to have 'lesson' type
UPDATE lesson_deliveries SET delivery_type = 'lesson' WHERE delivery_type IS NULL;