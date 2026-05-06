-- Add team_created column to groups table to track which groups already have an associated MS Team

ALTER TABLE groups ADD COLUMN IF NOT EXISTS team_created BOOLEAN DEFAULT false;
