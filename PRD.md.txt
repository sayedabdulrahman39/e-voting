# PRD: Tri-Modular E-Voting Architecture with Poseidon ZKP and Candidate Verified Content

**Type:** Final-year engineering project (prototype)
**Version:** 1.0

---

## 1. Problem Statement
Moving elections online is not just a website problem. A digital voting system must:
ensure only eligible people vote, keep voter identity and vote choice private, make election
records tamper-evident, and give voters reliable information about candidates. Existing
blockchain voting systems record votes immutably but often leak identity, rely on heavy
encryption, or ignore the trustworthiness of candidate information.

## 2. Objectives (from the project report)
1. Design a tri-modular voting system with Admin, Voter, and Candidate roles.
2. Implement Poseidon hashing for efficient cryptographic processing.
3. Integrate Zero-Knowledge Proofs for secure and private voter verification.
4. Develop a candidate content attestation mechanism that makes post-approval tampering detectable.
5. Ensure data integrity and prevent unauthorized modification of the voting process.
6. Enhance transparency and trust in digital voting systems.

> Note on wording: attestation provides **integrity** (content unchanged since approval),
> not **truthfulness**. The report must state this precisely.

## 3. Users and Roles

| Role | Description | Key capabilities |
|---|---|---|
| **Admin** | Election authority | Create/open/close elections; approve candidates and voters; publish and lock Merkle root; view audit log |
| **Candidate** | Contesting person | Register; edit profile and manifesto; submit for approval; see attestation status |
| **Voter** | Eligible citizen | Register; create secret + commitment; view candidates; take matching survey; cast anonymous vote; verify receipt; see results |
| **Public (anonymous)** | Anyone | Read tally, events, manifesto hashes; verify manifestos |

## 4. Scope

### In scope (MVP)
- Role-based auth (Supabase Auth, email OTP) and role-gated dashboards
- Election lifecycle: draft -> registration -> root locked -> open -> closed
- ZK voting: Merkle membership + nullifier + public candidate choice, Groth16 proof generated in-browser
- On-chain verification, double-vote prevention, public tally
- Relayer-submitted transactions (voters need no wallet)
- Candidate manifesto attestation (keccak256 on-chain) + "unchanged" badge
- Advisory stance matching via cosine similarity
- Vote receipt (tx hash + nullifier) and verification page
- Audit log of stage transitions
- Benchmarks and threat model documentation

### Out of scope (future work)
- Biometric authentication, mobile app, national-ID integration
- Production-grade multi-party trusted setup, coercion-resistance / receipt-freeness
- Large-scale (>65k voters) performance, L2 deployment, formal verification
- Hidden-vote commit-reveal tally (optional stretch goal)

## 5. Functional Requirements

### Authentication and roles
- FR-1: Users register with email; email OTP verification is required.
- FR-2: Each user has exactly one role: ADMIN, CANDIDATE, or VOTER. Admin accounts are seeded, never self-registered.
- FR-3: All data access is enforced by Supabase RLS; the UI also hides unauthorized routes.

### Admin
- FR-4: Create an election (title, description, dates) and list candidates.
- FR-5: Approve/reject candidates and mark voters eligible.
- FR-6: Publish the Merkle root of voter commitments on-chain, then lock it.
- FR-7: Open and close the election on-chain.
- FR-8: View the audit log of stage transitions.

### Candidate
- FR-9: Create/edit a profile, manifesto text, and a stance vector (6 policy topics).
- FR-10: On admin approval, the manifesto hash is attested on-chain; later edits invalidate approval until re-attested.

### Voter
- FR-11: Generate a random secret **in the browser**, derive `commitment = Poseidon(secret)`, and send only the commitment.
- FR-12: Be forced to download an encrypted/plain backup of the secret before registration completes.
- FR-13: Cast one vote: browser builds the Merkle path from the public commitment list, generates the Groth16 proof, and sends it to the relayer.
- FR-14: Receive a receipt (tx hash, nullifier) and later verify it appears on-chain.
- FR-15: Take a stance survey and see candidates ranked by similarity (advisory).

### Public verification
- FR-16: Anyone can read tallies, `VoteCast` events, the locked root, and manifesto hashes.
- FR-17: Candidate page recomputes keccak256 of displayed manifesto and compares with the on-chain hash.

## 6. Non-Functional Requirements
| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Privacy | No server/DB stores vote choice linked to identity; secret never leaves browser |
| NFR-2 | Integrity | Double voting and out-of-registry voting impossible on-chain |
| NFR-3 | Performance | Proof generation < 3 s in browser at depth 16 (measure and report) |
| NFR-4 | Availability of results | Tally readable without trusting the backend |
| NFR-5 | Security hygiene | No secrets in repo; keys server-side only; rate limiting on relayer |
| NFR-6 | Usability | Voter flow completable in under 2 minutes after registration |
| NFR-7 | Testability | 15+ contract tests, circuit tests, 1 E2E script |

## 7. Success Metrics (for the report)
- Contract test pass rate 100%; includes all negative cases
- Measured: proof generation time vs depth (8/12/16/20), constraint count Poseidon vs SHA-256, `castVote` gas, end-to-end latency on Sepolia
- Demo: complete election with >= 5 voters, 2 candidates, one rejected double-vote attempt

## 8. Assumptions and Trust Model
- The Admin is trusted to approve only eligible voters, but is **publicly auditable** (commitment list is public; root is locked on-chain).
- The server/relayer is trusted for availability, not for vote secrecy. It sees IP and timing of vote submissions (documented limitation).
- Trusted setup is a multi-contribution Powers of Tau; acceptable for a prototype, not production.

## 9. Risks
| Risk | Mitigation |
|---|---|
| Circom/snarkjs learning curve | Phase 2 is time-boxed; start from circomlib templates; test with `fullprove` first |
| Lost voter secret | Mandatory backup step; document as limitation |
| Admin adds fake voters | Public commitment list + lock before opening; auditing step documented |
| Testnet faucet/network issues | Hardhat local fallback; Polygon Amoy as backup |
| Timing correlation at relayer | Documented; optional random delay/batching as stretch |