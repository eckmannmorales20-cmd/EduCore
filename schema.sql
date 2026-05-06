-- EDUCORE MASTER DATABASE SCHEMA
-- Compatible with PostgreSQL (Supabase)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'DOCENTE', 'COBRANZA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CORE TABLES

-- PROFILES (Instead of standard users, to allow manual credential check)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    username TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Matched to 'password' field in code
    role user_role NOT NULL DEFAULT 'DOCENTE',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAREERS
CREATE TABLE IF NOT EXISTS careers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    head_of_career TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    specialty TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GROUPS
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    groups TEXT, -- For legacy compatibility
    semester TEXT DEFAULT '1',
    career_id UUID REFERENCES careers(id),
    modality TEXT DEFAULT 'Escolarizada',
    students_count INTEGER DEFAULT 0,
    teacher_id UUID REFERENCES teachers(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id UUID REFERENCES careers(id) ON DELETE CASCADE,
    career TEXT, -- Denormalized name for legacy compatibility
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    semester TEXT NOT NULL,
    credits INTEGER DEFAULT 8,
    is_common_core BOOLEAN DEFAULT false,
    teacher_id UUID REFERENCES teachers(id),
    group_id UUID REFERENCES groups(id), -- Direct link for some flows
    evaluation_progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    enrollment TEXT UNIQUE NOT NULL,
    career_id UUID REFERENCES careers(id),
    group_id UUID REFERENCES groups(id),
    semester TEXT DEFAULT '1',
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    email TEXT,
    modality TEXT DEFAULT 'Escolarizada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACADEMIC DATA

-- PARTIAL GRADES
CREATE TABLE IF NOT EXISTS partial_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    p1 DECIMAL(4,2) DEFAULT 0,
    p2 DECIMAL(4,2) DEFAULT 0,
    p3 DECIMAL(4,2) DEFAULT 0,
    average DECIMAL(4,2) DEFAULT 0,
    status TEXT DEFAULT 'failed', -- 'approved', 'failed'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject_id, group_id)
);

-- SUBJECT ENROLLMENTS
CREATE TABLE IF NOT EXISTS subject_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject_id)
);

-- EVALUATIONS & RUBRICS
CREATE TABLE IF NOT EXISTS rubrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    assignment_name TEXT NOT NULL,
    type TEXT, -- 'individual', 'group'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COLLECTIONS (COBRANZA)

-- STUDENT DEBTS
CREATE TABLE IF NOT EXISTS student_debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    year INTEGER NOT NULL,
    campus TEXT DEFAULT 'Principal',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tuition_debt DECIMAL(12,2) DEFAULT 0,
    reinstatement_debt DECIMAL(12,2) DEFAULT 0,
    power_course_debt DECIMAL(12,2) DEFAULT 0,
    admin_debt DECIMAL(12,2) DEFAULT 0,
    other_debt DECIMAL(12,2) DEFAULT 0,
    debt_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AUDIT & LOGS
CREATE TABLE IF NOT EXISTS activity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    details TEXT,
    type TEXT, -- 'import', 'update', 'delete', 'sync'
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INITIAL ADMIN USER (Optional)
-- INSERT INTO profiles (name, email, password, role) 
-- VALUES ('Admin EduCore', 'admin@educore.mx', 'admin123', 'ADMIN') 
-- ON CONFLICT (email) DO NOTHING;
