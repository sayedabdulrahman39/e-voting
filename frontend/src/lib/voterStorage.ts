import { VoterIdentity, VoteReceipt } from "../types";

const STORAGE_PREFIX = "votex_voter_state_";
const RECEIPTS_PREFIX = "votex_receipts_";

export function getVoterStorageKey(userId: string, electionId: number): string {
  return `${STORAGE_PREFIX}${userId}_${electionId}`;
}

export function saveVoterState(userId: string, state: VoterIdentity): void {
  try {
    const key = getVoterStorageKey(userId, state.electionId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to save voter state to localStorage:", err);
  }
}

export function loadVoterState(userId: string, electionId: number): VoterIdentity | null {
  try {
    const key = getVoterStorageKey(userId, electionId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as VoterIdentity;
  } catch {
    return null;
  }
}

export function saveReceipt(userId: string, receipt: VoteReceipt): void {
  try {
    const key = `${RECEIPTS_PREFIX}${userId}`;
    const existing = loadReceipts(userId);
    const filtered = existing.filter((r) => !(r.electionId === receipt.electionId && r.nullifier === receipt.nullifier));
    const updated = [receipt, ...filtered];
    localStorage.setItem(key, JSON.stringify(updated));

    // Also persist into global nullifiers registry
    saveOnChainNullifier({
      nullifier: receipt.nullifier,
      txHash: receipt.txHash,
      electionId: receipt.electionId,
      timestamp: receipt.timestamp,
      candidateName: receipt.candidateName,
      constituency: receipt.constituency,
      electionTitle: receipt.electionTitle,
    });
  } catch (err) {
    console.warn("Failed to save receipt to localStorage:", err);
  }
}

export function loadReceipts(userId: string): VoteReceipt[] {
  try {
    const key = `${RECEIPTS_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as VoteReceipt[];
  } catch {
    return [];
  }
}

export function loadAllGlobalReceipts(): VoteReceipt[] {
  try {
    const allReceipts: VoteReceipt[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(RECEIPTS_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: VoteReceipt[] = JSON.parse(raw);
            list.forEach((r) => {
              const uKey = `${r.electionId}_${r.nullifier}`;
              if (!seen.has(uKey)) {
                seen.add(uKey);
                allReceipts.push(r);
              }
            });
          }
        } catch {}
      }
    }
    return allReceipts;
  } catch {
    return [];
  }
}

const ALL_NULLIFIERS_KEY = "votex_all_recorded_nullifiers";

export interface RecordedNullifier {
  nullifier: string;
  txHash: string;
  electionId: number;
  timestamp: string;
  candidateName?: string;
  constituency?: string;
  electionTitle?: string;
}

export function saveOnChainNullifier(item: RecordedNullifier): void {
  try {
    const existing = loadAllOnChainNullifiers();
    const filtered = existing.filter((n) => n.nullifier.toLowerCase() !== item.nullifier.toLowerCase());
    const updated = [item, ...filtered];
    localStorage.setItem(ALL_NULLIFIERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save nullifier to localStorage:", err);
  }
}

export function loadAllOnChainNullifiers(): RecordedNullifier[] {
  try {
    const data = localStorage.getItem(ALL_NULLIFIERS_KEY);
    if (!data) return [];
    return JSON.parse(data) as RecordedNullifier[];
  } catch {
    return [];
  }
}

export function clearVoterStorage(userId: string, electionId?: number): void {
  try {
    if (electionId) {
      localStorage.removeItem(getVoterStorageKey(userId, electionId));
    } else {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(`${STORAGE_PREFIX}${userId}`)) {
          localStorage.removeItem(k);
        }
      });
    }
  } catch (err) {
    console.warn("Failed to clear voter storage:", err);
  }
}

// Candidate Local Cache Persistence
const CANDIDATES_CACHE_KEY = "votex_registered_candidates";

export interface CachedCandidate {
  email: string;
  password?: string;
  fullName: string;
  party?: string;
  constituency?: string;
  candidateId?: number;
}

export function saveRegisteredCandidate(candidate: CachedCandidate): void {
  try {
    const existing = loadRegisteredCandidates();
    const filtered = existing.filter((c) => c.email.toLowerCase() !== candidate.email.toLowerCase());
    const updated = [candidate, ...filtered];
    localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save registered candidate:", err);
  }
}

export function loadRegisteredCandidates(): CachedCandidate[] {
  try {
    const data = localStorage.getItem(CANDIDATES_CACHE_KEY);
    if (!data) return [];
    return JSON.parse(data) as CachedCandidate[];
  } catch {
    return [];
  }
}

export function findRegisteredCandidate(email: string, password?: string): CachedCandidate | null {
  const list = loadRegisteredCandidates();
  const found = list.find((c) => c.email.toLowerCase() === email.toLowerCase());
  if (!found) return null;
  if (password && found.password && found.password !== password) return null;
  return found;
}

// Full Candidate Persistence
const FULL_CANDIDATES_KEY = "votex_full_candidates_list";
const ELECTIONS_CACHE_KEY = "votex_cached_elections";
const AUTH_USER_CACHE_KEY = "votex_active_auth_user";

import { Candidate, Election } from "../types";
import { AuthUser } from "../components/AuthModal";

export function saveAuthUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_CACHE_KEY);
    }
  } catch (err) {
    console.warn("Failed to save auth user:", err);
  }
}

export function loadAuthUser(): AuthUser | null {
  try {
    const data = localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!data) return null;
    return JSON.parse(data) as AuthUser;
  } catch {
    return null;
  }
}

export function saveCachedElections(elections: Election[]): void {
  try {
    localStorage.setItem(ELECTIONS_CACHE_KEY, JSON.stringify(elections));
  } catch (err) {
    console.warn("Failed to save cached elections:", err);
  }
}

export function loadCachedElections(): Election[] {
  try {
    const data = localStorage.getItem(ELECTIONS_CACHE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Election[];
  } catch {
    return [];
  }
}

export function saveFullCandidate(candidate: Candidate): void {
  try {
    const list = loadFullCandidates();
    const filtered = list.filter((c) => c.id !== candidate.id && c.email !== candidate.email);
    const updated = [candidate, ...filtered];
    localStorage.setItem(FULL_CANDIDATES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save full candidate:", err);
  }
}

export function loadFullCandidates(): Candidate[] {
  try {
    const data = localStorage.getItem(FULL_CANDIDATES_KEY);
    if (!data) return [];
    return JSON.parse(data) as Candidate[];
  } catch {
    return [];
  }
}

const DELETED_ELECTIONS_KEY = "votex_deleted_election_ids";
const DELETED_CANDIDATES_KEY = "votex_deleted_candidate_ids";

export function recordDeletedElectionId(id: number): void {
  try {
    const list = loadDeletedElectionIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DELETED_ELECTIONS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn("Failed to record deleted election:", err);
  }
}

export function loadDeletedElectionIds(): number[] {
  try {
    const data = localStorage.getItem(DELETED_ELECTIONS_KEY);
    return data ? (JSON.parse(data) as number[]) : [];
  } catch {
    return [];
  }
}

export function isElectionDeleted(id: number): boolean {
  return loadDeletedElectionIds().includes(id);
}

export function recordDeletedCandidateId(id: number, email?: string): void {
  try {
    const list = loadDeletedCandidateIds();
    const key = `${id}:${(email || "").toLowerCase()}`;
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem(DELETED_CANDIDATES_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn("Failed to record deleted candidate:", err);
  }
}

export function loadDeletedCandidateIds(): string[] {
  try {
    const data = localStorage.getItem(DELETED_CANDIDATES_KEY);
    return data ? (JSON.parse(data) as string[]) : [];
  } catch {
    return [];
  }
}

export function isCandidateDeleted(id: number, email?: string): boolean {
  try {
    const list = loadDeletedCandidateIds();
    return list.some((item) => {
      const parts = item.split(":");
      const itemId = parseInt(parts[0], 10);
      const itemEmail = parts[1];
      if (itemId === id && id > 0) return true;
      if (email && itemEmail && itemEmail.toLowerCase() === email.toLowerCase()) return true;
      return false;
    });
  } catch {
    return false;
  }
}

export function deleteCandidateFromStorage(candidateId: number, email?: string): void {
  try {
    recordDeletedCandidateId(candidateId, email);

    // 1. Remove from full candidates cache
    const full = loadFullCandidates().filter(
      (c) => c.id !== candidateId && (!email || c.email?.toLowerCase() !== email.toLowerCase())
    );
    localStorage.setItem(FULL_CANDIDATES_KEY, JSON.stringify(full));

    // 2. Remove from registered candidates cache
    const reg = loadRegisteredCandidates().filter(
      (c) => c.candidateId !== candidateId && (!email || c.email.toLowerCase() !== email.toLowerCase())
    );
    localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify(reg));

    // 3. Remove candidate from cached elections
    const elections = loadCachedElections().map((el) => ({
      ...el,
      candidates: el.candidates.filter(
        (c) => c.id !== candidateId && (!email || c.email?.toLowerCase() !== email.toLowerCase())
      ),
    }));
    saveCachedElections(elections);
  } catch (err) {
    console.warn("Failed to delete candidate from storage:", err);
  }
}

export function updateCachedCandidateApproval(candidateId: number, approved: boolean, attestTx?: string): void {
  try {
    const full = loadFullCandidates().map((c) => {
      if (c.id === candidateId) {
        return { ...c, approved, ...(attestTx ? { attest_tx: attestTx } : {}) };
      }
      return c;
    });
    localStorage.setItem(FULL_CANDIDATES_KEY, JSON.stringify(full));

    const elections = loadCachedElections().map((el) => ({
      ...el,
      candidates: el.candidates.map((c) => {
        if (c.id === candidateId) {
          return { ...c, approved, ...(attestTx ? { attest_tx: attestTx } : {}) };
        }
        return c;
      }),
    }));
    saveCachedElections(elections);
  } catch (err) {
    console.warn("Failed to update candidate approval in storage:", err);
  }
}

export function clearAllCachedCandidates(electionId?: number): void {
  try {
    if (electionId) {
      const full = loadFullCandidates();
      full.forEach((c) => {
        if (c.election_id === electionId) {
          recordDeletedCandidateId(c.id, c.email);
        }
      });
      const remaining = full.filter((c) => c.election_id !== electionId);
      localStorage.setItem(FULL_CANDIDATES_KEY, JSON.stringify(remaining));

      const elections = loadCachedElections().map((el) => {
        if (el.id === electionId) return { ...el, candidates: [] };
        return el;
      });
      saveCachedElections(elections);
    } else {
      const full = loadFullCandidates();
      full.forEach((c) => recordDeletedCandidateId(c.id, c.email));
      localStorage.removeItem(FULL_CANDIDATES_KEY);
      localStorage.removeItem(CANDIDATES_CACHE_KEY);
      const elections = loadCachedElections().map((el) => ({ ...el, candidates: [] }));
      saveCachedElections(elections);
    }
  } catch (err) {
    console.warn("Failed to clear candidate cache:", err);
  }
}
