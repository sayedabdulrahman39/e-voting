-- ==============================================================================
-- Migration 001: Initial Schema for Tri-Modular E-Voting
-- ==============================================================================

-- Custom Enum Types
CREATE TYPE user_role AS ENUM ('ADMIN', 'CANDIDATE', 'VOTER');
CREATE TYPE election_status AS ENUM ('DRAFT', 'REGISTRATION', 'LOCKED', 'OPEN', 'CLOSED');

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'VOTER',
  full_name TEXT,
  voter_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Elections Table
CREATE TABLE elections (
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

-- 3. Candidates Table
CREATE TABLE candidates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id BIGINT REFERENCES elections ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  manifesto_text TEXT,
  manifesto_hash TEXT,
  attest_tx TEXT,
  stance_vector JSONB, -- 6 topic scores (1..5)
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Voter Eligibility (Who is allowed to submit a commitment)
CREATE TABLE voter_eligibility (
  election_id BIGINT REFERENCES elections ON DELETE CASCADE,
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  eligible BOOLEAN DEFAULT FALSE,
  commitment_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (election_id, user_id)
);

-- 5. Voter Commitments (PUBLIC list, NO user_id column for privacy unlinkability)
CREATE TABLE voter_commitments (
  election_id BIGINT REFERENCES elections ON DELETE CASCADE,
  commitment TEXT NOT NULL,
  leaf_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (election_id, commitment)
);

-- 6. Audit Log (Stage transitions and on-chain tx hashes)
CREATE TABLE audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id BIGINT REFERENCES elections ON DELETE SET NULL,
  stage TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
