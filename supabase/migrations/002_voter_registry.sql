-- ==============================================================================
-- Migration 002: Voter ID & Constituency Support
-- ==============================================================================

-- Add constituency column to candidates if not present
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS constituency TEXT DEFAULT 'North Metro District';

-- 1. Voter Registry Table for Voter ID + OTP Authentication
CREATE TABLE IF NOT EXISTS voter_registry (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE,
  voter_id_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  constituency TEXT NOT NULL DEFAULT 'North Metro District',
  has_voted BOOLEAN DEFAULT FALSE,
  otp_code TEXT DEFAULT '123',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE voter_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can check voter id" ON voter_registry;
CREATE POLICY "Public can check voter id"
  ON voter_registry FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full access to voter registry" ON voter_registry;
CREATE POLICY "Admin full access to voter registry"
  ON voter_registry FOR ALL
  USING (is_admin());

-- Add to Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE voter_registry;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;
