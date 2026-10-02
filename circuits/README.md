# Zero-Knowledge Circuit (`circuits/`)

This directory houses the Circom 2.1.x circuit definitions, Powers of Tau ceremony setup scripts, and circuit tests.

## Circuit Specification
* **File:** `vote.circom`
* **Proof System:** Groth16 (BN254 curve)
* **Merkle Tree Depth:** 16 (supports up to $2^{16} = 65,536$ voters)
* **In-circuit Hash Function:** Poseidon
* **Private Signals:** `secret`, `pathElements[16]`, `pathIndices[16]`
* **Public Signals:** `[merkleRoot, nullifier, electionId, recipient, candidateId]`
