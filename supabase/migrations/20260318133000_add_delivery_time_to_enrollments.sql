/*
  # Add Delivery Time to Course Enrollments

  1. Changes
    - Add `delivery_time` column to `course_enrollments` table
      - Stores the preferred time of day for email delivery (e.g., '09:00', '14:30')
      - Defaults to '09:00' (9 AM)
    
  2. Function Updates
    - Update `create_lesson_delivery_schedule` function to use the delivery_time
    - Emails will now be scheduled at the specific time instead of midnight
*/

-- Add delivery_time column to course_enrollments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_enrollments' AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE course_enrollments 
    ADD COLUMN delivery_time time DEFAULT '09:00:00' NOT NULL;
  END IF;
END $$;

-- Update the create_lesson_delivery_schedule function to use delivery_time
CREATE OR REPLACE FUNCTION create_lesson_delivery_schedule()
RETURNS TRIGGER AS $$
DECLARE
  v_module RECORD;
  v_lesson RECORD;
  v_course RECORD;
  v_day_counter INTEGER := 0;
  v_module_index INTEGER := 0;
  v_total_modules INTEGER;
  v_scheduled_timestamp timestamptz;
BEGIN
  -- Get course info
  SELECT * INTO v_course
  FROM courses
  WHERE id = NEW.course_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Get total module count
  SELECT COUNT(*) INTO v_total_modules
  FROM course_modules
  WHERE course_id = NEW.course_id;
  
  -- Day 1: Onboarding email
  v_scheduled_timestamp := (NEW.start_date + NEW.delivery_time)::timestamptz + (v_day_counter || ' days')::INTERVAL;
  
  INSERT INTO lesson_deliveries (
    enrollment_id,
    lesson_id,
    module_title,
    lesson_title,
    scheduled_for,
    status,
    delivery_type
  ) VALUES (
    NEW.id,
    NULL,
    '',
    'Welcome to ' || v_course.title,
    v_scheduled_timestamp,
    'pending',
    'onboarding'
  );
  
  v_day_counter := v_day_counter + 1;
  
  -- Loop through modules and lessons
  FOR v_module IN
    SELECT * FROM course_modules
    WHERE course_id = NEW.course_id
    ORDER BY order_index
  LOOP
    v_module_index := v_module_index + 1;
    
    -- Add module transition email (except for first module)
    IF v_module_index > 1 THEN
      v_scheduled_timestamp := (NEW.start_date + NEW.delivery_time)::timestamptz + (v_day_counter || ' days')::INTERVAL;
      
      INSERT INTO lesson_deliveries (
        enrollment_id,
        lesson_id,
        module_title,
        lesson_title,
        scheduled_for,
        status,
        delivery_type
      ) VALUES (
        NEW.id,
        NULL,
        v_module.title,
        'Starting: ' || v_module.title,
        v_scheduled_timestamp,
        'pending',
        'transition'
      );
      
      v_day_counter := v_day_counter + 1;
    END IF;
    
    -- Add lessons for this module
    FOR v_lesson IN
      SELECT * FROM module_lessons
      WHERE module_id = v_module.id
      ORDER BY order_index
    LOOP
      v_scheduled_timestamp := (NEW.start_date + NEW.delivery_time)::timestamptz + (v_day_counter || ' days')::INTERVAL;
      
      INSERT INTO lesson_deliveries (
        enrollment_id,
        lesson_id,
        module_title,
        lesson_title,
        scheduled_for,
        status,
        delivery_type
      ) VALUES (
        NEW.id,
        v_lesson.id,
        v_module.title,
        v_lesson.title,
        v_scheduled_timestamp,
        'pending',
        'lesson'
      );
      
      v_day_counter := v_day_counter + 1;
    END LOOP;
  END LOOP;
  
  -- Add completion email
  v_scheduled_timestamp := (NEW.start_date + NEW.delivery_time)::timestamptz + (v_day_counter || ' days')::INTERVAL;
  
  INSERT INTO lesson_deliveries (
    enrollment_id,
    lesson_id,
    module_title,
    lesson_title,
    scheduled_for,
    status,
    delivery_type
  ) VALUES (
    NEW.id,
    NULL,
    '',
    'Course Complete: ' || v_course.title,
    v_scheduled_timestamp,
    'pending',
    'completion'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;