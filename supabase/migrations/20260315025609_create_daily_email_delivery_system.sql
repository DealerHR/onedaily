/*
  # Daily Email Delivery System for WhiSPER

  1. New Tables
    - `course_enrollments`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `assigned_by` (uuid, references auth.users)
      - `recipient_email` (text)
      - `recipient_name` (text)
      - `start_date` (date) - when to start sending lessons
      - `current_lesson_index` (integer) - track which lesson they're on
      - `status` (text) - 'active', 'completed', 'paused'
      - `created_at` (timestamptz)
    
    - `lesson_deliveries`
      - `id` (uuid, primary key)
      - `enrollment_id` (uuid, references course_enrollments)
      - `lesson_id` (uuid, references module_lessons)
      - `scheduled_for` (date)
      - `sent_at` (timestamptz)
      - `status` (text) - 'pending', 'sent', 'failed'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only manage their own course enrollments
*/

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text DEFAULT '' NOT NULL,
  start_date date DEFAULT CURRENT_DATE NOT NULL,
  current_lesson_index integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create lesson_deliveries table
CREATE TABLE IF NOT EXISTS lesson_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES course_enrollments(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES module_lessons(id) ON DELETE CASCADE NOT NULL,
  module_title text DEFAULT '' NOT NULL,
  lesson_title text DEFAULT '' NOT NULL,
  scheduled_for date NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_deliveries ENABLE ROW LEVEL SECURITY;

-- Policies for course_enrollments
CREATE POLICY "Users can view own course enrollments"
  ON course_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = assigned_by);

CREATE POLICY "Users can create enrollments for own courses"
  ON course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = assigned_by AND
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own course enrollments"
  ON course_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_by)
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can delete own course enrollments"
  ON course_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = assigned_by);

-- Policies for lesson_deliveries
CREATE POLICY "Users can view lesson deliveries for own enrollments"
  ON lesson_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.id = lesson_deliveries.enrollment_id
      AND course_enrollments.assigned_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert lesson deliveries for own enrollments"
  ON lesson_deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.id = lesson_deliveries.enrollment_id
      AND course_enrollments.assigned_by = auth.uid()
    )
  );

CREATE POLICY "Users can update lesson deliveries for own enrollments"
  ON lesson_deliveries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.id = lesson_deliveries.enrollment_id
      AND course_enrollments.assigned_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.id = lesson_deliveries.enrollment_id
      AND course_enrollments.assigned_by = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_lesson_deliveries_enrollment_id ON lesson_deliveries(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_deliveries_scheduled_for ON lesson_deliveries(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_lesson_deliveries_status ON lesson_deliveries(status);

-- Drop the old course_assignments table if it exists
DROP TABLE IF EXISTS course_assignments;
