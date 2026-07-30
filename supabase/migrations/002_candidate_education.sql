-- Add education field to candidate profiles for filtering and profile display
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS education VARCHAR(255);
