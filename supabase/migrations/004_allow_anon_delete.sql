-- ==============================================================================
-- Migration 004: Allow Anon Delete Policies
-- Enables the anon role to permanently remove elections and candidates from Supabase
-- ==============================================================================

DROP POLICY IF EXISTS "Anyone can delete candidates" ON candidates;
CREATE POLICY "Anyone can delete candidates"
  ON candidates FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete elections" ON elections;
CREATE POLICY "Anyone can delete elections"
  ON elections FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete commitments" ON voter_commitments;
CREATE POLICY "Anyone can delete commitments"
  ON voter_commitments FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete audit logs" ON audit_log;
CREATE POLICY "Anyone can delete audit logs"
  ON audit_log FOR DELETE
  USING (true);
