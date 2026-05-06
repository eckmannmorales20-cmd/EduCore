-- Add missing columns to subjects table
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_common_core BOOLEAN DEFAULT false;

-- If you want to associate subjects with groups directly (not recommended but mapping suggests it)
-- ALTER TABLE subjects ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Ensure RLS is enabled and policies exist
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subjects' AND policyname = 'Allow all access to authenticated users for subjects'
    ) THEN
        CREATE POLICY "Allow all access to authenticated users for subjects" 
        ON subjects FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
