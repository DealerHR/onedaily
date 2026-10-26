/*
  # Add Manual Schedule Generation Function
  
  1. New Function
    - `generate_delivery_schedule_for_enrollment` - Manually generates delivery schedule for an enrollment
    - Useful for backfilling existing enrollments that don't have schedules
    - Can be called directly unlike trigger functions
*/

CREATE OR REPLACE FUNCTION generate_delivery_schedule_for_enrollment(p_enrollment_id uuid)
RETURNS void AS $$
DECLARE
  v_module RECORD;
  v_lesson RECORD;
  v_course RECORD;
  v_enrollment RECORD;
  v_day_counter INTEGER := 0;
  v_module_index INTEGER := 0;
  v_total_modules INTEGER;
BEGIN
  -- Get enrollment info
  SELECT * INTO v_enrollment
  FROM course_enrollments
  WHERE id = p_enrollment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found';
  END IF;
  
  -- Delete existing deliveries for this enrollment (if any)
  DELETE FROM lesson_deliveries WHERE enrollment_id = p_enrollment_id;
  
  -- Get course info
  SELECT * INTO v_course
  FROM courses
  WHERE id = v_enrollment.course_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found';
  END IF;
  
  -- Get total module count
  SELECT COUNT(*) INTO v_total_modules
  FROM course_modules
  WHERE course_id = v_enrollment.course_id;
  
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
    p_enrollment_id,
    NULL,
    '',
    'Welcome to ' || v_course.title,
    v_enrollment.start_date + (v_day_counter || ' days')::INTERVAL,
    'pending',
    'onboarding'
  );
  
  v_day_counter := v_day_counter + 1;
  
  -- Loop through modules and lessons
  FOR v_module IN
    SELECT * FROM course_modules
    WHERE course_id = v_enrollment.course_id
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
        p_enrollment_id,
        NULL,
        v_module.title,
        'Starting: ' || v_module.title,
        v_enrollment.start_date + (v_day_counter || ' days')::INTERVAL,
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
        p_enrollment_id,
        v_lesson.id,
        v_module.title,
        v_lesson.title,
        v_enrollment.start_date + (v_day_counter || ' days')::INTERVAL,
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
    p_enrollment_id,
    NULL,
    '',
    'Course Complete: ' || v_course.title,
    v_enrollment.start_date + (v_day_counter || ' days')::INTERVAL,
    'pending',
    'completion'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
