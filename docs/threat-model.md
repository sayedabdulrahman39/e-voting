# Threat Model & Security Analysis

| Threat | Attack Vector | Mitigation in Architecture | Residual Risk |
|---|---|---|---|
| **Double Voting** | Malicious voter attempts to cast multiple ballots | Poseidon Nullifier tracked in `Voting.sol` | None (circuit guarantees deterministic nullifier per secret & electionId) |
| **Ineligible Voter** | Unapproved user casts vote | Merkle membership verified against locked on-chain root | Admin could register unauthorized commitments prior to root lock |
| **Proof Front-running** | Attacker intercepts proof and broadcasts it with their own wallet | Relayer address bound as public `recipient` in ZK circuit | None |
| **Identity Correlation** | Observer links voter identity to their vote | Public commitments have no `user_id`; proofs generated client-side; gasless relayer | Relayer sees IP and submission timestamp |
| **Manifesto Tampering** | Candidate or admin alters promises post-approval | `keccak256` hash recorded on-chain in `ContentAttestation.sol` | Proves integrity (unchanged), does not prove truthfulness |
