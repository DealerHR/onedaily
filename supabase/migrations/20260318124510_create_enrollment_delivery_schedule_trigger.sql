/*
  # Create Lesson Delivery Schedule Trigger
  
  1. New Function
    - `create_lesson_delivery_schedule` - Automatically creates a delivery schedule when a student is enrolled
    - Creates onboarding email, transition emails between modules, lesson emails, and completion email
    - Schedules emails based on the start_date and daily delivery
  
  2. Trigger
    - `on_enrollment_created` - Runs after a new enrollment is inserted
    - Automatically generates the full email schedule for the enrolled student
*/

-- Function to create lesson delivery schedule
CREATE OR REPLACE FUNCTION create_lesson_delivery_schedule()
RETURNS TRIGGER AS $$
DECLARE
  v_module RECORD;
  v_lesson RECORD;
  v_course RECORD;
  v_day_counter INTEGER := 0;
  v_module_index INTEGER := 0;
  v_total_modules INTEGER;
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
    NEW.start_date + (v_day_counter || ' days')::INTERVAL,
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
        NEW.start_date + (v_day_counter || ' days')::INTERVAL,
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
        NEW.start_date + (v_day_counter || ' days')::INTERVAL,
        'pending',
        'lesson'
      );
      
      v_day_counter := v_day_counter + 1;
    END LOOP;
  END LOOP;
  
  -- Add completion email
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
    NEW.start_date + (v_day_counter || ' days')::INTERVAL,
    'pending',
    'completion'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_enrollment_created ON course_enrollments;

CREATE TRIGGER on_enrollment_created
  AFTER INSERT ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION create_lesson_delivery_schedule();
