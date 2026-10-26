/*
  # Create PDF Storage Bucket

  1. Storage
    - Create `course-pdfs` bucket for storing uploaded PDF files
    - Enable RLS on bucket
    - Add policy for authenticated users to upload their own PDFs
    - Add policy for authenticated users to read their own PDFs
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-pdfs',
  'course-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);