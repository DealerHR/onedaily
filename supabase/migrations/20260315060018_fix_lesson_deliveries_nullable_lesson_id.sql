/*
  # Fix lesson_deliveries table to allow null lesson_id
  
  1. Changes
    - Make `lesson_id` column nullable in `lesson_deliveries` table
    - This allows for onboarding, transition, and completion emails which don't have an associated lesson
  
  2. Reason
    - Onboarding emails (delivery_type: 'onboarding') don't have a lesson_id
    - Module transition emails (delivery_type: 'transition') don't have a lesson_id
    - Course completion emails (delivery_type: 'completion') don't have a lesson_id
    - Only lesson emails (delivery_type: 'lesson') have a lesson_id
*/

-- Make lesson_id nullable
DO $$
BEGIN
  -- Drop the NOT NULL constraint on lesson_id
  ALTER TABLE lesson_deliveries 
  ALTER COLUMN lesson_id DROP NOT NULL;
END $$;
