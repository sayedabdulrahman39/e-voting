-- ==============================================================================
-- Supabase Seed Data for Development & Testing
-- ==============================================================================

-- 1. Insert Initial Election
INSERT INTO elections (id, title, description, status, merkle_root, tree_depth, starts_at, ends_at)
OVERRIDING SYSTEM VALUE
VALUES (
  1,
  '2026 National Digital Democracy Referendum',
  'National election on digital governance, healthcare modernization, and clean energy transition.',
  'OPEN',
  '0x098418a0bc9812490bca81940bca81940bca81940bca81940bca81940bca8194',
  16,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '6 days'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Candidates
INSERT INTO candidates (id, election_id, display_name, party, bio, manifesto_text, manifesto_hash, attest_tx, stance_vector, approved, votes_count)
OVERRIDING SYSTEM VALUE
VALUES
(
  1,
  1,
  'Dr. Sarah Lin',
  'Digital Progress Alliance',
  'Champion of citizen privacy, open-source governance, and clean energy technologies.',
  'We champion open-source governance, universal public healthcare access, and rapid 100% renewable energy transition. Citizen data sovereignty must be guaranteed by decentralized cryptographic protocols.',
  '0x04463dc68b0bfa3f80cffb90875e4e89bbdf6708b77fe7e61a86ffef553e1cb1',
  '0x3a79d8ef924840bcad81940bcad81940bcad81940bcad81940bcad81940bcad81',
  '[4, 5, 5, 2, 5, 5]'::JSONB,
  true,
  14
),
(
  2,
  1,
  'Marcus Vance',
  'Freedom & Innovation Coalition',
  'Advocating free-market tech innovation, deregulation, and low capital taxation.',
  'Unleashing economic growth through competitive low corporate taxes, decentralized AI acceleration, and market-driven private healthcare options with minimal state interference.',
  '0x0c99f928e4693a1f94c5e3f191b79f2eaae700305cb2243d463d1ceee3663677',
  '0x892a40bfd1928014bcad81940bcad81940bcad81940bcad81940bcad81940bcad82',
  '[1, 2, 1, 1, 1, 2]'::JSONB,
  true,
  9
),
(
  3,
  1,
  'Elena Rostova',
  'Civic Transparency Movement',
  'Focusing on student debt reform, public infrastructure, and ethical AI safeguards.',
  'Strengthening community governance, subsidized university tuition, strict algorithmic AI safety regulations, and long-term public infrastructure modernization for future generations.',
  '0x72a088dbbeba4ff315eb0768c70ca0c08272f23cf9b8ae9d71c4c9fa300cf9d7',
  '0xfa49102c9a91048bcad81940bcad81940bcad81940bcad81940bcad81940bcad83',
  '[3, 4, 4, 5, 4, 4]'::JSONB,
  true,
  11
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Initial Voter Commitments
INSERT INTO voter_commitments (election_id, commitment, leaf_index)
VALUES
  (1, '0x184a8f90248c89a0bcf4291048bca91048bca91048bca91048bca91048bca910', 0),
  (1, '0x291048bca91048bca91048bca91048bca91048bca91048bca91048bca91048bc', 1),
  (1, '0x3ab081940bcad81940bcad81940bcad81940bcad81940bcad81940bcad81940b', 2)
ON CONFLICT (election_id, commitment) DO NOTHING;

-- 4. Insert Initial Audit Log Entries
INSERT INTO audit_log (election_id, stage, tx_hash, details)
VALUES
  (1, 'ELECTION_CREATED', '0x892bf409acb18490a0bc9812490bca81940bca81940bca81940bca81940bca81', 'Created Election: 2026 National Digital Democracy Referendum'),
  (1, 'CANDIDATES_ATTESTED', '0x7890bcad81940bcad81940bcad81940bcad81940bcad81940bcad81940bcad82', 'Attested candidate manifesto hashes on ContentAttestation.sol'),
  (1, 'MERKLE_ROOT_LOCKED', '0x12345bcad81940bcad81940bcad81940bcad81940bcad81940bcad81940bcad83', 'Locked Poseidon Merkle root (depth 16) on VoterRegistry.sol'),
  (1, 'ELECTION_OPENED', '0xabcdefcad81940bcad81940bcad81940bcad81940bcad81940bcad81940bcad84', 'Election opened for anonymous ZK ballot casting');
