-- Add year column to participants table
-- This allows filtering participants by year to prevent mixing different years

ALTER TABLE participants
ADD COLUMN year INTEGER NOT NULL DEFAULT 2025;

CREATE INDEX idx_participants_year ON participants(year);

COMMENT ON COLUMN participants.year IS 'Eurovision year for this participant (e.g., 2025, 2026, 2027)';
