import { VoterRecord } from "../types";
import { supabase } from "./supabaseService";

export const INITIAL_PRESEEDED_VOTERS: VoterRecord[] = [
  {
    id: "voter-1",
    voterIdNumber: "VOT-2026-001",
    fullName: "Alice Johnson",
    email: "alice@example.com",
    constituency: "North Metro District",
    hasVoted: false,
    electionId: 1,
  },
  {
    id: "voter-2",
    voterIdNumber: "VOT-2026-002",
    fullName: "David Kumar",
    email: "david@example.com",
    constituency: "North Metro District",
    hasVoted: false,
    electionId: 1,
  },
  {
    id: "voter-3",
    voterIdNumber: "VOT-2026-003",
    fullName: "Sophia Martinez",
    email: "sophia@example.com",
    constituency: "South Central District",
    hasVoted: false,
    electionId: 1,
  },
  {
    id: "voter-4",
    voterIdNumber: "VOT-2026-004",
    fullName: "Michael Chen",
    email: "michael@example.com",
    constituency: "South Central District",
    hasVoted: false,
    electionId: 1,
  },
  {
    id: "voter-5",
    voterIdNumber: "VOT-2026-005",
    fullName: "Emily Watson",
    email: "emily@example.com",
    constituency: "East Bay District",
    hasVoted: false,
    electionId: 1,
  },
  {
    id: "voter-6",
    voterIdNumber: "VOT-2026-006",
    fullName: "James Patel",
    email: "james@example.com",
    constituency: "East Bay District",
    hasVoted: false,
    electionId: 1,
  },
];

const LOCAL_VOTERS_KEY = "votex_registered_voters_db";

export function getRegisteredVoters(): VoterRecord[] {
  try {
    const data = localStorage.getItem(LOCAL_VOTERS_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  localStorage.setItem(LOCAL_VOTERS_KEY, JSON.stringify(INITIAL_PRESEEDED_VOTERS));
  return INITIAL_PRESEEDED_VOTERS;
}

export function saveRegisteredVotersLocally(voters: VoterRecord[]): void {
  try {
    localStorage.setItem(LOCAL_VOTERS_KEY, JSON.stringify(voters));
  } catch (err) {
    console.warn("Failed to save registered voters locally:", err);
  }
}

export async function fetchLiveVoterRegistry(): Promise<VoterRecord[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("voter_registry")
        .select("*")
        .order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        const liveList: VoterRecord[] = data.map((d) => ({
          id: String(d.id),
          voterIdNumber: d.voter_id_number,
          fullName: d.full_name,
          email: d.email,
          constituency: d.constituency || "North Metro District",
          hasVoted: d.has_voted || false,
          electionId: d.election_id || 1,
        }));
        saveRegisteredVotersLocally(liveList);
        return liveList;
      }
    } catch (err) {
      console.warn("Supabase fetch voter registry failed, using local cache:", err);
    }
  }

  return getRegisteredVoters();
}

export async function addNewVoterToRegistry(
  voterIdNumber: string,
  fullName: string,
  email: string,
  constituency: string
): Promise<VoterRecord> {
  const cleanId = voterIdNumber.trim().toUpperCase();
  const cleanName = fullName.trim();
  const cleanEmail = email.trim();
  const cleanConst = constituency.trim() || "North Metro District";

  const newVoter: VoterRecord = {
    id: `voter-${Date.now()}`,
    voterIdNumber: cleanId,
    fullName: cleanName,
    email: cleanEmail,
    constituency: cleanConst,
    hasVoted: false,
    electionId: 1,
  };

  // 1. Insert into Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("voter_registry")
        .insert({
          voter_id_number: cleanId,
          full_name: cleanName,
          email: cleanEmail,
          constituency: cleanConst,
          has_voted: false,
          otp_code: "123",
        })
        .select()
        .single();

      if (!error && data) {
        newVoter.id = String(data.id);
      }
    } catch (err) {
      console.warn("Supabase voter insert error:", err);
    }
  }

  // 2. Save locally
  const current = getRegisteredVoters();
  const filtered = current.filter((v) => v.voterIdNumber.toUpperCase() !== cleanId);
  const updated = [...filtered, newVoter];
  saveRegisteredVotersLocally(updated);

  return newVoter;
}

