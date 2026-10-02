-- ==============================================================================
-- Fresh Seed: Only 6 Pre-Seeded Voter IDs (No elections, no candidates)
-- ==============================================================================
-- All elections and candidates will be created live by Admin & Candidates.
-- Voter IDs are pre-registered by the Election Commission.

INSERT INTO voter_registry (voter_id_number, full_name, email, constituency, has_voted, otp_code)
VALUES
('VOT-2026-001', 'Alice Johnson',   'alice@example.com',   'North Metro District',    false, '123'),
('VOT-2026-002', 'David Kumar',     'david@example.com',   'North Metro District',    false, '123'),
('VOT-2026-003', 'Sophia Martinez', 'sophia@example.com',  'South Central District',  false, '123'),
('VOT-2026-004', 'Michael Chen',    'michael@example.com', 'South Central District',  false, '123'),
('VOT-2026-005', 'Emily Watson',    'emily@example.com',   'East Bay District',       false, '123'),
('VOT-2026-006', 'James Patel',     'james@example.com',   'East Bay District',       false, '123')
ON CONFLICT (voter_id_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  constituency = EXCLUDED.constituency,
  has_voted = false;
