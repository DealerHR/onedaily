/*
  # Add Course Sharing and Email Delivery

  1. New Tables
    - `course_assignments`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `assigned_by` (uuid, references auth.users)
      - `recipient_email` (text)
      - `recipient_name` (text)
      - `status` (text) - 'pending', 'sent', 'failed'
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on course_assignments table
    - Users can only assign their own courses
*/

-- Create course_assignments table
CREATE TABLE IF NOT EXISTS course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text DEFAULT '' NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own course assignments"
  ON course_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = assigned_by);

CREATE POLICY "Users can create assignments for own courses"
  ON course_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = assigned_by AND
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_assignments.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own course assignments"
  ON course_assignments FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_by)
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can delete own course assignments"
  ON course_assignments FOR DELETE
  TO authenticated
  USING (auth.uid() = assigned_by);

-- Create index
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_id ON course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_status ON course_assignments(status);
