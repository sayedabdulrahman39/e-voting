# phases.md: Build Plan

Rules: finish one phase, show evidence (command output), update `memory.md`, wait for "approved".
Estimated total: **10-12 weeks**. Tick boxes as you go.

---

## Phase 0: Setup and Skeleton (Week 1)
**Goal:** repo, tooling, and accounts ready.
- [ ] npm workspaces monorepo with folders per TRD section 2
- [ ] Install: Node 18+, Rust, circom 2.1.x, snarkjs, Hardhat, Vite
- [ ] Supabase project created; `.env.example` files written
- [ ] ESLint, Prettier, tsconfig strict, conventional commits, `.gitignore` (ignore `.env`, `build/`, `*.zkey` private ones if needed)
- [ ] README with run instructions

**Acceptance:** `npx hardhat test` runs (empty ok); `circom --version`; `npm run dev` shows a blank React page; `.env` is git-ignored.

---

## Phase 1: Database, Auth, Roles (Weeks 1-2)
**Goal:** Supabase schema + RLS + role-gated UI shell.
- [ ] Migrations for all tables in TRD section 5; `is_admin()` helper
- [ ] RLS policies; seed script creating one ADMIN
- [ ] Supabase Auth with email OTP; auto-create `profiles` row on signup (trigger)
- [ ] Frontend login/signup + role-based route guards + three empty dashboards
- [ ] RLS tests (SQL or script): voter cannot read others' profiles, cannot change own role, candidate cannot approve self

**Acceptance:** log in as each role and see only their dashboard; RLS test script passes; role escalation attempt fails.

---

## Phase 2: ZK Circuit (Weeks 3-4) *(hardest, time-box it)*
**Goal:** working Groth16 proof of membership + nullifier.
- [ ] `vote.circom` per TRD section 3 (Merkle verifier, nullifier, public signals)
- [ ] JS helper to build Poseidon Merkle tree (same logic will be reused in frontend/server)
- [ ] Circuit tests: valid input passes; wrong path fails; wrong secret fails; non-binary index fails
- [ ] `build.sh` full pipeline; generated `Groth16Verifier.sol`
- [ ] `snarkjs groth16 fullprove` + `verify` returns **OK!**
- [ ] Record public signal order and constraint count in `memory.md`

**Acceptance:** `snarkjs groth16 verify` prints OK; all negative tests fail as expected; Table 1 equivalent (compile/setup/verify output) saved to `docs/results.md`.

---

## Phase 3: Smart Contracts (Weeks 5-6)
**Goal:** contracts + 15 tests green on Hardhat.
- [ ] `VoterRegistry`, `ContentAttestation`, `Voting` per TRD section 4
- [ ] Hardhat tests generate **real proofs** from Phase 2 artifacts (no mocked verifier)
- [ ] Gas report enabled
- [ ] Deploy script writing addresses to `deployments/<network>.json`
- [ ] Deploy on Hardhat local and Sepolia (when ready)

**Acceptance:** all 15 listed tests pass; `deployments/*.json` exists; gas numbers captured.

---

## Phase 4: Server and Relayer (Week 7)
**Goal:** privileged operations and anonymous vote relay.
- [ ] Express app, JWT verification, role middleware, zod validation, rate limiting
- [ ] Endpoints per TRD section 6
- [ ] Server-side tree builder (must match client-side output: add a cross-check test)
- [ ] `/api/vote` verifies proof locally before spending gas; logs contain no IP/user/nullifier together
- [ ] Integration test against Hardhat node

**Acceptance:** scripted flow: create election -> approve candidate -> submit commitments -> publish-root -> open -> POST `/api/vote` succeeds; second POST with same proof is rejected.

---

## Phase 5: Frontend (Weeks 8-9)
**Goal:** all three dashboards + voting UX.
- [ ] Admin: elections CRUD, approvals, publish/lock root, open/close, audit log
- [ ] Candidate: profile, manifesto, stance vector, attestation status
- [ ] Voter: secret generation + **mandatory backup**, registration, candidate list, survey + ranking, vote page with in-browser proof + progress, receipt
- [ ] Public: results page (reads chain directly), verify page (nullifier lookup, manifesto hash recheck badge)
- [ ] Timing metrics panel (tree build, proof, confirmation)

**Acceptance:** complete a manual demo election with 5 voters in the browser; metrics panel shows real numbers.

---

## Phase 6: Cosine Matching and Polish (Week 9-10)
- [ ] Mean-centred cosine similarity with unit tests (zero vector, identical, opposite)
- [ ] Clear "advisory only" label in UI
- [ ] Error states: lost secret, already voted, election closed, proof failure
- [ ] Accessibility and responsive pass

**Acceptance:** unit tests pass; UI handles each error state with a clear message.

---

## Phase 7: Testing, Benchmarks, Docs (Weeks 10-12)
- [ ] `scripts/e2e.ts`: full election, including double-vote attempt and wrong-sender attempt
- [ ] Benchmarks (TRD section 9) -> `docs/results.md` with tables and charts
- [ ] Sepolia deployment + demo election with transaction links
- [ ] `docs/architecture.md` (diagram), `docs/threat-model.md`
- [ ] Objective-to-evidence mapping table
- [ ] Viva prep notes (see below)

**Acceptance:** e2e passes on Hardhat and Sepolia; every number in the report comes from a script output.

---

## Stretch Goals (only if time remains)
- [ ] Commit-reveal hidden tally (vote commitment + reveal phase)
- [ ] Random delay/batching in relayer to reduce timing correlation
- [ ] Polygon Amoy deployment and cost comparison
- [ ] Encrypted secret backup (passphrase)

---

## Objective -> Evidence map
| Objective | Evidence |
|---|---|
| 1. Tri-modular design | RLS + role middleware + three dashboards + layer diagram |
| 2. Poseidon hashing | Constraint-count comparison vs SHA-256 |
| 3. ZKP voter verification | Groth16 proof, on-chain verifier, test results |
| 4. Candidate content attestation | `ContentAttestation` tests + verify badge |
| 5. Data integrity | Locked root, nullifier set, audit log, negative tests |
| 6. Transparency | Public tally, events, receipt verification |

## Viva prep: be ready to answer
1. Why Poseidon over SHA-256? Why Groth16 over PLONK?
2. Risks of Groth16 trusted setup, and what your ceremony does and doesn't fix?
3. How is double voting prevented without identifying the voter?
4. Can the admin cheat? (Fake voters before lock; mitigated by public commitment list.)
5. Why a relayer? What does it still see?
6. Why is the Merkle path computed in the browser?
7. What does keccak256 attestation prove, and what does it not prove?
8. Why is cosine similarity outside the trust boundary?