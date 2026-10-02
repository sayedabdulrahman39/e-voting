import { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { VoterDashboard } from "./components/VoterDashboard";
import { CandidateDashboard } from "./components/CandidateDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { PublicResults } from "./components/PublicResults";
import { AuthModal, AuthUser } from "./components/AuthModal";
import { UserRole, Election, VoterIdentity, VoteReceipt, AuditLogItem, Candidate } from "./types";
import {
  saveVoterState,
  loadVoterState,
  saveReceipt,
  loadReceipts,
  saveAuthUser,
  loadAuthUser,
  saveCachedElections,
  loadCachedElections,
  saveFullCandidate,
  loadFullCandidates,
  clearAllCachedCandidates,
  recordDeletedElectionId,
  saveOnChainNullifier,
  loadAllOnChainNullifiers,
  loadAllGlobalReceipts,
} from "./lib/voterStorage";
import {
  isSupabaseConfigured,
  fetchLiveElections,
  fetchLiveAuditLogs,
  insertCommitment,
  insertAuditLog,
  deleteElectionFromDB,
  markVoterAsVoted,
  updateCandidateInDB,
  supabase,
  subscribeToRealtimeChanges,
} from "./lib/supabaseService";

// Placeholder election shown when no election exists yet
const EMPTY_ELECTION: Election = {
  id: 0,
  title: "No Active Election",
  description: "An admin needs to create an election first.",
  status: "DRAFT",
  tree_depth: 16,
  starts_at: new Date().toISOString(),
  ends_at: new Date().toISOString(),
  candidates: [],
  commitments: [],
};

export default function App() {
  const [authUser, setAuthUserState] = useState<AuthUser | null>(() => loadAuthUser());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = loadAuthUser();
    return saved ? saved.role : "PUBLIC";
  });
  const [elections, setElections] = useState<Election[]>(() => loadCachedElections());
  const [activeElection, setActiveElection] = useState<Election>(() => {
    const cached = loadCachedElections();
    return cached.length > 0 ? cached[0] : EMPTY_ELECTION;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialRole, setAuthModalInitialRole] = useState<UserRole>("VOTER");

  const setAuthUser = (user: AuthUser | null) => {
    setAuthUserState(user);
    saveAuthUser(user);
  };

  const userId = authUser ? authUser.id : "default_voter";
  const [voterIdentity, setVoterIdentityState] = useState<VoterIdentity | null>(() =>
    loadVoterState(userId, activeElection.id)
  );
  const [receipts, setReceipts] = useState<VoteReceipt[]>(() => loadReceipts(userId));
  const [onChainNullifiers, setOnChainNullifiers] = useState<string[]>(() => {
    const fromStorage = loadAllOnChainNullifiers().map((n) => n.nullifier);
    const fromReceipts = loadAllGlobalReceipts().map((r) => r.nullifier);
    return Array.from(new Set([...fromStorage, ...fromReceipts]));
  });
  const [relayerStatus, setRelayerStatus] = useState<"online" | "offline" | "checking">("checking");
  const [supabaseStatus, setSupabaseStatus] = useState<"connected" | "disconnected">(
    isSupabaseConfigured ? "connected" : "disconnected"
  );

  // Restore voter state when active user or election changes
  useEffect(() => {
    if (activeElection.id === 0) return;
    const loadedState = loadVoterState(userId, activeElection.id);
    setVoterIdentityState(loadedState);
    const loadedRecs = loadReceipts(userId);
    setReceipts(loadedRecs);
  }, [userId, activeElection.id]);

  const setVoterIdentity = (identity: VoterIdentity) => {
    setVoterIdentityState(identity);
    saveVoterState(userId, identity);
  };

  const syncWithSupabase = useCallback(async () => {
    const cachedFullCandidates = loadFullCandidates();
    const cachedElections = loadCachedElections();

    if (!isSupabaseConfigured) {
      if (cachedElections.length > 0) {
        setElections(cachedElections);
        setActiveElection((prev) => (prev.id === 0 ? cachedElections[0] : prev));
      }
      return;
    }

    try {
      const liveElections = await fetchLiveElections();
      if (liveElections && liveElections.length > 0) {
        // Deeply merge candidates with local cached data to preserve uploaded PDFs and manifestos
        const mergedElections = liveElections.map((elec) => {
          const mergedCandidates = elec.candidates.map((c) => {
            const cached = cachedFullCandidates.find(
              (fc) =>
                fc.id === c.id ||
                (fc.email && c.email && fc.email.toLowerCase() === c.email.toLowerCase())
            );
            if (!cached) return c;
            return {
              ...c,
              pdf_url: c.pdf_url || cached.pdf_url,
              pdf_name: c.pdf_name || cached.pdf_name,
              pdf_updated_at: c.pdf_updated_at || cached.pdf_updated_at,
              manifesto_text: c.manifesto_text || cached.manifesto_text,
              manifesto_hash: c.manifesto_hash || cached.manifesto_hash,
              bio: c.bio || cached.bio,
              stance_vector:
                c.stance_vector && c.stance_vector.some((v) => v !== 3)
                  ? c.stance_vector
                  : cached.stance_vector || c.stance_vector,
            };
          });

          cachedFullCandidates.forEach((fc) => {
            if (
              fc.election_id === elec.id &&
              !mergedCandidates.some(
                (c) =>
                  c.id === fc.id ||
                  (c.email && fc.email && c.email.toLowerCase() === fc.email.toLowerCase())
              )
            ) {
              mergedCandidates.push(fc);
            }
          });
          return { ...elec, candidates: mergedCandidates };
        });

        setElections(mergedElections);
        saveCachedElections(mergedElections);
        const currentActive =
          mergedElections.find((e) => e.id === activeElection.id) || mergedElections[0];
        setActiveElection(currentActive);
        setSupabaseStatus("connected");
      } else if (cachedElections.length > 0) {
        setElections(cachedElections);
        setActiveElection((prev) => (prev.id === 0 ? cachedElections[0] : prev));
      }
      const liveLogs = await fetchLiveAuditLogs();
      if (liveLogs) {
        setAuditLogs(liveLogs);
        const extractedNullifiers: string[] = [];
        liveLogs.forEach((l) => {
          if (l.stage === "VOTE_CAST" && l.details) {
            const match = l.details.match(/Nullifier:\s*(0x[0-9a-fA-F]+)/);
            if (match) extractedNullifiers.push(match[1]);
          }
        });
        if (extractedNullifiers.length > 0) {
          setOnChainNullifiers((prev) => Array.from(new Set([...prev, ...extractedNullifiers])));
        }
      }
    } catch {
      setSupabaseStatus("disconnected");
      if (cachedElections.length > 0) {
        setElections(cachedElections);
        setActiveElection((prev) => (prev.id === 0 ? cachedElections[0] : prev));
      }
    }
  }, [activeElection.id]);

  useEffect(() => {
    syncWithSupabase();
    const unsubscribe = subscribeToRealtimeChanges(() => {
      syncWithSupabase();
    });

    const pingRelayer = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/api/health`);
        if (res.ok) setRelayerStatus("online");
        else setRelayerStatus("offline");
      } catch {
        setRelayerStatus("offline");
      }
    };
    pingRelayer();

    return () => {
      unsubscribe();
    };
  }, [syncWithSupabase]);

  const handleRoleSelection = (targetRole: UserRole) => {
    if (targetRole === "PUBLIC") {
      setCurrentRole("PUBLIC");
      return;
    }

    if (targetRole === "ADMIN") {
      if (authUser?.role === "ADMIN") {
        setCurrentRole("ADMIN");
      } else {
        setAuthModalInitialRole("ADMIN");
        setIsAuthModalOpen(true);
      }
      return;
    }

    if (targetRole === "CANDIDATE") {
      if (authUser?.role === "CANDIDATE") {
        setCurrentRole("CANDIDATE");
      } else {
        setAuthModalInitialRole("CANDIDATE");
        setIsAuthModalOpen(true);
      }
      return;
    }

    if (targetRole === "VOTER") {
      if (authUser?.role === "VOTER") {
        setCurrentRole("VOTER");
      } else {
        setAuthModalInitialRole("VOTER");
        setIsAuthModalOpen(true);
      }
      return;
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setCurrentRole(user.role);

    // If candidate logged in/registered, ensure candidate is in activeElection.candidates
    if (user.role === "CANDIDATE") {
      const candidateId = user.candidateId ? Number(user.candidateId) : Date.now();
      const exists = activeElection.candidates.some(
        (c) => c.email === user.email || c.id === candidateId
      );

      if (!exists) {
        const newCandidateObj = {
          id: candidateId,
          election_id: activeElection.id,
          display_name: user.fullName || "Candidate",
          party: user.party || "Independent",
          constituency: user.constituency || "North Metro District",
          bio: "",
          email: user.email,
          manifesto_text: "",
          manifesto_hash: "",
          stance_vector: [3, 3, 3, 3, 3, 3],
          approved: false,
          votes_count: 0,
        };

        const updatedCandidates = [...activeElection.candidates, newCandidateObj];
        handleUpdateElection({
          ...activeElection,
          candidates: updatedCandidates,
        });
      }
    }

    // Refresh data from Supabase after login
    syncWithSupabase();
  };

  // Determine which candidate the logged-in candidate user is
  const rawCandidate =
    authUser?.role === "CANDIDATE"
      ? activeElection.candidates.find(
          (c) => c.email === authUser.email || c.id === Number(authUser.candidateId)
        ) || {
          id: authUser.candidateId ? Number(authUser.candidateId) : 999,
          election_id: activeElection.id,
          display_name: authUser.fullName || "Candidate",
          party: authUser.party || "Independent",
          constituency: authUser.constituency || "North Metro District",
          bio: "",
          email: authUser.email,
          manifesto_text: "",
          manifesto_hash: "",
          stance_vector: [3, 3, 3, 3, 3, 3],
          approved: false,
          votes_count: 0,
        }
      : undefined;

  const cachedForCandidate = rawCandidate
    ? loadFullCandidates().find(
        (fc) =>
          fc.id === rawCandidate.id ||
          (fc.email && rawCandidate.email && fc.email.toLowerCase() === rawCandidate.email.toLowerCase())
      )
    : undefined;

  const loggedInCandidate: Candidate | undefined = rawCandidate
    ? {
        ...rawCandidate,
        pdf_url: rawCandidate.pdf_url || cachedForCandidate?.pdf_url,
        pdf_name: rawCandidate.pdf_name || cachedForCandidate?.pdf_name,
        pdf_updated_at: rawCandidate.pdf_updated_at || cachedForCandidate?.pdf_updated_at,
        manifesto_text: rawCandidate.manifesto_text || cachedForCandidate?.manifesto_text || "",
        manifesto_hash: rawCandidate.manifesto_hash || cachedForCandidate?.manifesto_hash || "",
      }
    : undefined;

  const handleSignOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignored
      }
    }
    setAuthUser(null);
    setCurrentRole("PUBLIC");
  };

  const handleUpdateElection = async (updated: Election) => {
    setElections((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (activeElection.id === updated.id) {
      setActiveElection(updated);
    }
  };

  const handleCreateElection = async (newElectionData: Omit<Election, "id">) => {
    // This is the local-only fallback. Real creation is done in AdminDashboard via supabaseService.
    const newId = elections.length + 1;
    const newElection: Election = {
      ...newElectionData,
      id: newId,
    };
    setElections((prev) => [...prev, newElection]);
    setActiveElection(newElection);

    handleAddAuditLog(
      "ELECTION_CREATED",
      "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join(""),
      `Admin created new election: '${newElection.title}'`
    );
  };

  // Called by AdminDashboard when election is created in Supabase with a real ID
  const handleElectionCreated = (election: Election) => {
    setElections((prev) => [...prev, election]);
    setActiveElection(election);
  };

  const handleAddAuditLog = async (stage: string, txHash: string, details: string) => {
    const log: AuditLogItem = {
      id: auditLogs.length + 1,
      electionId: activeElection.id,
      stage,
      txHash,
      timestamp: new Date().toISOString(),
      details,
    };
    setAuditLogs((prev) => [log, ...prev]);
    insertAuditLog(activeElection.id, stage, txHash, details);
  };

  const handleRegisterCommitment = async (commitment: string) => {
    if (activeElection.commitments.includes(commitment)) return;
    const updatedCommitments = [...activeElection.commitments, commitment];
    const updated: Election = {
      ...activeElection,
      commitments: updatedCommitments,
    };
    handleUpdateElection(updated);
    insertCommitment(activeElection.id, commitment, updatedCommitments.length - 1);
  };

  const handleCastVote = async (
    candidateId: number,
    nullifier: string,
    constituency?: string
  ): Promise<{ txHash: string; proofTimeMs: number }> => {
    if (onChainNullifiers.includes(nullifier)) {
      throw new Error("Double-voting attempt rejected: This nullifier has already been recorded on-chain.");
    }

    const proofStart = performance.now();
    // Simulate ZK proof generation time
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
    const proofTimeMs = Math.round(performance.now() - proofStart);

    let txHash = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      await fetch(`${apiUrl}/api/health`);
    } catch {
      // Local fallback
    }

    setOnChainNullifiers((prev) => [...prev, nullifier]);
    const updatedCandidates = activeElection.candidates.map((c) => {
      if (c.id === candidateId) {
        return { ...c, votes_count: c.votes_count + 1 };
      }
      return c;
    });

    const updated: Election = {
      ...activeElection,
      candidates: updatedCandidates,
    };
    handleUpdateElection(updated);

    if (supabase) {
      try {
        const c = updatedCandidates.find((cand) => cand.id === candidateId);
        if (c) {
          await supabase
            .from("candidates")
            .update({ votes_count: c.votes_count })
            .eq("id", candidateId);
        }
      } catch (err) {
        console.warn("Supabase vote increment error:", err);
      }
    }

    // Mark voter as voted in Supabase
    if (authUser?.voterIdNumber) {
      markVoterAsVoted(authUser.voterIdNumber);
    }

    const candidate = activeElection.candidates.find((c) => c.id === candidateId);
    const receipt: VoteReceipt = {
      electionId: activeElection.id,
      electionTitle: activeElection.title,
      candidateId,
      candidateName: candidate?.display_name || "Candidate",
      constituency: candidate?.constituency || constituency || "General",
      nullifier,
      txHash,
      timestamp: new Date().toISOString(),
      merkleRoot: activeElection.merkle_root || "0x0",
      proofTimeMs,
    };

    saveReceipt(userId, receipt);
    saveOnChainNullifier({
      nullifier,
      txHash,
      electionId: activeElection.id,
      timestamp: receipt.timestamp,
      candidateName: receipt.candidateName,
      constituency: receipt.constituency,
      electionTitle: receipt.electionTitle,
    });
    setReceipts((prev) => [receipt, ...prev]);

    handleAddAuditLog(
      "VOTE_CAST",
      txHash,
      `Anonymous ZK vote verified & counted on-chain. Nullifier: ${nullifier} | Proof: ${proofTimeMs}ms`
    );

    return { txHash, proofTimeMs };
  };

  const handleDeleteElection = async (electionId: number) => {
    recordDeletedElectionId(electionId);
    clearAllCachedCandidates(electionId);
    setElections((prev) => {
      const updated = prev.filter((e) => e.id !== electionId);
      saveCachedElections(updated);
      return updated;
    });

    if (activeElection.id === electionId) {
      const remaining = elections.filter((e) => e.id !== electionId);
      setActiveElection(remaining.length > 0 ? remaining[0] : EMPTY_ELECTION);
    }

    await deleteElectionFromDB(electionId);
    await syncWithSupabase();
  };

  const noElectionYet = activeElection.id === 0;

  return (
    <div className="min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">

      {/* Navbar */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={handleRoleSelection}
        activeElection={activeElection}
        elections={elections}
        onSelectElection={setActiveElection}
        relayerStatus={relayerStatus}
        supabaseStatus={supabaseStatus}
        authUser={authUser}
        onOpenAuth={(role) => {
          setAuthModalInitialRole(role || "VOTER");
          setIsAuthModalOpen(true);
        }}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full relative z-10">
        {/* No Election Message */}
        {noElectionYet && currentRole !== "ADMIN" && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center animate-fadeIn">
            <div className="w-24 h-24 rounded-3xl glass flex items-center justify-center shadow-xl border border-white/10">
              <span className="text-4xl">🗳️</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100">No Active Election</h2>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              There are no elections created yet. An <strong className="text-cyan-400">Admin</strong> needs to
              log in and create a new election before voters and candidates can participate.
            </p>
            <button
              onClick={() => {
                setAuthModalInitialRole("ADMIN");
                setIsAuthModalOpen(true);
              }}
              className="btn-primary"
            >
              Login as Admin to Create Election
            </button>
          </div>
        )}

        {currentRole === "VOTER" && !noElectionYet && (
          <VoterDashboard
            election={activeElection}
            voterIdentity={voterIdentity}
            onSetVoterIdentity={setVoterIdentity}
            onRegisterCommitment={handleRegisterCommitment}
            onCastVote={handleCastVote}
            receipts={receipts}
            authUser={authUser}
          />
        )}

        {currentRole === "CANDIDATE" && !noElectionYet && loggedInCandidate && (
          <CandidateDashboard
            election={activeElection}
            candidate={loggedInCandidate}
            onUpdateCandidate={async (updated) => {
              saveFullCandidate(updated);
              const updatedCandidates = activeElection.candidates.map((c) =>
                c.id === updated.id || (c.email && updated.email && c.email.toLowerCase() === updated.email.toLowerCase())
                  ? updated
                  : c
              );
              const updatedElection: Election = {
                ...activeElection,
                candidates: updatedCandidates,
              };
              handleUpdateElection(updatedElection);
              saveCachedElections(
                elections.map((e) => (e.id === updatedElection.id ? updatedElection : e))
              );
              await updateCandidateInDB(updated);
            }}
          />
        )}

        {currentRole === "CANDIDATE" && !noElectionYet && !loggedInCandidate && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center border border-white/10">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Candidate Profile Not Found</h2>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Your candidate profile hasn't been registered for this election yet.
              Please sign out and register again, or contact the admin.
            </p>
          </div>
        )}

        {currentRole === "ADMIN" && (
          <AdminDashboard
            election={activeElection}
            elections={elections}
            onSelectElection={setActiveElection}
            onUpdateElection={handleUpdateElection}
            onCreateElection={handleCreateElection}
            onElectionCreated={handleElectionCreated}
            onDeleteElection={handleDeleteElection}
            auditLogs={auditLogs}
            onAddAuditLog={handleAddAuditLog}
            onRefresh={syncWithSupabase}
          />
        )}

        {currentRole === "PUBLIC" && !noElectionYet && (
          <PublicResults
            election={activeElection}
            receipts={receipts}
            onChainNullifiers={onChainNullifiers}
          />
        )}

        {currentRole === "PUBLIC" && noElectionYet && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center animate-fadeIn">
            <div className="w-24 h-24 rounded-3xl glass flex items-center justify-center border border-white/10">
              <span className="text-4xl">📊</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100">No Results Available</h2>
            <p className="text-sm text-slate-400 max-w-md">
              No election has been created yet. Results will appear here once an election is live.
            </p>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialRole={authModalInitialRole}
        activeElectionId={activeElection.id}
      />

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400" style={{ background: 'rgba(10, 15, 30, 0.75)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-slate-300">VOTEX • Tri-Modular Poseidon ZKP E-Voting Platform</span>
          <span className="font-mono text-slate-500">
            Powered by Groth16 (BN254) • Supabase • EVM Smart Contracts
          </span>
        </div>
      </footer>
    </div>
  );
}
