-- Add team_size column to fantasy_drafts table
-- This allows each draft to have a dynamic team size based on participants/users

ALTER TABLE fantasy_drafts
ADD COLUMN team_size INTEGER DEFAULT 10 NOT NULL;

COMMENT ON COLUMN fantasy_drafts.team_size IS 'Number of picks each user makes, calculated as floor(total_participants / total_users)';
