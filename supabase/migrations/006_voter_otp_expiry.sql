-- ==============================================================================
-- Migration 006: Add OTP Code & Expiration Timestamp to Voter Registry Table
-- ==============================================================================

ALTER TABLE voter_registry ADD COLUMN IF NOT EXISTS otp_code TEXT DEFAULT '123';
ALTER TABLE voter_registry ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- Ensure public anon role can update otp_code and otp_expires_at during login
DROP POLICY IF EXISTS "Anyone can update voter registry" ON voter_registry;
CREATE POLICY "Anyone can update voter registry"
  ON voter_registry FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Public can view voter registry" ON voter_registry;
CREATE POLICY "Public can view voter registry"
  ON voter_registry FOR SELECT
  USING (true);
