-- ==============================================================================
-- Migration 003: Real-Time Fresh Start
-- Adds candidate auth columns, election timestamps, and clears all mock data.
-- ==============================================================================

-- 1. Add candidate self-registration auth columns
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Add real timestamp tracking for performance metrics
ALTER TABLE elections ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 3. Clear ALL existing demo/mock data (fresh slate)
DELETE FROM audit_log;
DELETE FROM voter_commitments;
DELETE FROM candidates;
DELETE FROM elections;

-- 4. Reset voter_registry has_voted flags so voters can vote again
UPDATE voter_registry SET has_voted = false;

-- 5. Open RLS policies for anon candidate self-registration
--    (Since we're using anon key, not Supabase Auth, we need open policies)
DROP POLICY IF EXISTS "Public can view approved candidates or candidate views own" ON candidates;
CREATE POLICY "Public can view all candidates"
  ON candidates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Candidates can edit own profile" ON candidates;
CREATE POLICY "Anyone can update candidates"
  ON candidates FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Candidates can insert own profile" ON candidates;
CREATE POLICY "Anyone can insert candidates"
  ON candidates FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admin can modify elections" ON elections;
CREATE POLICY "Anyone can insert elections"
  ON elections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update elections"
  ON elections FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admin can insert audit logs" ON audit_log;
CREATE POLICY "Anyone can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users or admin can insert commitments" ON voter_commitments;
CREATE POLICY "Anyone can insert commitments"
  ON voter_commitments FOR INSERT
  WITH CHECK (true);

-- 6. Allow anon to update voter_registry (mark has_voted)
DROP POLICY IF EXISTS "Admin full access to voter registry" ON voter_registry;
CREATE POLICY "Anyone can update voter registry"
  ON voter_registry FOR UPDATE
  USING (true);
