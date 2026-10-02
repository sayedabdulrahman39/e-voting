-- ==============================================================================
-- Migration 001: Production Schema for Tri-Modular E-Voting (Supabase Postgres)
-- ==============================================================================

-- 1. Custom Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'CANDIDATE', 'VOTER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE election_status AS ENUM ('DRAFT', 'REGISTRATION', 'LOCKED', 'OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'VOTER',
  full_name TEXT,
  voter_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Elections Table
CREATE TABLE IF NOT EXISTS elections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status election_status NOT NULL DEFAULT 'DRAFT',
  merkle_root TEXT,
  tree_depth INT NOT NULL DEFAULT 16,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  party TEXT,
  bio TEXT,
  manifesto_text TEXT,
  manifesto_hash TEXT,
  attest_tx TEXT,
  stance_vector JSONB DEFAULT '[3,3,3,3,3,3]'::JSONB,
  approved BOOLEAN DEFAULT FALSE,
  votes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Voter Eligibility (Tracks who is eligible and who submitted a commitment)
CREATE TABLE IF NOT EXISTS voter_eligibility (
  election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  eligible BOOLEAN DEFAULT TRUE,
  commitment_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (election_id, user_id)
);

-- 6. Voter Commitments (PUBLIC list, NO user_id column for unlinkability)
CREATE TABLE IF NOT EXISTS voter_commitments (
  election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE,
  commitment TEXT NOT NULL,
  leaf_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (election_id, commitment)
);

-- 7. Audit Log (Stage transitions and on-chain tx hashes)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id BIGINT REFERENCES elections(id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  tx_hash TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Security Definer Helpers & Triggers
-- ==============================================================================

-- Helper to check if current user is ADMIN without recursive RLS checks
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Trigger to automatically create a profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Voter'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'VOTER'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Trigger on Candidate edit: modifying manifesto resets approval status until re-attested
CREATE OR REPLACE FUNCTION handle_candidate_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.manifesto_text IS DISTINCT FROM NEW.manifesto_text) OR (OLD.manifesto_hash IS DISTINCT FROM NEW.manifesto_hash) THEN
    NEW.approved := FALSE;
    NEW.attest_tx := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_candidate_updated ON candidates;
CREATE TRIGGER on_candidate_updated
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE PROCEDURE handle_candidate_update();

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile or Admin reads all" ON profiles;
CREATE POLICY "Users can read own profile or Admin reads all"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can update own profile (excluding role)" ON profiles;
CREATE POLICY "Users can update own profile (excluding role)"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Elections Policies
DROP POLICY IF EXISTS "Public can view elections" ON elections;
CREATE POLICY "Public can view elections"
  ON elections FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admin can modify elections" ON elections;
CREATE POLICY "Only admin can modify elections"
  ON elections FOR ALL
  USING (is_admin());

-- 3. Candidates Policies
DROP POLICY IF EXISTS "Public can view approved candidates or candidate views own" ON candidates;
CREATE POLICY "Public can view approved candidates or candidate views own"
  ON candidates FOR SELECT
  USING (approved = true OR auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "Candidates can edit own profile" ON candidates;
CREATE POLICY "Candidates can edit own profile"
  ON candidates FOR UPDATE
  USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "Candidates can insert own profile" ON candidates;
CREATE POLICY "Candidates can insert own profile"
  ON candidates FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR is_admin());

-- 4. Voter Eligibility Policies
DROP POLICY IF EXISTS "Users read own eligibility or Admin reads all" ON voter_eligibility;
CREATE POLICY "Users read own eligibility or Admin reads all"
  ON voter_eligibility FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Admin full access to eligibility" ON voter_eligibility;
CREATE POLICY "Admin full access to eligibility"
  ON voter_eligibility FOR ALL
  USING (is_admin());

-- 5. Voter Commitments Policies
DROP POLICY IF EXISTS "Public can read commitments" ON voter_commitments;
CREATE POLICY "Public can read commitments"
  ON voter_commitments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users or admin can insert commitments" ON voter_commitments;
CREATE POLICY "Authenticated users or admin can insert commitments"
  ON voter_commitments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR is_admin());

-- 6. Audit Log Policies
DROP POLICY IF EXISTS "Public can read audit logs" ON audit_log;
CREATE POLICY "Public can read audit logs"
  ON audit_log FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can insert audit logs" ON audit_log;
CREATE POLICY "Admin can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (is_admin());

-- ==============================================================================
-- Realtime Subscriptions
-- ==============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE elections;
  ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
  ALTER PUBLICATION supabase_realtime ADD TABLE voter_commitments;
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;
