-- Add career and is_common_core columns to subjects table

-- 1. Add career column (can be a foreign key or just text, using text for flexibility as per frontend)
-- Ideally it should reference careers(id), but frontend uses string names. 
-- Let's add both options: a text column for the name (as used in frontend) or a FK.
-- Based on the frontend code: career: 'Ingeniería de Sistemas Computacionales'
ALTER TABLE subjects 
ADD COLUMN career TEXT;

-- 2. Add is_common_core column (boolean)
ALTER TABLE subjects 
ADD COLUMN is_common_core BOOLEAN DEFAULT FALSE;

-- Optional: Add an index for faster filtering
CREATE INDEX idx_subjects_career ON subjects(career);
CREATE INDEX idx_subjects_is_common_core ON subjects(is_common_core);

-- Comment:
-- If you want to enforce strict relationships, you should use a foreign key:
-- ALTER TABLE subjects ADD COLUMN career_id UUID REFERENCES careers(id);
-- But based on the current frontend implementation which uses string names for filtering, 
-- a TEXT column is more aligned with the current mock data structure.
