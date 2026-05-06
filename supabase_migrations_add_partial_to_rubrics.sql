-- Migration: Add partial column to rubrics table
ALTER TABLE rubrics ADD COLUMN partial INTEGER CHECK (partial IN (1, 2, 3));
