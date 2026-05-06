-- Migration to add Microsoft Teams integration columns to the groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS azure_group_id UUID;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS teams_id TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_teams_active BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS ms_team_id TEXT; -- For backward compatibility
ALTER TABLE groups ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'idle';
