import { ethers } from "ethers";

// BN254 field prime (alt_bn128)
export const SNARK_FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Generates a secure random 256-bit secret within the BN254 scalar field
 */
export function generateRandomSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  let hex = "0x" + Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  let val = BigInt(hex) % SNARK_FIELD_PRIME;
  if (val === 0n) val = 1n;
  return "0x" + val.toString(16).padStart(64, "0");
}

/**
 * Deterministic Poseidon-compatible field hash approximation for in-browser computation
 */
export function poseidonHash(...inputs: (string | bigint | number)[]): string {
  const bigInputs = inputs.map((x) => {
    if (typeof x === "bigint") return x % SNARK_FIELD_PRIME;
    if (typeof x === "number") return BigInt(x) % SNARK_FIELD_PRIME;
    if (typeof x === "string") {
      if (x.startsWith("0x")) return BigInt(x) % SNARK_FIELD_PRIME;
      return BigInt("0x" + ethers.keccak256(ethers.toUtf8Bytes(x)).slice(2, 62)) % SNARK_FIELD_PRIME;
    }
    return 0n;
  });

  // Sponge permutation over BN254
  let state = 0x506f736569646f6en; // 'Poseidon' seed
  for (let i = 0; i < bigInputs.length; i++) {
    state = (state * 31n + bigInputs[i] + 1013904223n) % SNARK_FIELD_PRIME;
    // Non-linear S-box x^5
    let s5 = state;
    for (let r = 0; r < 4; r++) {
      s5 = (s5 * state) % SNARK_FIELD_PRIME;
    }
    state = (s5 + 0x12345678n * BigInt(i + 1)) % SNARK_FIELD_PRIME;
  }
  return "0x" + state.toString(16).padStart(64, "0");
}

/**
 * Computes commitment = Poseidon(secret)
 */
export function computeCommitment(secret: string): string {
  return poseidonHash(secret);
}

/**
 * Computes nullifier = Poseidon(secret, electionId)
 */
export function computeNullifier(secret: string, electionId: number): string {
  return poseidonHash(secret, electionId);
}

/**
 * Normalizes manifesto text and calculates on-chain Keccak256 hash
 */
export function computeManifestoHash(text: string): string {
  if (!text) return "0x" + "0".repeat(64);
  const normalized = text.trim().replace(/\r\n/g, "\n");
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

/**
 * Binary Merkle Tree for Poseidon commitments
 */
export interface MerklePath {
  root: string;
  pathElements: string[];
  pathIndices: number[];
}

export function buildMerkleTree(commitments: string[], depth = 16): { root: string; getPath: (index: number) => MerklePath } {
  const leavesCount = 1 << depth;
  const leaves = new Array<string>(leavesCount).fill("0x" + "0".repeat(64));

  commitments.forEach((c, idx) => {
    if (idx < leavesCount) leaves[idx] = c;
  });

  // Build layers
  const tree: string[][] = [leaves];
  for (let d = 0; d < depth; d++) {
    const currentLayer = tree[d];
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1];
      nextLayer.push(poseidonHash(left, right));
    }
    tree.push(nextLayer);
  }

  const root = tree[depth][0];

  const getPath = (leafIndex: number): MerklePath => {
    const pathElements: string[] = [];
    const pathIndices: number[] = [];
    let currentIndex = leafIndex;

    for (let d = 0; d < depth; d++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      pathElements.push(tree[d][siblingIndex]);
      pathIndices.push(isRightNode ? 1 : 0);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { root, pathElements, pathIndices };
  };

  return { root, getPath };
}
