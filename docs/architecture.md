# System Architecture

## Tri-Modular Design
1. **Database & Identity Layer (Supabase)**: Auth with OTP, profile management, eligibility gating, and audit logging.
2. **Zero-Knowledge Layer (Circom + Groth16)**: Privacy-preserving voter verification via Merkle tree inclusion and Poseidon nullifiers.
3. **Blockchain Layer (EVM / Solidity)**: Immutable record of locked Merkle root, manifesto content attestation, and public vote tallying.

```mermaid
flowchart TD
    Voter["Voter (Browser)"]
    Admin["Admin (Dashboard)"]
    Candidate["Candidate (Dashboard)"]
    Supabase[("Supabase (PostgreSQL)")]
    Relayer["Express Relayer API"]
    Blockchain["EVM Blockchain (Contracts)"]

    Voter -->|Auth / OTP| Supabase
    Voter -->|Generate Commitment| Supabase
    Voter -->|ZK Proof of Vote| Relayer

    Admin -->|Approve & Lock Root| Supabase
    Admin -->|Set Merkle Root| Blockchain

    Candidate -->|Submit Manifesto| Supabase
    Admin -->|Attest Keccak256 Hash| Blockchain

    Relayer -->|castVote(Proof)| Blockchain
    Blockchain -->|Emit VoteCast & Tally| Voter
```
