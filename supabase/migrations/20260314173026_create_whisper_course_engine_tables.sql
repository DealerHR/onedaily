/*
  # WhiSPER Course Engine Database Schema

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text)
      - `duration` (text) - e.g., "8 weeks"
      - `prerequisites` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `course_modules`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `title` (text)
      - `description` (text)
      - `order_index` (integer)
      - `created_at` (timestamptz)
    
    - `module_lessons`
      - `id` (uuid, primary key)
      - `module_id` (uuid, references course_modules)
      - `title` (text)
      - `content` (text)
      - `learning_objectives` (jsonb) - array of objectives
      - `order_index` (integer)
      - `created_at` (timestamptz)
    
    - `lesson_assignments`
      - `id` (uuid, primary key)
      - `lesson_id` (uuid, references module_lessons)
      - `type` (text) - 'essay', 'multiple_choice', 'short_answer', 'practical'
      - `title` (text)
      - `description` (text)
      - `questions` (jsonb) - array of questions with options
      - `order_index` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own courses
*/

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  duration text DEFAULT '' NOT NULL,
  prerequisites text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create course_modules table
CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create module_lessons table
CREATE TABLE IF NOT EXISTS module_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text DEFAULT '' NOT NULL,
  learning_objectives jsonb DEFAULT '[]'::jsonb NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create lesson_assignments table
CREATE TABLE IF NOT EXISTS lesson_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES module_lessons(id) ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'essay' NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  questions jsonb DEFAULT '[]'::jsonb NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for courses
CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for course_modules
CREATE POLICY "Users can view modules of own courses"
  ON course_modules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_modules.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert modules to own courses"
  ON course_modules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_modules.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update modules of own courses"
  ON course_modules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_modules.course_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_modules.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete modules of own courses"
  ON course_modules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_modules.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Policies for module_lessons
CREATE POLICY "Users can view lessons of own courses"
  ON module_lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_modules
      JOIN courses ON courses.id = course_modules.course_id
      WHERE course_modules.id = module_lessons.module_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lessons to own courses"
  ON module_lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_modules
      JOIN courses ON courses.id = course_modules.course_id
      WHERE course_modules.id = module_lessons.module_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lessons of own courses"
  ON module_lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_modules
      JOIN courses ON courses.id = course_modules.course_id
      WHERE course_modules.id = module_lessons.module_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_modules
      JOIN courses ON courses.id = course_modules.course_id
      WHERE course_modules.id = module_lessons.module_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lessons of own courses"
  ON module_lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_modules
      JOIN courses ON courses.id = course_modules.course_id
      WHERE course_modules.id = module_lessons.module_id
      AND courses.user_id = auth.uid()
    )
  );

-- Policies for lesson_assignments
CREATE POLICY "Users can view assignments of own courses"
  ON lesson_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM module_lessons
      JOIN course_modules ON course_modules.id = module_lessons.module_id
      JOIN courses ON courses.id = course_modules.course_id
      WHERE module_lessons.id = lesson_assignments.lesson_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assignments to own courses"
  ON lesson_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM module_lessons
      JOIN course_modules ON course_modules.id = module_lessons.module_id
      JOIN courses ON courses.id = course_modules.course_id
      WHERE module_lessons.id = lesson_assignments.lesson_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update assignments of own courses"
  ON lesson_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM module_lessons
      JOIN course_modules ON course_modules.id = module_lessons.module_id
      JOIN courses ON courses.id = course_modules.course_id
      WHERE module_lessons.id = lesson_assignments.lesson_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM module_lessons
      JOIN course_modules ON course_modules.id = module_lessons.module_id
      JOIN courses ON courses.id = course_modules.course_id
      WHERE module_lessons.id = lesson_assignments.lesson_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assignments of own courses"
  ON lesson_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM module_lessons
      JOIN course_modules ON course_modules.id = module_lessons.module_id
      JOIN courses ON courses.id = course_modules.course_id
      WHERE module_lessons.id = lesson_assignments.lesson_id
      AND courses.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_module_lessons_module_id ON module_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson_id ON lesson_assignments(lesson_id);
