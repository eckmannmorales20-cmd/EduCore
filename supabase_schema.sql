-- SQL Schema for Supabase - UTC Administration System

-- 1. Profiles Table (Extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('ADMIN', 'DOCENTE', 'COBRANZA')) NOT NULL DEFAULT 'DOCENTE',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Careers Table
CREATE TABLE careers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  head_of_career TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Teachers Table
CREATE TABLE teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  specialty TEXT,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Subjects Table
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  semester INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  career_id UUID REFERENCES careers(id) ON DELETE SET NULL,
  evaluation_progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Groups Table
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  semester TEXT NOT NULL,
  career_id UUID REFERENCES careers(id) ON DELETE CASCADE,
  modality TEXT CHECK (modality IN ('Escolarizada', 'Ejecutiva', 'Sabatina')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Students Table
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  enrollment TEXT NOT NULL UNIQUE,
  career_id UUID REFERENCES careers(id) ON DELETE SET NULL,
  semester INTEGER NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  modality TEXT CHECK (modality IN ('Escolarizada', 'Ejecutiva', 'Sabatina')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Rubrics Table
CREATE TABLE rubrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Rubric Criteria Table
CREATE TABLE rubric_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rubric_id UUID REFERENCES rubrics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL CHECK (weight >= 0 AND weight <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Evaluations Table
CREATE TABLE evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES rubrics(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}', -- criterion_id -> score
  total_score NUMERIC(4,2),
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Student Debts Table (Cobranza)
CREATE TABLE student_debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  year INTEGER NOT NULL,
  tuition_debt NUMERIC(10,2) DEFAULT 0,
  power_course_debt NUMERIC(10,2) DEFAULT 0,
  admin_debt NUMERIC(10,2) DEFAULT 0,
  reinstatement_debt NUMERIC(10,2) DEFAULT 0,
  other_debt NUMERIC(10,2) DEFAULT 0,
  campus TEXT,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  debt_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Partial Grades Table
CREATE TABLE partial_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  p1 NUMERIC(4,2) DEFAULT 0,
  p2 NUMERIC(4,2) DEFAULT 0,
  p3 NUMERIC(4,2) DEFAULT 0,
  average NUMERIC(4,2) DEFAULT 0,
  status TEXT CHECK (status IN ('approved', 'failed')) DEFAULT 'failed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(student_id, subject_id, group_id)
);

-- 12. Activity History Table
CREATE TABLE activity_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('create', 'update', 'delete', 'import')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 13. Subject Enrollments Table
CREATE TABLE subject_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  period TEXT,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(student_id, subject_id, group_id)
);

-- RLS (Row Level Security) Examples
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Add more RLS policies as needed for other tables based on roles
