-- Migration: Create subject_criteria table
CREATE TABLE IF NOT EXISTS subject_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
