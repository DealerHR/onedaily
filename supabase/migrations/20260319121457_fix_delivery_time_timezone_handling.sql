/*
  # Fix Delivery Time Timezone Handling

  1. Changes
    - Add `timezone` column to `course_enrollments` table
      - Stores the user's timezone (e.g., 'Asia/Kolkata', 'America/New_York')
      - Defaults to 'UTC'

  2. Function Updates
    - Update `create_lesson_delivery_schedule` function to properly handle timezones
    - Convert local delivery time to UTC for proper scheduling
    - Ensures scheduled times match user expectations regardless of timezone

  ## Problem
  Previously, when a user in India (UTC+5:30) entered 17:50 as delivery time:
  - Time was stored as '17:50:00' (without timezone)
  - Combined with date and cast to timestamptz, PostgreSQL assumed it was UTC
  - When displayed back to user, it converted to IST: 17:50 UTC → 23:20 IST (wrong!)

  ## Solution
  Now we store the user's timezone and use it to properly interpret the delivery time:
  - User enters 17:50 in their local timezone (IST)
  - We combine date + time AT TIME ZONE user_tz to create proper local timestamp
  - This is then stored in UTC in the database
  - When displayed, it converts back correctly: 17:50 IST → stored as 12:20 UTC → displays as 17:50 IST
*/

-- Add timezone column to course_enrollments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_enrollments' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE course_enrollments
    ADD COLUMN timezone text DEFAULT 'UTC' NOT NULL;
  END IF;
END $$;

-- Update the create_lesson_delivery_schedule function to properly handle timezones
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
  v_base_date date;
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
  v_base_date := NEW.start_date + (v_day_counter || ' days')::INTERVAL;
  -- Combine date and time in the user's timezone, then convert to UTC
  v_scheduled_timestamp := (v_base_date || ' ' || NEW.delivery_time)::timestamp AT TIME ZONE NEW.timezone;

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
      v_base_date := NEW.start_date + (v_day_counter || ' days')::INTERVAL;
      v_scheduled_timestamp := (v_base_date || ' ' || NEW.delivery_time)::timestamp AT TIME ZONE NEW.timezone;

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
      v_base_date := NEW.start_date + (v_day_counter || ' days')::INTERVAL;
      v_scheduled_timestamp := (v_base_date || ' ' || NEW.delivery_time)::timestamp AT TIME ZONE NEW.timezone;

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
  v_base_date := NEW.start_date + (v_day_counter || ' days')::INTERVAL;
  v_scheduled_timestamp := (v_base_date || ' ' || NEW.delivery_time)::timestamp AT TIME ZONE NEW.timezone;

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