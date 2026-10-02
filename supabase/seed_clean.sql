-- ==============================================================================
-- Clean Seed Data with 6 Pre-Seeded Voter IDs & Multi-Constituency Candidates
-- ==============================================================================

-- 1. Create Initial Live Election
INSERT INTO elections (id, title, description, status, merkle_root, tree_depth, starts_at, ends_at)
OVERRIDING SYSTEM VALUE
VALUES (
  1,
  '2026 National Parliamentary General Election',
  'Multi-constituency general election for parliamentary representatives across North Metro, South Central, and East Bay.',
  'OPEN',
  '0x098418a0bc9812490bca81940bca81940bca81940bca81940bca81940bca8194',
  16,
  NOW() - INTERVAL '2 hours',
  NOW() + INTERVAL '5 days'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- 2. Insert 6 Registered Voters (2 per constituency, OTP = 123)
INSERT INTO voter_registry (id, election_id, voter_id_number, full_name, email, constituency, has_voted, otp_code)
OVERRIDING SYSTEM VALUE
VALUES
(1, 1, 'VOT-2026-001', 'Alice Johnson', 'alice@example.com', 'North Metro District', false, '123'),
(2, 1, 'VOT-2026-002', 'David Kumar', 'david@example.com', 'North Metro District', false, '123'),
(3, 1, 'VOT-2026-003', 'Sophia Martinez', 'sophia@example.com', 'South Central District', false, '123'),
(4, 1, 'VOT-2026-004', 'Michael Chen', 'michael@example.com', 'South Central District', false, '123'),
(5, 1, 'VOT-2026-005', 'Emily Watson', 'emily@example.com', 'East Bay District', false, '123'),
(6, 1, 'VOT-2026-006', 'James Patel', 'james@example.com', 'East Bay District', false, '123')
ON CONFLICT (voter_id_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  constituency = EXCLUDED.constituency;

-- 3. Insert Constituency-Specific Candidates
INSERT INTO candidates (id, election_id, display_name, party, constituency, bio, manifesto_text, manifesto_hash, attest_tx, stance_vector, approved, votes_count)
OVERRIDING SYSTEM VALUE
VALUES
-- North Metro District Candidates
(
  1, 1,
  'Dr. Sarah Lin', 'Digital Progress Alliance', 'North Metro District',
  'Champion of citizen privacy, healthcare modernization, and clean tech innovation.',
  'We champion open-source governance, universal public healthcare access, and rapid 100% renewable energy transition in North Metro.',
  '0x04463dc68b0bfa3f80cffb90875e4e89bbdf6708b77fe7e61a86ffef553e1cb1',
  '0x3a79d8ef924840bcad81940bcad81940bcad81940bcad81940bcad81940bcad81',
  '[4, 5, 5, 2, 5, 5]'::JSONB, true, 0
),
(
  2, 1,
  'Marcus Vance', 'Freedom & Innovation Coalition', 'North Metro District',
  'Advocating free-market enterprise, lower local taxes, and private sector growth.',
  'Unleashing economic growth in North Metro through competitive business incentives and minimal regulatory red tape.',
  '0x0c99f928e4693a1f94c5e3f191b79f2eaae700305cb2243d463d1ceee3663677',
  '0x892a40bfd1928014bcad81940bcad81940bcad81940bcad81940bcad81940bcad82',
  '[1, 2, 1, 1, 1, 2]'::JSONB, true, 0
),
-- South Central District Candidates
(
  3, 1,
  'Elena Rostova', 'Civic Transparency Movement', 'South Central District',
  'Focusing on student tuition reform, infrastructure modernization, and AI safety safeguards.',
  'Strengthening South Central communities with subsidized college education and modern public transit infrastructure.',
  '0x72a088dbbeba4ff315eb0768c70ca0c08272f23cf9b8ae9d71c4c9fa300cf9d7',
  '0xfa49102c9a91048bcad81940bcad81940bcad81940bcad81940bcad81940bcad83',
  '[3, 4, 4, 5, 4, 4]'::JSONB, true, 0
),
(
  4, 1,
  'Robert Sterling', 'National Heritage Party', 'South Central District',
  'Dedicated to public safety, small business support, and civic revitalization.',
  'Investing in local South Central police forces, emergency response, and community neighborhood restoration projects.',
  '0x5a189cb4091a481bcad81940bcad81940bcad81940bcad81940bcad81940bcad84',
  '0x1279d8ef924840bcad81940bcad81940bcad81940bcad81940bcad81940bcad84',
  '[2, 2, 3, 4, 2, 1]'::JSONB, true, 0
),
-- East Bay District Candidates
(
  5, 1,
  'Maya Al-Mansoor', 'Green Future Coalition', 'East Bay District',
  'Marine ecology specialist fighting for clean coastal waters and renewable marine energy.',
  'Protecting the East Bay shoreline, subsidizing clean residential solar panels, and halting industrial water runoff.',
  '0x992b88dbbeba4ff315eb0768c70ca0c08272f23cf9b8ae9d71c4c9fa300cf9d8',
  '0x6649102c9a91048bcad81940bcad81940bcad81940bcad81940bcad81940bcad85',
  '[5, 5, 4, 3, 5, 4]'::JSONB, true, 0
),
(
  6, 1,
  'Lucas Wright', 'Enterprise Tech Alliance', 'East Bay District',
  'Accelerating startup development, tech incubators, and STEM scholarships in East Bay.',
  'Making East Bay the premier technology hub through angel investor tax credits and digital infrastructure upgrades.',
  '0x44ab88dbbeba4ff315eb0768c70ca0c08272f23cf9b8ae9d71c4c9fa300cf9d9',
  '0x9949102c9a91048bcad81940bcad81940bcad81940bcad81940bcad81940bcad86',
  '[1, 3, 2, 1, 3, 3]'::JSONB, true, 0
)
ON CONFLICT (id) DO NOTHING;
