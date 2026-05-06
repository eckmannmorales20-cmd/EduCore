-- SQL to fix missing tables in Supabase
-- Run this in your Supabase SQL Editor

-- 1. Create activity_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('create', 'update', 'delete', 'import')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create subject_enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS subject_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  period TEXT,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(student_id, subject_id, group_id)
);

-- 3. Enable RLS and add policies
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to authenticated users for activity_history" 
ON activity_history FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all access to authenticated users for subject_enrollments" 
ON subject_enrollments FOR ALL USING (auth.role() = 'authenticated');