export async function batchEnrollVotersToRegistry(
  voters: Array<{
    voterIdNumber?: string;
    voter_id_number?: string;
    fullName?: string;
    full_name?: string;
    name?: string;
    email: string;
    constituency?: string;
  }>
): Promise<{ added: number; total: number }> {
  if (voters.length === 0) return { added: 0, total: 0 };

  const cleanVoters = voters.map((v) => {
    const id = (v.voterIdNumber || v.voter_id_number || "").trim().toUpperCase();
    const name = (v.fullName || v.full_name || v.name || "").trim();
    const email = (v.email || "").trim();
    const constituency = (v.constituency || "North Metro District").trim();
    return {
      voter_id_number: id,
      full_name: name,
      email: email,
      constituency: constituency,
      has_voted: false,
      otp_code: "123",
    };
  });

  // 1. Insert into Supabase
  if (supabase) {
    try {
      const { error } = await supabase.from("voter_registry").upsert(cleanVoters, {
        onConflict: "voter_id_number",
        ignoreDuplicates: false,
      });
      if (error) {
        console.warn("Supabase batch voter insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase batch voter insert exception:", err);
    }
  }

  // 2. Save into local storage
  const current = getRegisteredVoters();
  const currentMap = new Map<string, VoterRecord>();
  current.forEach((v) => currentMap.set(v.voterIdNumber.toUpperCase(), v));

  cleanVoters.forEach((cv, idx) => {
    currentMap.set(cv.voter_id_number, {
      id: `voter-csv-${Date.now()}-${idx}`,
      voterIdNumber: cv.voter_id_number,
      fullName: cv.full_name,
      email: cv.email,
      constituency: cv.constituency,
      hasVoted: false,
      electionId: 1,
    });
  });

  const updated = Array.from(currentMap.values());
  saveRegisteredVotersLocally(updated);

  return { added: cleanVoters.length, total: updated.length };
}

export async function findVoterByVoterId(voterIdNumber: string): Promise<VoterRecord | null> {
  return findVoterByIdOrEmail(voterIdNumber);
}

export async function findVoterByIdOrEmail(identifier: string): Promise<VoterRecord | null> {
  const clean = identifier.trim().toLowerCase();
  const isEmail = clean.includes("@");

  // Try Supabase query first
  if (supabase) {
    try {
      let query = supabase.from("voter_registry").select("*");
      if (isEmail) {
        query = query.ilike("email", clean);
      } else {
        query = query.eq("voter_id_number", clean.toUpperCase());
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        return {
          id: String(data.id),
          voterIdNumber: data.voter_id_number,
          fullName: data.full_name,
          email: data.email,
          constituency: data.constituency || "North Metro District",
          hasVoted: data.has_voted || false,
          electionId: data.election_id || 1,
        };
      }
    } catch {
      // fallback to local
    }
  }

  // Local storage fallback
  const allVoters = getRegisteredVoters();
  const voter = allVoters.find(
    (v) =>
      v.voterIdNumber.toLowerCase() === clean ||
      v.email.toLowerCase() === clean
  );
  return voter || null;
}

export async function markVoterAsVoted(voterIdNumber: string): Promise<void> {
  const cleanId = voterIdNumber.trim().toUpperCase();

  // Update Supabase
  if (supabase) {
    try {
      await supabase
        .from("voter_registry")
        .update({ has_voted: true })
        .eq("voter_id_number", cleanId);
    } catch (err) {
      console.warn("Supabase mark voter as voted error:", err);
    }
  }

  // Update Local storage
  const allVoters = getRegisteredVoters();
  const updated = allVoters.map((v) =>
    v.voterIdNumber.toUpperCase() === cleanId ? { ...v, hasVoted: true } : v
  );
  saveRegisteredVotersLocally(updated);
}
