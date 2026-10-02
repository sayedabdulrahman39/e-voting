# Tri-Modular E-Voting Architecture (Poseidon ZKP + Verified Content)

> **Final-Year Engineering Project Prototype**  
> High-integrity digital voting powered by **Circom + Groth16 Zero-Knowledge Proofs**, **EVM Smart Contracts**, and **Supabase**.

---

## 🏛️ System Architecture

* **Database / Backend**: Supabase (PostgreSQL with Row-Level Security and Auth via Email OTP)
* **Zero-Knowledge Proofs**: Circom 2.1.x, Poseidon Hashing, Groth16 zk-SNARKs on BN254 curve
* **Smart Contracts**: Solidity ^0.8.20, Hardhat local node / Sepolia Testnet
* **Gasless Relayer**: Express + TypeScript API
* **Frontend**: React + Vite + Tailwind CSS + Lucide Icons

---

## 🚀 Quickstart Guide

### 1. Prerequisites
* Node.js v18+ (tested on Node v20/v24)
* npm v9+

### 2. Installation
Install all workspace dependencies from the monorepo root:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Running the Development Services

* **Frontend UI**:
  ```bash
  npm run dev
  # Open http://localhost:5173
  ```

* **Relayer API Server**:
  ```bash
  npm run dev:server
  # Running on http://localhost:3001
  ```

* **Smart Contract Test Suite**:
  ```bash
  npm run test:contracts
  ```

---

## 📂 Repository Structure
```
e-voting/
├── circuits/        # Circom circuit definitions and Powers-of-Tau setup
├── contracts/       # Solidity smart contracts, Hardhat tests, deploy scripts
├── server/          # Express API & Gasless Relayer
├── frontend/        # React + Vite frontend application
├── supabase/        # SQL migrations, RLS policies, and seed scripts
├── scripts/         # Automated E2E testing and benchmarking scripts
├── docs/            # Architecture diagrams, threat model, benchmark results
├── PRD.md           # Product Requirements Document
├── TRD.md           # Technical Specifications Document
├── phases.md        # Step-by-step roadmap & acceptance criteria
└── memory.md        # Persistent project memory & decision log
```
